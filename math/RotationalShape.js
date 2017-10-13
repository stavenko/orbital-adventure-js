import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
import {Curve} from './Curve.js';
import * as Triangle from './TriangleBezier.js';
import * as Quad from './QuadBezier.js';
import * as Path from './Path.js';
import {fact} from './Math.js';
import {patchToWeights} from './Utils.js';


export function shapeContols(shape, controlType) {
  switch (controlType) {
    case 'edit-slices': return getSliceControls(shape);
    case 'edit-radials': return getRadialControls(shape);
    default: return [];
  }
}

export function getCurves(shape) {
  return [
    ...getSideCurves(shape), ...getSliceCurves(shape)
  ];
}


function getSideCurves(shape) {
  const geometries = [];
  const props = shape._initialProps;
  const radial = shape.radialAmount;
  const sliceAmount = shape.sliceAmount;
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);

  for (let i = 0; i < radial; ++i) {
    const path = [];
    const controlPoints = [];
    if (hasBottomCone) {
      path.push({command: 'moveTo', ...shape.pointIndex['0']});
      path.push({command: 'curveTo', 
        cp1: shape.pointIndex[`0+,${i}`],
        cp2: shape.pointIndex[`1-,${i}`],
        end: shape.pointIndex[`1,${i}`],
      });
    } else {
      path.push({command: 'moveTo', ...shape.pointIndex[`0,${i}`]});
    }
    for (let j = 0; j < sliceAmount - coneSegments; ++j) {
      const b = hasBottomCone ? 1 : 0;
      let endIndex = `${j + b + 1},${i}`;
      if (j == (sliceAmount - coneSegments - 1)) {
        if (!hasTopCone) {
          continue;
        }
        endIndex = `${j + b + 1}`;
      }
      path.push({command: 'curveTo', 
        cp1: shape.pointIndex[`${j + b}+,${i}`],
        cp2: shape.pointIndex[`${j + b + 1}-,${i}`],
        end: shape.pointIndex[endIndex]
      });
    }
    geometries.push(...Path.getGeometry(path));
  }
  return geometries;
}

export function recalculateInterpolatedWeights(shape) {
  for (let j = 0; j < shape.radialAmount; ++j) {
    const from = shape._initialProps.bottomCone ? 1 : 0;
    let to = shape._initialProps.topCone ? (shape.sliceAmount - 1) : shape.sliceAmount;
    to -= 1;
    if (shape._initialProps.bottomCone) {
      recalculate111(shape, j, 1);
    }
    if (shape._initialProps.topCone) {
      recalculate111(shape, j, -1);
    }
    for (let i = from; i < to; ++i) {
      recalculateQuadFour(shape, i, j);
    }
  }
}

function recalculateQuadFour(shape, L, R) {
  const {pointIndex} = shape;
  const NL = L + 1;
  const NR = (R + 1) % shape.radialAmount;

  calculate(L, R, 1, 1);
  calculate(L, NR, 1, -1);
  calculate(NL, R, -1, 1);
  calculate(NL, NR, -1, -1);
  

  function calculate(l, r, ll, rr) {
    const b = base(l, r);
    const o = b().clone();
    const left = b(0, rr).clone().sub(o);
    const right = b(ll, 0).clone().sub(o);

    b(ll, rr).copy(left.add(right).add(o));
  }

  function base(l, r) {
    return (ll, rr) => {
      return shape.pointIndex[`${l}${S(ll)},${r}${S(rr)}`];
    };
  }

  function S(t) {
    if (t == 0) {
      return '';
    }
    if (t < 0) {
      return '-';
    }
    if (t > 0) {
      return '+';
    }
    return '';

  }
}

function recalculate111(shape, r, way) {
  const {pointIndex} = shape;
  const nr = (r + 1) % shape.radialAmount;
  let tip = 0;
  if (way < 0) {
    tip = shape.sliceAmount - 1;
  }
  const p300 = pointIndex[`${tip}`];
  const p030 = pointIndex[`${tip + way},${r}`];
  const p003 = pointIndex[`${tip + way},${nr}`];
  const p210 = pointIndex[`${tip}${S(way)},${r}`] ;
  const p201 = pointIndex[`${tip}${S(way)},${nr}`] ;
  const p120 = pointIndex[`${tip + way}${S(-way)},${r}`] ;
  const p102 = pointIndex[`${tip + way}${S(-way)},${nr}`] ;
  const p021 = pointIndex[`${tip + way},${r}+`] ;
  const p012 = pointIndex[`${tip + way},${nr}-`] ;


  const [_p210, _p201] = [p210, p201].map(p => p.clone().sub(p300));
  const [_p120, _p021] = [p120, p021].map(p => p.clone().sub(p030));
  const [_p102, _p012] = [p102, p012].map(p => p.clone().sub(p003));
  const p210_p201 = p300.clone().add(_p210.add(_p201));
  const p120_p021 = p030.clone().add(_p120.add(_p021));
  const p102_p012 = p003.clone().add(_p102.add(_p012));

  const p111 = [p210_p201, p120_p021, p102_p012]
    .map(p => p.multiplyScalar(1 / 3.0))
    .reduce((p, p1) => {
      p.add(p1);return p;
    }, new Vector3);
  pointIndex[`${tip}:111,${r}`] = p111;
  function S(t) {
    return t > 0 ? '+' : '-';
  }
}


function getSliceCurves(shape) {
  const props = shape._initialProps;
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);
  const radialAmount = shape.radialAmount;
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const geometries = [];
  for (let i = 0; i < shape.sliceAmount - coneSegments; ++i) {
    const bottomConeSliceNum = (hasBottomCone ? 1 : 0);
    const sliceIx = i + bottomConeSliceNum;
    const points = shape.pointIndex;
    const path = [
      {command: 'moveTo', ...points[`${sliceIx},0`]}
    ];
    for (let j = 0; j < radialAmount; ++j) {
      const nj = (j + 1) % radialAmount;
      path.push({
        command: 'curveTo', 
        cp1: points[`${sliceIx},${j}+`], 
        cp2: points[`${sliceIx},${nj}-`], 
        end: points[`${sliceIx},${nj}`]
      });
    }
    geometries.push(...Path.getGeometry(path));
  }
  return geometries;
}

