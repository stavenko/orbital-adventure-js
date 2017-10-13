import {Vector3} from 'three/src/math/Vector3';
import {BufferGeometry} from 'three/src/core/BufferGeometry.js';
import {BufferAttribute} from 'three/src/core/BufferAttribute.js';

const pi = Math.PI;
const pi2 = pi * 2;

export function arrowsOnPath(path, from, to, radius, steps, pathSteps, extraRadiusMultiplier = 1.5, extraPath = pi / 9) {
  const distance = to - from;
  const pointIndex = {};
  const pointArray = [];
  const normalArray = [];
  let positionAmount = 0;
  const faces = [];
  for (let i = 0; i < pathSteps; ++i) {
    const nextI = (i + 1) % (pathSteps + 1);
    const [p, q] = [i, nextI].map(i => {
      const {point, tangent} = getPointAt(path, from + (i / pathSteps) * distance);
      return circleInPlane({origin: point, normal: tangent}, steps, radius);

    });
    for (let j = 0; j < steps; ++j) {
      const nj = (j + 1) % steps;
      const a = getOrSavePoint(i, j, p[j].point.clone(), p[j].pointNormal.clone());
      const b = getOrSavePoint(nextI, j, q[j].point.clone(), p[j].pointNormal.clone());
      const c = getOrSavePoint(nextI, nj, q[nj].point.clone(), p[nj].pointNormal.clone());
      const d = getOrSavePoint(i, nj, p[nj].point.clone(), p[nj].pointNormal.clone());
      faces.push(a, c, b, a, d, c);
    }
  }

  const S = getPointAt(path, from - extraPath);
  const SB = getPointAt(path, from );
  const E = getPointAt(path, to + extraPath);
  const EB = getPointAt(path, to);

  [[S, SB], [E, EB]].forEach(([tipPoint, basePoint], ix) => {
    const plane = {origin: basePoint.point, normal: basePoint.tangent};

    const pts = circleInPlane(plane, steps, radius * extraRadiusMultiplier);
    const tipPointIndex = getOrSavePoint(['a', 'z'][ix], 't', tipPoint.point.clone(), tipPoint.tangent.clone());

    for (let j = 0; j < pts.length; ++j) {
      const nj = [j + 1] % steps;
      const ca = getOrSavePoint(['a', 'z'][ix], j, pts[j].point, pts[j].pointNormal);
      const cb = getOrSavePoint(['a', 'z'][ix], nj, pts[nj].point, pts[nj].pointNormal);
      const a = getOrSavePoint([0, pathSteps][ix], j, null);
      const b = getOrSavePoint([0, pathSteps][ix], nj, null);
      if (ix == 0) {
        faces.push(ca, tipPointIndex, cb);
        faces.push(a, ca, cb);
        faces.push(a, cb, b);
      } else {
        faces.push(ca, cb, tipPointIndex);
        faces.push(a, cb, ca);
        faces.push(a, b, cb);
      }
    }
  });

  function getOrSavePoint(i, j, point, normal) {
    const key = `${i},${j}`;
    if (pointIndex[key]) {
      return pointIndex[key];
    }
    pointArray.push(point.x);
    pointArray.push(point.y);
    pointArray.push(point.z);
    normalArray.push(normal.x);
    normalArray.push(normal.y);
    normalArray.push(normal.z);
    pointIndex[key] = positionAmount++;
    return pointIndex[key];
  }

  const positions = toArray(Float32Array, pointArray);
  const normals = toArray(Float32Array, normalArray);
  const index = toArray(Uint32Array, faces);
  const geometry = new BufferGeometry();
  geometry.addAttribute('position', new BufferAttribute(positions, 3));
  geometry.addAttribute('normal', new BufferAttribute(normals, 3, true));
  geometry.setIndex(new BufferAttribute(index, 1));
  return {geometry};
}

function getPointAt(path, at) {

  if (path.type === 'ray') {
    const ray = path.ray.clone();
    const point = path.origin.clone().add(ray.clone().multiplyScalar(at));
    return {point, tangent: ray};
  }

  if (path.type === 'circle') {
    const basis = getBasis(path.plane);
    const point = getCirclePoint(basis, at, path.radius);
    const tangent = new Vector3().crossVectors(basis.z, point.clone().sub(path.plane.origin)).normalize();
    return {point, tangent};
  }
}


function getTangent( normal, point) {
  return new Vector3().crossVectors(normal, point);
}

function getCirclePoint(basis, angle, radius) {
  const p = new Vector3;
  p.add(basis.x.clone().multiplyScalar(radius * Math.cos(angle)));
  p.add(basis.y.clone().multiplyScalar(radius * Math.sin(angle)));
  return p;
}

function getBasis({normal, origin}) {
  const z = new Vector3(0, 0, 1);
  const y = new Vector3(0, 1, 0);
  const x = new Vector3(1, 0, 0);

  const ang = normal.angleTo(z);
  const axis = new Vector3().crossVectors(normal, z).normalize();
  y.applyAxisAngle(axis, -ang);
  x.applyAxisAngle(axis, -ang);
  z.applyAxisAngle(axis, -ang);

  return {x, y, z};

}

function circleInPlane({normal, origin}, steps, radius) {
  const basis = getBasis({normal, origin});

  const points = [];

  const pi2 = Math.PI * 2;
  for (let i = 0; i < steps; ++i) {
    const p = new Vector3(); // origin.clone();
    const t = i / steps;
    p.add(basis.x.clone().multiplyScalar(radius * Math.cos(t * pi2)));
    p.add(basis.y.clone().multiplyScalar(radius * Math.sin(t * pi2)));
    const t0 = new Vector3().crossVectors(p, basis.z).normalize();

    points.push({point: p.clone().add(origin), tangent: t0, normal, pointNormal: p.clone() });
  }
  return points;

}

function toArray(type, fromArray) {
  const array = new type(fromArray.length);
  fromArray.forEach((v, i) => array[i] = v);
  return array;
}