export function getRadialControls(shape) {
  const props = shape._initialProps;
  const {sliceAmount, radialAmount, pointIndex} = shape;
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const controls = [];

  for (let j = 0; j < radialAmount; ++j) {
    if (hasBottomCone) {
      createPlaneRotationControl(j, 1);
    } else {
      createPlaneRotationControl(j, 0);
    }

    for (let i = 0; i < sliceAmount; ++i) {
      if (hasTopCone && i == (sliceAmount - 1)) {
        const ix = `${i}-,${j}`; 
        controls.push({
          point: shape.pointIndex[ix],
          ix,
          constrain: {
            type: 'plane',
            value: radialPlane(j)
          }
        });
        continue;
      }
      if (hasBottomCone && i == 0) {
        const ix = `0+,${j}`;
        controls.push({
          point: shape.pointIndex[ix],
          ix,
          constrain: {
            type: 'plane',
            value: radialPlane(j)
          }
        });
        continue;
      }
      const S = a => a > 0 ? '+' : '-';
      const ix = `${i},${j}`;
      const ixs = s => `${i}${S(s)},${j}`;

      controls.push({
        point: pointIndex[ix].clone(),
        ix,
        constrain: {
          type: 'vector',
          value: {
            plane: {
              origin: new Vector3,
              normal: shape.pointIndex[`${j},r`],
            },
            vector: new Vector3().crossVectors(
              radialPlane(j).normal, 
              new Vector3(0, 1, 0))
          }
        }

      });
      if (i < sliceAmount - 1) {
        controls.push({
          point: pointIndex[ixs(+1)].clone(),
          ix: ixs(+1),
          constrain: {
            type: 'plane',
            value: radialPlane(j)
          }

        });
      }
      if (i > 0) {
        controls.push({
          point: pointIndex[ixs(-1)].clone(),
          ix: ixs(-1),
          constrain: {
            type: 'plane',
            value: radialPlane(j)
          }
        });
      }

    }
  }

  return controls;
  function radialPlane(i) {
    return { 
      origin: new Vector3,
      normal: shape.pointIndex[`${i},r`]
    };

  }
  function createPlaneRotationControl(j, i) {
    const pt = shape.pointIndex[`${i},${j}`].clone();
    const planeNormal = shape.pointIndex[`${j},r`].clone();
    const slicesPlaneO = shape.pointIndex[`${i}`];
    const d = pt.clone().sub(slicesPlaneO);
    const distance = d.length();
    const dir = d.normalize();
    const extend = distance * 1.3;
    const newPoint = dir.multiplyScalar(extend);
    controls.push({
      point: newPoint,
      ix: `${j},r`,
      constrain: {
        type: 'rotation',
        pivot: slicesPlaneO.clone(),
        axis: new Vector3().crossVectors(dir, planeNormal).normalize()
      }
    });

  }
}

export function getSliceControls(shape) {
  const {sliceAmount, radialAmount, pointIndex} = shape;
  const controls = [];
  for (let i = sliceAmount - 1; i >= 0; --i) {
    const plane = {
      origin: shape.pointIndex[`${i}`],
      normal: new Vector3(0, 1, 0)
    };

    controls.push({
      point: pointIndex[`${i}`],
      ix: `${i}`,
      constrain: {
        type: 'vector', 
        value: { 
          vector: plane.normal.clone(), 
          plane: {
            origin: new Vector3,
            normal: new Vector3(0, 0, 1)
          }
        }
      }
    });
    for (let j = 0; j < radialAmount; ++j) {
      const isTopTip = i == sliceAmount - 1 && shape._initialProps.topCone;
      const isBottomTip = i == 0 && shape._initialProps.bottomCone;
      const radialPlaneNormal = shape.pointIndex[`${j},r`];
      if (isTopTip || isBottomTip) {
        if (isTopTip) {
          controls.push({
            ix: `${i}-,${j}`,
            point: pt(`${i}-,${j}`),
            constrain: {
              type: 'plane',
              value: {
                origin: new Vector3, 
                normal: radialPlaneNormal.clone()
              },
            }
          });
        } else {
          controls.push({
            ix: `${i}+,${j}`,
            point: pt(`${i}+,${j}`),
            constrain: {
              type: 'plane',
              value: {
                origin: new Vector3, 
                normal: radialPlaneNormal.clone()
              },
            }
          });
        }
      } else {
        controls.push({
          ix: `${i},${j}`, 
          point: pt(`${i},${j}`),
          constrain: {
            type: 'vector', 
            value: {
              vector: new Vector3()
                .crossVectors(plane.normal, radialPlaneNormal),
              plane: plane
            }}});
        controls.push({
          ix: `${i},${j}-`, 
          point: pt(`${i},${j}-`),
          constrain: { type: 'plane', value: plane }});
        controls.push({
          ix: `${i},${j}+`, 
          point: pt(`${i},${j}+`),
          constrain: { type: 'plane', value: plane }
        });
      }


    }
  }
  return controls;

  function pt(ix) {
    if (pointIndex[ix]) {
      return pointIndex[ix];
    }
    throw `no such point in pointIndex '${ix}'`;
  }

}

export function moveControl(shape, control, from, to) {
}

export function createRotationalShape(props) {
  const newPart = {_initialProps: props};
  createMainAxis(newPart, props);
  createInitialSlices(newPart, props);
  createPatches(newPart, props);
  newPart.calculated = true;
  return newPart;
}

export function recalculateSlices(part, props) {
  return part;
}



export function getRotationalGeometry(part) {
  const geometries = [];
  const patchIndex = part.patchIndex;
  return Object.keys(patchIndex)
    .map(key => getGeometryAttributes(part, patchIndex[key]))
    .filter(x => x);
}

function lengthPointsShift(part, fromL) {
  const props = part._initialProps;
  const pointIndex = part.pointIndex;
  const radialAmount = part.radialAmount;
  const sliceAmount = part.sliceAmount;
  const patchAmount = radialAmount - 1;
  const hasTopCone = props.topCone;
  const hasBottomCone = props.bottomCone;
  for (let j = part.sliceAmount - 1; j > fromL; --j) {
    const pointsToMove = [];
    pointsToMove.push([`${j}`, `${j + 1}`]); // crossPlanes centers
    if (j == part.sliceAmount - 1 && hasTopCone) {
      for (let i = 0; i < radialAmount; ++i) {
        pointsToMove.push([`${j}-,${i}`, `${j + 1}-,${i}`]);
        pointsToMove.push([`${j}:111,${i}`, `${j + 1}:111,${i}`]);
        pointsToMove.push([`${j - 1}+,${i}`, `${j}+,${i}`]);
      }
    } else {
      for (let i = 0; i < radialAmount; ++i) {
        pointsToMove.push([`${j},${i}`, `${j + 1},${i}`]);
        pointsToMove.push([`${j},${i}-`, `${j + 1},${i}-`]);
        pointsToMove.push([`${j},${i}+`, `${j + 1},${i}+`]);

        pointsToMove.push([`${j}-,${i}`, `${j + 1}-,${i}`]);
        pointsToMove.push([`${j}-,${i}-`, `${j + 1}-,${i}-`]);
        pointsToMove.push([`${j}-,${i}+`, `${j + 1}-,${i}+`]);

        pointsToMove.push([`${j - 1}+,${i}`, `${j}+,${i}`]);
        pointsToMove.push([`${j - 1}+,${i}-`, `${j}+,${i}-`]);
        pointsToMove.push([`${j - 1}+,${i}+`, `${j}+,${i}+`]);

      }
    }
    pointsToMove.forEach(([from, to]) => {
      const p = pointIndex[from];
      delete pointIndex[from];
      pointIndex[to] = p;
    });
  }

}

function radialPointsShift(part, fromR) {
  const props = part._initialProps;
  const pointIndex = part.pointIndex;
  const radialAmount = part.radialAmount;
  const sliceAmount = part.sliceAmount;
  const patchAmount = sliceAmount - 1;
  const hasTopCone = props.topCone;
  const hasBottomCone = props.bottomCone;
  const pointsToMove = [];
  for (let j = part.radialAmount - 1; j >= fromR; --j) {
    pointsToMove.push([`${j},r`, `${j + 1},r`]);
  }

  pointsToMove.forEach(([from, to]) => {
    const p = pointIndex[from];
    delete pointIndex[from];
    pointIndex[to] = p;
  });


  for (let i = 0; i < patchAmount; ++i) {
    for (let j = part.radialAmount - 1; j >= fromR; --j) {
      const pointsToMove = [];
      if ((hasBottomCone && i == 0) || (hasTopCone && i == patchAmount - 1)) {
        const way = i == 0 ? 1 : -1;
        const ix = i == 0 ? 0 : patchAmount;
        pointsToMove.push([`${ix}${S(way)},${j}`, `${ix}${S(way)},${j + 1}`]);
        pointsToMove.push([`${ix}:111,${j}`, `${ix}:111,${j + 1}`]);
        pointsToMove.push([`${ix + way}${S(-way)},${j}`, `${ix + way}${S(-way)},${j + 1}`]);
        if (i != 0) {
          pointsToMove.push([`${i},${j}`, `${i},${j + 1}`]);
          pointsToMove.push([`${i},${j}+`, `${i},${j + 1}+`]);
          pointsToMove.push([`${i},${j}-`, `${i},${j + 1}-`]);
        }
      } else {
        pointsToMove.push([`${i},${j}`, `${i},${j + 1}`]);
        pointsToMove.push([`${i},${j}-`, `${i},${j + 1}-`]);
        pointsToMove.push([`${i},${j}+`, `${i},${j + 1}+`]);

        pointsToMove.push([`${i}+,${j}`, `${i}+,${j + 1}`]);
        pointsToMove.push([`${i}+,${j}-`, `${i}+,${j + 1}-`]);
        pointsToMove.push([`${i}+,${j}+`, `${i}+,${j + 1}+`]);

        pointsToMove.push([`${i + 1}-,${j}`, `${i + 1}-,${j + 1}`]);
        pointsToMove.push([`${i + 1}-,${j}-`, `${i + 1}-,${j + 1}-`]);
        pointsToMove.push([`${i + 1}-,${j}+`, `${i + 1}-,${j + 1}+`]);
      }

      if (i == patchAmount - 1 && !hasTopCone) {
        pointsToMove.push([`${i + 1},${j}`, `${i + 1},${j + 1}`]);
        pointsToMove.push([`${i + 1},${j}+`, `${i + 1},${j + 1}+`]);
        pointsToMove.push([`${i + 1},${j}-`, `${i + 1},${j + 1}-`]);
      }
      pointsToMove.forEach(([from, to]) => {
        const p = pointIndex[from];
        delete pointIndex[from];
        pointIndex[to] = p;
      });
    }
  }
  function S(a) {
    return a > 0 ? '+' : '-';
  }
}

export function splitPartAtS(part, S) {
  let division;
  const lengthPatches = part.sliceAmount - 1;
  const {bottomCone, topCone} = part._initialProps;
  let newSlicePlane;
  for (let i = 0; i < lengthPatches; ++i) {
    const fromS = part.lengthDivision[i];
    const toS = part.lengthDivision[i + 1];
    if (S > fromS && S < toS) {
      division = i + 1;
      const ds = toS - fromS;
      const s = (S - fromS) / ds;

      if ((i == 0 && bottomCone) || ((i == (lengthPatches - 1)) && topCone)) {
        console.log('Cannot split cones today');
        return part;
      }
      const patchSubstitution = [];
      for (let j = 0; j < part.radialAmount; ++j) {
        const fromR = j;
        const toR = (fromR + 1 ) % part.radialAmount;
        const key = `${i},${j}`;
        const patch = part.patchIndex[key];
        if (patch.length == 10) {
          throw 'Cannot split triangle patches';
        }

        const [q1, q2] = Quad.splitS(part.pointIndex, patch, s);
        patchSubstitution.push([part, fromR, toR, i, i + 1, q1, q2 ]);
      }

      const prevPlaneO = part.pointIndex[`${i}`];
      const nextPlaneO = part.pointIndex[`${i + 1}`];

      lengthPointsShift(part, i);
      patchSubstitution.forEach(pp => {
        insertQuadWeightsVertically(...pp);
      });
      part.pointIndex[`${i + 1}`] = new Vector3().lerpVectors(prevPlaneO, nextPlaneO, s);
      break;
    }
  }

  part.lengthDivision = [...part.lengthDivision.slice(0, division), S, 
    ...part.lengthDivision.slice(division)];
  //part.crossSlicePlanes= [...part.crossSlicePlanes.slice(0, division), newSlicePlane, 
  //...part.crossSlicePlanes.slice(division)];
  part.sliceAmount += 1;

  recreatePatchesFromPoints(part);

  return part;
}


export function splitPartAtT(part, t) {
  let division;
  let newSlicePlane;
  for (let i = 0; i < part.radialAmount; ++i) {
    const t0 = part.radialDivision[i];
    let t1 = part.radialDivision[(i + 1)];
    if (i + 1 == part.radialAmount) {
      t1 = 1;
    }
    if (t > t0 && t < t1) {
      division = i + 1;
      const ds = t1 - t0;
      let s = (t - t0) / ds;
      s = 1 - s;
      const ni = (i + 1) % part.radialAmount;
    
      const patchSubstitution = [];
      for (let j = 0; j < part.sliceAmount - 1; ++j) {
        const key = `${j},${i}`;
        const patch = part.patchIndex[key];

        if (patch.length > 10) {
          const [q1, q2] = Quad.splitT(part.pointIndex, patch, 1 - s);
          patchSubstitution.push([part, i, i + 1, j, j + 1, q1, q2 ]);
        } else {
          const [tt1, t2, t3] = Triangle.splitPatchWithU0(part.pointIndex, patch, s);
          const l = j == 0 ? 0 : part.sliceAmount - 1;
          patchSubstitution.push([part, i, i + 1, l, t2, tt1, 'triangle']);
        }
      }

      const prevPlaneN = part.pointIndex[`${i},r`];
      const nextPlaneN = part.pointIndex[`${i + 1},r`];

      radialPointsShift(part, i + 1);
      patchSubstitution.forEach(pp => {
        if (pp[pp.length - 1] == 'triangle') {
          insertTriangleWeights(...pp);
        } else {
          insertQuadWeights(...pp);
        }
      });

      const newNormal = new Vector3().lerpVectors(nextPlaneN, prevPlaneN, s);
      part.pointIndex[`${i + 1},r`] = newNormal;
      break;
    }
  }

  part.radialDivision = [...part.radialDivision.slice(0, division), t, 
    ...part.radialDivision.slice(division)];

  part.radialAmount += 1;

  recreatePatchesFromPoints(part);
  return part;

}

function insertQuadWeightsVertically(part, fromR, toR, fromL, toL, q1, q2) {
  const {pointIndex} = part;
  const nla = part.sliceAmount;
  const nl = (toL + 1) % (nla);
  const pl = (toL - 1 + nla) % (nla);


  const newMap = {
    [`${fromL},${fromR}`]: q1['00'],
    [`${fromL}+,${fromR}`]: q1['10'],
    [`${toL}-,${fromR}`]: q1['20'],
    [`${toL},${fromR}`]: q1['30'],

    [`${toL}+,${fromR}`]: q2['10'],
    [`${nl}-,${fromR}`]: q2['20'],
    [`${nl},${fromR}`]: q2['30'],

    [`${fromL},${fromR}+`]: q1['01'],
    [`${fromL}+,${fromR}+`]: q1['11'],
    [`${toL}-,${fromR}+`]: q1['21'],
    [`${toL},${fromR}+`]: q1['31'],

    [`${toL}+,${fromR}+`]: q2['11'],
    [`${nl}-,${fromR}+`]: q2['21'],
    [`${nl},${fromR}+`]: q2['31'],

    [`${fromL},${toR}-`]: q1['02'],
    [`${fromL}+,${toR}-`]: q1['12'],
    [`${toL}-,${toR}-`]: q1['22'],
    [`${toL},${toR}-`]: q1['32'],

    [`${toL}+,${toR}-`]: q2['12'],
    [`${nl}-,${toR}-`]: q2['22'],
    [`${nl},${toR}-`]: q2['32'],

  };
  for (const k in newMap) {
    if (pointIndex[k]) {
      if ( pointIndex[k].x != newMap[k].x || 
          pointIndex[k].y != newMap[k].y || 
          pointIndex[k].z != newMap[k].z ) {
      }
    }
    pointIndex[k] = newMap[k].clone();
  }

}

function insertQuadWeights(part, fromR, toR, fromL, toL, q1, q2) {
  const {pointIndex} = part;
  const nra = part.radialAmount + 1;
  const nr = (toR + 1) % (nra);
  const pr = (toR - 1 + nra) % (nra);

  const newMap = {
    [`${fromL},${fromR}+`]: q1['01'],
    [`${fromL}+,${fromR}+`]: q1['11'],
    [`${toL}-,${fromR}+`]: q1['21'].clone(),
    [`${toL},${fromR}+`]: q1['31'],

    [`${fromL},${toR}-`]: q1['02'],
    [`${fromL}+,${toR}-`]: q1['12'],
    [`${toL}-,${toR}-`]: q1['22'],
    [`${toL},${toR}-`]: q1['32'],
    
    [`${fromL},${toR}`]: q1['03'],
    [`${fromL}+,${toR}`]: q1['13'],
    [`${toL}-,${toR}`]: q1['23'],
    [`${toL},${toR}`]: q1['33'],

    [`${fromL},${toR}+`]: q2['01'],
    [`${fromL}+,${toR}+`]: q2['11'],
    [`${toL}-,${toR}+`]: q2['21'],
    [`${toL},${toR}+`]: q2['31'],

    [`${fromL},${nr}-`]: q2['02'],
    [`${fromL}+,${nr}-`]: q2['12'],
    [`${toL}-,${nr}-`]: q2['22'],
    [`${toL},${nr}-`]: q2['32'],
  };
  for (const k in newMap) {
    if (pointIndex[k]) {
      if ( pointIndex[k].x != newMap[k].x || 
          pointIndex[k].y != newMap[k].y || 
          pointIndex[k].z != newMap[k].z ) {
        console.info('Diff point', k, pointIndex[k].clone(), newMap[k].clone());
      }
    }
    pointIndex[k] = newMap[k].clone();
  }
}

function insertTriangleWeights(part, fromR, toR, L, t1, t2) {
  const {pointIndex} = part;
  const way = L == 0 ? 1 : -1;
  const fromL = L;
  const toL = fromL + way;
  const S = a => a < 0 ? '-' : '+';

  const nra = part.radialAmount + 1;
  const nr = (toR + 1) % (nra);
  const pr = (toR - 1 + nra) % (nra);
  const newMap = {
    [`${fromL}${S(way)},${toR}`]: t2['210'],
    [`${toL}${S(-way)},${toR}`]: t2['120'],
    [`${toL},${toR}`]: t2['030'],

    [`${fromL}:111,${fromR}`]: t1['111'],
    [`${fromL}:111,${toR}`]: t2['111'],

    [`${toL},${toR}-`]: t1['012'],
    [`${toL},${toR}+`]: t2['021'],

    [`${toL},${pr}+`]: t1['021'],
    [`${toL},${nr}-`]: t2['012'],
  };
  
  for (const k in newMap) {
    pointIndex[k] = newMap[k].clone();
    if (pointIndex[k] && fromL == 0) {
      // there shouldn't be any point for first triangle.
    }
  }
}

export function getLineAtT(part, t) {
  const lines = [];
  //t = 1-t;
  for (let i = 0; i < part.radialAmount; ++i) {

    const t0 = part.radialDivision[i];
    let t1 = part.radialDivision[(i + 1)];
    if (i + 1 == part.radialAmount) {
      t1 = 1;
    }
    if (t > t0 && t < t1) {
      const ds = t1 - t0;
      let s = (t - t0) / ds;
      s = 1 - s;
    
      for (let j = 0; j < part.sliceAmount - 1; ++j) {
        const key = `${j},${i}`;
        const patch = part.patchIndex[key];
        if (patch == null) {
          console.warn('patch', key, 'is null');
          continue;
        }

        if (patch.length > 10) {
          lines.push(Quad.getGeometryLineAtT(patchToWeights(part, patch), s, 10));
        } else {
          lines.push(Triangle.getGeometryLineAtT(patchToWeights(part, patch), s, 10));
        }
      }
    }

  }
  return lines;
}

export function getLineAtS(part, s) {
  // need to find all circle patches at height s;
  const lines = [];
  for (let i = 0; i < part.sliceAmount - 1; ++i) {
    //let slice = part.lengthSlices[i];
    //let nextSlice = part.lengthSlices[i+1];
    const t0 = part.lengthDivision[i];
    const t1 = part.lengthDivision[i + 1];
    if (s > t0 && s < t1) {
      const dt = t1 - t0;
      const t = (s - t0) / dt;

      for (let j = 0; j < part.radialAmount; ++j) {
        const key = `${i},${j}`;
        const patch = part.patchIndex[key];
        
        
        if (patch.length > 10) {
          lines.push(Quad.getGeometryLineAtS(patchToWeights(part, patch), t, 10));
        } else {
          lines.push(Triangle.getGeometryLineAtS(patchToWeights(part, patch), t, 10));
        }
      }
    }
  }
  return lines;
}


function createGeometryForPatches(pointIndex, patchesCollection) {
  const geometries = [];
  patchesCollection.forEach((patch, ix) => {
    if (patch.length > 10) {
      geometries.push(renderQuadPatch(pointIndex, patchesCollection, ix));
    } else {
      geometries.push(renderTrianglePatch(pointIndex, patchesCollection, ix));
    }
  });

  return geometries.map(geometry => {
    const indices = toArray(Uint16Array, geometry.indices);
    const positions = toArray(Float32Array, geometry.positions);
    const normals = toArray(Float32Array, geometry.normals || []);
    const uvs = toArray(Float32Array, geometry.uvs || []);
    return {
      indices: {array: indices, size: 1}, 
      positions: {array: positions, size: 3},
      normals: {array: normals, size: 3},
      uvs: {array: uvs, size: 2},
    };
  });
}

function getGeometryAttributes(part, patch) {
  if (!patch) {
    return;
  }
  const attrs = [patch.length];
  const pointIndex = part.pointIndex;
  const weights = patchToWeights(part, patch);
  attrs.push(weights);
  attrs.push(...patch.uv);
  if (patch.length == 10) {
    attrs.push(patch.way);
  }
  attrs.push(10);
  return attrs;
}

function toArray(type, fromArray) {
  const array = new type(fromArray.length);
  fromArray.forEach((v, i) => array[i] = v);
  return array;
}

function renderQuadPatch(pointIndex, collection, patchId, steps = 10) {
  const patchIx = collection[patchId];
  const patch = {};
  for (const k in patchIx) {
    if (!pointIndex[patchIx[k]]) {
      patch[k] = patchIx[k];
      continue;
    }    
    patch[k] = pointIndex[patchIx[k]].clone();
  }
  return Quad.getGeometryFromPatch(patch, steps);
}

function renderTrianglePatch(pointIndex, collection, patchId, steps = 10) {
  const patchIx = collection[patchId];
  const patch = {};
  for (const k in patchIx) {
    if (!pointIndex[patchIx[k]]) {
      patch[k] = patchIx[k];
      continue;
    }    
    patch[k] = pointIndex[patchIx[k]].clone();
  }
  return Triangle.getGeometryFromPatch(patch, steps);
}


function createPatches(part, props) {
  const {topCone, bottomCone, radialSegments} = props;
  if (!part.pointIndex) {
    part.pointIndex = {};
  }
  part.patchIndex = {};
  if (bottomCone) {
    props.lengthSegments += 1;
  }
  if (topCone) {
    props.lengthSegments += 1;
  }
  if (bottomCone) {
    createConeAt(part, props, 0);
  }
  if (topCone) {
    createConeAt(part, props, 1);
  }
  createCylinders(part, props);
  recalculateInterpolatedWeights(part);
  recreatePatchesFromPoints(part);

}

export function getPoints(part, pointList) {
  if (pointList) {
    return pointList.map(ix => part.pointIndex[ix]);
  }
  return [];
}

export function getSideLineControls(part) {
  const props = part._initialProps;
  const radial = part.radialAmount;
  const sliceAmount = part.sliceAmount;
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);
  const sideLines = [];
  const slices = [];
  for (let i = 0; i < radial; ++i) {

    const path = [];
    const controlPoints = [];
    if (hasBottomCone) {
      controlPoints.push({ix: '0', ...part.pointIndex['0']});
      controlPoints.push({ix: `0+,${i}`, ...part.pointIndex[`0+,${i}`]});
      controlPoints.push({ix: `1-,${i}`, ...part.pointIndex[`1-,${i}`]});
      controlPoints.push({ix: `1,${i}`, ...part.pointIndex[`1,${i}`]});

      path.push({command: 'moveTo', ...part.pointIndex['0']});
      path.push({command: 'curveTo', 
        cp1: part.pointIndex[`0+,${i}`],
        cp2: part.pointIndex[`1-,${i}`],
        end: part.pointIndex[`1,${i}`],
      });
    } else {
      controlPoints.push({ix: `0,${i}`, ...part.pointIndex[`0,${i}`]});
      path.push({command: 'moveTo', ...part.pointIndex[`0,${i}`]});
    }
    for (let j = 0; j < sliceAmount - coneSegments; ++j) {
      const b = hasBottomCone ? 1 : 0;
      let endIndex = `${j + b + 1},${i}`;
      if (j == (sliceAmount - coneSegments - 1)) {
        if (!hasTopCone) {
          continue;
        }
        endIndex = `${j + b + 1}`;
      }

      controlPoints.push({ix: `${j + b}+,${i}`, ...part.pointIndex[`${j + b}+,${i}`]});
      controlPoints.push({ix: `${j + b + 1}-,${i}`, ...part.pointIndex[`${j + b + 1}-,${i}`]});
      controlPoints.push({ix: endIndex, ...part.pointIndex[endIndex]});
        
      path.push({command: 'curveTo', 
        cp1: part.pointIndex[`${j + b}+,${i}`],
        cp2: part.pointIndex[`${j + b + 1}-,${i}`],
        end: part.pointIndex[endIndex]
      });
    }
    const geometry = Path.getGeometry(path);
    slices.push({geometry, controlPoints});
  }

  return slices;

}

export function getSurfaceControls(part) {
  const props = part._initialProps;
  const radialAmount = part.radialAmount;
  const lengthSlices = part.sliceAmount;
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);
  const slices = [];
  const points = part.pointIndex;
  for (let i = 0; i < radialAmount; ++i) {
    const controlPoints = [];
    if (hasTopCone) {
      controlPoints.push({ix: `${lengthSlices - 1}:111,${i}`, 
        ...points[`${lengthSlices - 1}:111,${i}`]});
    }
    if (hasBottomCone) {
      controlPoints.push({ix: `0:111,${i}`, 
        ...points[`0:111,${i}`]});
    }
    for (let j = hasBottomCone ? 1 : 0; j < lengthSlices - coneSegments ; ++j) {
      const nj = (j + 1) % lengthSlices;
      controlPoints.push({ix: `${j}+,${i}+`, ...points[`${j}+,${i}+`]});
      controlPoints.push({ix: `${nj}-,${i}+`, ...points[`${nj}-,${i}+`]});
      controlPoints.push({ix: `${j}+,${i}-`, ...points[`${j}+,${i}-`]});
      controlPoints.push({ix: `${nj}-,${i}-`, ...points[`${nj}-,${i}-`]});
    }
    slices.push({controlPoints});
  }
  return slices;
  
}

/*
export function getSliceControls(part){
  let props = part._initialProps;
  let coneSegments = (props.topCone? 1:0) + (props.bottomCone?1:0);
  let radialAmount = part.radialAmount;
  let hasBottomCone = props.bottomCone;
  let hasTopCone = props.topCone;
  let slices = [];
  for(let i = 0; i < part.sliceAmount - coneSegments; ++i){
    let bottomConeSliceNum = (hasBottomCone?1:0);
    let sliceIx = i+bottomConeSliceNum;
    //let slice = getLengthSlice(part, i+ bottomConeSliceNum);
    let points = part.pointIndex;
    let path = [
      {command:'moveTo', ...points[`${sliceIx},0`]}
    ]
    let controlPoints = [];
    for(let j =0; j < radialAmount; ++j){
      let nj = (j+1) % radialAmount;
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}`, ...points[`${sliceIx},${j}`]})
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}-`, ...points[`${sliceIx},${j}-`]})
      controlPoints.push({slice:i+bottomConeSliceNum, ix: `${sliceIx},${j}+`, ...points[`${sliceIx},${j}+`]})
      path.push({
        command:'curveTo', 
        cp1:points[`${sliceIx},${j}+`], 
        cp2:points[`${sliceIx},${nj}-`], 
        end:points[`${sliceIx},${nj}`]
      });

    }

    let geometry = Path.getGeometry(path);
    let plane;

    slices.push({
      plane, controlPoints, geometry
    })
  }

  return slices


}*/

function createCylinders(part, props) {
  const coneSegments = (props.topCone ? 1 : 0) + (props.bottomCone ? 1 : 0);
  const hasBottomCone = props.bottomCone;
  const hasTopCone = props.topCone;
  const totalPatches = [];

  for (let i = 0; i < part.sliceAmount - coneSegments - 1; ++i) {
    const bottomConeSliceNum = (hasBottomCone ? 1 : 0);
    const segmentStart = (hasBottomCone ? 1 : 0) + i;
    const lowerSliceId = i + bottomConeSliceNum;
    const upperSliceId = lowerSliceId + 1;

    const lowerSlice = getLengthSlice(part, lowerSliceId);
    const upperSlice = getLengthSlice(part, upperSliceId);
    const lerpLower = 0.25;
    const lerpUpper = 0.75;
    
    mkPoint(`${lowerSliceId}`, lowerSlice.plane.origin.clone());
    mkPoint(`${upperSliceId}`, upperSlice.plane.origin.clone());

    for (let ix = 0; ix < props.radialSegments; ++ix) {
      const nx = (ix + 1) % props.radialSegments;
      const l = lowerSlice.points[`${ix}`];
      const t = upperSlice.points[`${ix}`];
      const controlPoints = {};
      mkPoint(`${segmentStart},${ix}`, l.clone());
      mkPoint(`${segmentStart}+,${ix}`, new Vector3().lerpVectors(l, t, lerpLower));
      mkPoint(`${segmentStart + 1}-,${ix}`, new Vector3().lerpVectors(l, t, lerpUpper));
      mkPoint(`${segmentStart + 1},${ix}`, t.clone());

      const lp = lowerSlice.points[`${ix}+`];
      const tp = upperSlice.points[`${ix}+`];

      mkPoint(`${segmentStart},${ix}+`, lp.clone());
      mkPoint(`${segmentStart}+,${ix}+`, new Vector3().lerpVectors(lp, tp, lerpLower));
      mkPoint(`${segmentStart + 1}-,${ix}+`, new Vector3().lerpVectors(lp, tp, lerpUpper));
      mkPoint(`${segmentStart + 1},${ix}+`, tp.clone());

      const lm = lowerSlice.points[`${nx}-`];
      const tm = upperSlice.points[`${nx}-`];

      mkPoint(`${segmentStart},${nx}-`, lm.clone());
      mkPoint(`${segmentStart}+,${nx}-`, new Vector3().lerpVectors(lm, tm, lerpLower));
      mkPoint(`${segmentStart + 1}-,${nx}-`, new Vector3().lerpVectors(lm, tm, lerpUpper));
      mkPoint(`${segmentStart + 1},${nx}-`, tm.clone());

      const le = lowerSlice.points[`${nx}`];
      const te = upperSlice.points[`${nx}`];

      mkPoint(`${segmentStart},${nx}`, le.clone());
      mkPoint(`${segmentStart}+,${nx}`, new Vector3().lerpVectors(le, te, lerpLower));
      mkPoint(`${segmentStart + 1}-,${nx}`, new Vector3().lerpVectors(le, te, lerpUpper));
      mkPoint(`${segmentStart + 1},${nx}`, te.clone());
    }
  }

  //return totalPatches;

  function mkPoint(index, point) {
    pushPoint(part, index, point);
    return index;
  }
}

function getLengthSlice(part, id) {
  if (part.lengthSlices[id]) {
    return part.lengthSlices[id];
  }

  console.error('slice not found', id);
}

function getOrCreateLengthSlice(sliceNumber, part, orientation, t) {
  if (!part.lengthSlices) {
    part.lengthSlices = {};
  }
  const key = t.toFixed(5);
  if (part.lengthSlices[key] && part.lengthSlices[key].orientation == orientation) {
    return part.lengthSlices[key];
  }

  if (!part.calculated) {
    part.lengthSlices[key] = createSliceFromRadialSegments(part, orientation, t);
    return part.lengthSlices[key];
  }

  part.lengthSlices[key] = calculateSliceFromSurface(part, orientation, t);
  return part.lengthSlices[key];
}

function createSliceFromRadialSegments(part, orientation, t) {
  const {_initialProps: {radialSegments, radius}} = part;
  const plane = getSlicePlane(part, orientation, t);

  const circle = [...circleInPlane(plane, radialSegments, radius) ];
  const slice = {orientation, t, points: {}};
  const circularWeight = getWeightForCircleWith(radialSegments, radius);
  if (!part.radialDivision) {
    part.radialDivision = [];
    for (let i = 0; i <= radialSegments; ++i) {
      part.radialDivision.push(i / radialSegments);
    }
  }
  circle.forEach(({point, tangent}, i) => {
    const ix = `${i}`;
    slice.points[ix] = point.clone();
    slice.points[ix + '-'] = point.clone().add(tangent.clone().multiplyScalar(circularWeight));
    slice.points[ix + '+'] = point.clone().add(tangent.clone().multiplyScalar(-circularWeight));
  });
  slice.curves = radialSegments;
  return slice;
}


function createInitialSlices(part, props) {
  part.sliceAmount = props.lengthSegments + 1;
  part.radialAmount = props.radialSegments;
  part.pointIndex = {};
  part.crossSlicePlanes = [];
  part.radialPlanes = [];

  const noConeSliceAmount = part.sliceAmount;
  if (props.topCone) {
    ++part.sliceAmount;
  }
  if (props.bottomCone) {
    ++part.sliceAmount;
  }
  const noConeLength = props.length - (props.topCone ? props.topConeLength : 0)
                                  - (props.bottomCone ? props.bottomConeLength : 0);

  const noConeT = noConeLength / props.length; 
  const bottomConeT = (props.bottomCone ? props.bottomConeLength : 0) / props.length;
  const ts = [0];
  if (props.bottomCone) {
    ts.push(bottomConeT);
  }
  for (let i = 1; i <= props.lengthSegments; ++i) {
    ts.push(bottomConeT + i * noConeT / props.lengthSegments);
  }
  for (let i = 0; i < part.radialAmount; ++i) {
    const planeOrigin = new Vector3;
    const firstDirection = new Vector3(0, 1, 0);
    let a = (1 - i / part.radialAmount) * Math.PI * 2;
    a -= Math.PI / 2;
    const p = new Vector3(Math.cos(a), 0, Math.sin(a));
    // let q = new Quaternion().setFromAxisAngle(new Vector3(0,1,0), Math.PI/2);
    const plane = {
      origin: planeOrigin.clone(),
      normal: p // .applyQuaternion(q)
    };
    part.pointIndex[`${i},r`] = plane.normal.clone();
  }

  ts.push(1);
  part.lengthSlices = [];
  part.lengthDivision = ts;
  ts.forEach((t, id) => {
    let slice = {id,
      t,
      orientation: props.orientation
    };
    if (id == 0 && props.bottomCone || id == part.sliceAmount - 1 && props.topCone) {
      const plane = getSlicePlane(part, props.orientation, slice.t);
      // part.crossSlicePlanes.push(plane);
      part.pointIndex[`${id}`] = plane.origin.clone();
      slice.weights = [...circleInPlane(plane, props.radialSegments, props.radius * 0.4)];
      slice.plane = plane;
    } else {
      const plane = getSlicePlane(part, props.orientation, slice.t);
      // part.crossSlicePlanes.push(plane);
      part.pointIndex[`${id}`] = plane.origin.clone();
      slice = {
        ...createSliceFromRadialSegments(part, props.orientation, slice.t),
        ...slice,
        plane
      };
    }
    
    part.lengthSlices.push(slice);
  });
}

function recreatePatchesFromPoints(part) {
  const pointIndex = part.pointIndex;
  const radialAmount = part.radialAmount;
  const sliceAmount = part.sliceAmount;
  const patchAmount = sliceAmount - 1;
  const hasTopCone = part._initialProps.topCone;
  const hasBottomCone = part._initialProps.bottomCone;
  const newPatchIndex = {};
  const radialDivision = part.radialDivision;
  const lengthDivision = part.lengthDivision;
  for (let i = 0; i < patchAmount; ++i) {
    const uFrom = part.radialDivision[i];
    const uTo = part.radialDivision[i + 1];
    for (let j = 0; j < radialAmount; ++j) {
      if ((hasBottomCone && i == 0) || (hasTopCone && i == (patchAmount - 1))) {
        newPatchIndex[`${i},${j}`] = mkTPatch(i, i == 0 ? 1 : -1, j);
      } else {
        newPatchIndex[`${i},${j}`] = mkQPatch(i, j);
      }
    }
  }
  part.patchIndex = newPatchIndex;

  function mkQPatch(i, j) {
    const ni = i + 1;
    const nj = (j + 1) % radialAmount;
    const ls = part.sliceAmount - 1;
    const uFrom = radialDivision[j];
    const uTo = radialDivision[j + 1];
    const vFrom = lengthDivision[i];
    const vTo = lengthDivision[i + 1];
    return {
      '00': `${i},${j}`,
      '10': `${i}+,${j}`,
      '20': `${ni}-,${j}`,
      '30': `${ni},${j}`,

      '01': `${i},${j}+`,
      '11': `${i}+,${j}+`,
      '21': `${ni}-,${j}+`,
      '31': `${ni},${j}+`,

      '02': `${i},${nj}-`,
      '12': `${i}+,${nj}-`,
      '22': `${ni}-,${nj}-`,
      '32': `${ni},${nj}-`,

      '03': `${i},${nj}`,
      '13': `${i}+,${nj}`,
      '23': `${ni}-,${nj}`,
      '33': `${ni},${nj}`,
      length: 16,
      uv: [
        [ uFrom, vFrom],
        [ uTo, vTo ]
      ]

    };

  }

  function mkTPatch(ix, way, rad) {
    const ls = sliceAmount - 1;
    const upperU = lengthDivision[lengthDivision.length - 2];
    const lowerU = lengthDivision[1];
    const tCone = ix == 0 ? 0 : 1;
    ix = ix == 0 ? 0 : ix + 1;

    const nr = (rad + 1) % radialAmount;

    const uFrom = radialDivision[rad];
    const uTo = radialDivision[rad + 1];
    //let vFrom = lengthDivision[i];
    //let vTo = lengthDivision[i+1];

    const fromUV = [ uFrom, Math.min(upperU, tCone)];
    const toUV = [uTo, Math.max(lowerU, tCone) ];
    return {
      '300': `${ix}`,

      '210': `${ix}${sign(way)},${rad}`,
      '201': `${ix}${sign(way)},${nr}`,

      '120': `${ix + way}${sign(-way)},${rad}`,
      '111': `${ix}:111,${rad}`,
      '102': `${ix + way}${sign(-way)},${nr}`,

      '030': `${ix + way},${rad}`,
      '021': `${ix + way},${rad}+`,
      '012': `${ix + way},${nr}-`,
      '003': `${ix + way},${nr}`,
      length: 10,
      uv: [fromUV, toUV],
      way

    };
  }
  function sign(t) {
    return t > 0 ? '+' : '-';
  }
}

function createConeAt(part, props, tCone) {
  const way = tCone == 0 ? 1 : -1;
  const tipSliceId = tCone == 0 ? 0 : part.lengthSlices.length - 1;
  const coneLength = tCone ? props.topConeLength : props.bottomConeLength;
  const coneBaseWeight1 = coneLength * 0.5;
  const coneBaseWeight2 = coneLength * 0.5;

  const tipSlice = getLengthSlice(part, tipSliceId);
  const baseSlice = getLengthSlice(part, tipSliceId + way);
  const controlPoints = {};
  const lengthIndex = tipSliceId; 
  const trianglePatches = [];
  for (let ix = 0; ix < props.radialSegments; ++ix) {
    const nextIndex = (ix + 1) % props.radialSegments;
    const p210 = tipSlice.weights[ix].point.clone();
    const p201 = tipSlice.weights[nextIndex].point.clone();
    const pathCentral = Path.get([
      {command: 'moveTo', ...baseSlice.points[`${ix}`].clone()}, 
      {command: 'curveTo', cp1: baseSlice.points[`${ix}+`].clone(), 
        cp2: baseSlice.points[`${nextIndex}-`].clone(), 
        end: baseSlice.points[`${nextIndex}`]}], 0.5);

    const triBaseTipWeight = baseSlice.plane.normal.clone()
      .multiplyScalar(-way * coneBaseWeight1);
    const tri111Weight = baseSlice.plane.normal.clone()
      .multiplyScalar(-way * coneBaseWeight1);



    const p300 = tipSlice.plane.origin.clone();
    const p030 = baseSlice.points[`${ix}`].clone();
    const p003 = baseSlice.points[`${nextIndex}`].clone();
    const p120 = baseSlice.points[`${ix}`].clone().add(triBaseTipWeight);
    const p102 = baseSlice.points[`${nextIndex}`].clone().add(triBaseTipWeight);
    const p021 = baseSlice.points[`${ix}+`].clone();
    const p012 = baseSlice.points[`${nextIndex}-`].clone();

    /*
    let [_p210, _p201] = [p210, p201].map(p=>p.clone().sub(p300));
    let [_p120, _p021] = [p120, p021].map(p=>p.clone().sub(p030));
    let [_p102, _p012] = [p102, p012].map(p=>p.clone().sub(p003));
    let p210_p201 = p300.clone().add(_p210.add(_p201));
    let p120_p021 = p030.clone().add(_p120.add(_p021));
    let p102_p012 = p003.clone().add(_p102.add(_p012));
    let p111 = [p210_p201, p120_p021, p102_p012]
      .map(p=>p.multiplyScalar(1/3.0))
      .reduce((p,p1)=>{p.add(p1);return p;}, new Vector3);

   */ 
    const p111 = new Vector3;
    
    mkPoint(`${lengthIndex}`, p300);
                                                                                   
    mkPoint(`${lengthIndex}${sign(way)},${ix}`, p210);
    mkPoint(`${lengthIndex}${sign(way)},${nextIndex}`, p201);
                                                                                   
    mkPoint(`${lengthIndex + way}${sign(-way)},${ix}`, p120);
    mkPoint(`${lengthIndex}:111,${ix}`, p111);
    mkPoint(`${lengthIndex + way}${sign(-way)},${nextIndex}`, p102);
                                                                                   
    mkPoint(`${lengthIndex + way},${ix}`, p030);
    mkPoint(`${lengthIndex + way},${ix}+`, p021);
    mkPoint(`${lengthIndex + way},${nextIndex}-`, p012);
    mkPoint(`${lengthIndex + way},${nextIndex}`, p003);
  }


  function mkPoint(index, point) {
    pushPoint(part, index, point);
    return index;
  }
  function sign(t) {
    return t > 0 ? '+' : '-';
  }

}


function pushPoint(part, index, point) {

  if (part.pointIndex[index] && !eq(part.pointIndex[index], point) ) {
    const p1 = part.pointIndex[index];
    const p2 = point;
    console.error(`overriding point [${index}] with 
                  anouther value: ${p1.x},${p1.y},${p1.z} =>   ${p2.x},${p2.y},${p2.z}`);
  }
  part.pointIndex[index] = point;

  function eq(p1, p2) {
    const distance = p1.distanceTo(p2);
    if (distance < 1e-5) {
      return true;
    }
    return false;
  }
}

function getPoint(part, index, setDefault = null) {
  // points indexation - 'N,M', where N = length number [0; lengthSegments]
  // M = radialNumber [0; radialSegments * 2]

}

function createMainAxis(part, props) {
  const {length} = props;
  part.mainAxis = [
    {command: 'moveTo', x: 0, y: 0, z: 0},
    {command: 'lineTo', x: 0, y: length, z: 0}
  ];
}

/*
function createSlices(part, props){
  let {
    lengthSegments, 
    radialSegments, 
    topCone, bottomCone,
    radius, length,
    orientation} = props;
  if(! radius) radius = 0.333 * length;
  if(topCone){ // create special control point in the cone tip
    // this point located in the top of the main axis and can be
    // modified via axis, so we need only `radialSegmens` control points
    // oriented the same with the rest slices;
    part.topConeTip = {
      orientation,
      controlPoints: createConetipContolPoints(
        part,radialSegments, orientation, 1
      )
    }
  }

  if(bottomCone) part.bottomConeTip={
    orientation,
    controlPoints: createConetipContolPoints(
        part,radialSegments, orientation, 0
      )
  }
  part.slices = []
  for(let i = 0; i < lengthSegments; ++i){
    let t = (i+1)/lengthSegments;
    let lastFirst = i == 0? 'first':i == (lengthSegments-1)?'last':''
    part.slices
    .push(createSliceAt(part, radialSegments, orientation, radius, lastFirst, t));
  }

}*/

function createSliceAt(part, radialSegments, orientation, sliceRadius, lastFirst, t) {
  const plane = getSlicePlane(part, orientation, t);
  const {normal} = plane;
  const lastWeight = null;
  const prevWeight = null;
  const points = [...circleInPlane(plane, radialSegments)];
  const path = [{command: 'moveto', ...points[0].point}];
  const weight = getWeightForCircleWith(radialSegments, sliceRadius);
  for (let i = 1; i <= points.length; ++i) {
    const isLast = i == points.length;
    const prev = points[i - 1];
    let cur = points[i];
    if (isLast) {
      cur = points[0];
    }
    const cp1 = prev.tangent.clone().multiplyScalar(weight)
      .add(prev);
    const cp2 = cur.tangent.clone().multiplyScalar(-weight)
      .add(cur);
              
    let end = cur.point;
    if (isLast) {
      end = 'last-moveto';
    }
    const cmd = {command: 'curveto', cp1, cp2, end};
    path.push(cmd);
  }
  return {path};
}

function getWeightForCircleWith(steps, radius = 1) {
  return 0.5526 * radius;
}

function createConetipContolPoints(part, radialSegments, orientation, t) {
  const defaultTipWeight = 0.01;
  const {length} = part;
  const cps = [];
  const plane = getSlicePlane(part, orientation, t);
  for ({point} of circleInPlane(plane, radialSegments)) {
    cps.push(point.multiplyScalar(defaultTipWeight * length));
  }
  return cps;
}

function* circleInPlane({normal, origin}, steps, radius) {
  let z = new Vector3(0, 0, 1);
  const y = new Vector3(0, 1, 0);
  const x = new Vector3(1, 0, 0);
  const ang = normal.angleTo(z);
  if (ang > 0) {
    const axis = new Vector3().crossVectors(normal, z);
    y.applyAxisAngle(axis, ang).multiplyScalar(radius);
    x.applyAxisAngle(axis, ang).multiplyScalar(radius);
    z = normal.clone();
  }

  const pi2 = Math.PI * 2;
  for (let i = 0; i < steps; ++i) {
    const p = origin.clone();
    const t = 1.0 - i / steps;
    p.add(x.clone().multiplyScalar(Math.cos(t * pi2)));
    p.add(y.clone().multiplyScalar(Math.sin(t * pi2)));
    const p0 = p.clone().sub(origin);
    const t0 = new Vector3().crossVectors(p0, z).normalize();

    yield {point: p, tangent: t0};
  }

}

function getSlicePlane({mainAxis}, orientation, t) {
  let normal, origin;
  switch (orientation) {
    case 'top-vector':
      normal = this.props.topVector.clone();
      origin = path.getPoint(t);
      break;
    case 'path-tangent':
    default:
      normal = Path.getNormal(mainAxis, t);
      origin = Path.get(mainAxis, t);
      break;
  }
  return {normal, origin};

}
