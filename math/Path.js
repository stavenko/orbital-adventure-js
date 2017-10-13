import Bezier from 'bezier-js';
import set from 'lodash/set';
import {Vector3} from 'three/src/math/Vector3';

export function getNormal(commands, t) {
  const d = 0.0001;
  let p1, p2;
  if ( t < 1) {
    p1 = get(commands, t);
    p2 = get(commands, t + d);
  } else {
    p1 = get(commands, t - d);
    p2 = get(commands, t);
  }

  return p2.sub(p1). normalize();


}

export function get(commands, t) {
  const paths = commandsToCurves(commands);
  const perCommand = 1 / paths.length;
  let curve;
  let inCommand;
  if (t < 1) {
    const commandsT = t / perCommand;
    const commandId = Math.floor(commandsT);
    inCommand = commandsT - commandId;
    curve = paths[commandId];
  } else {
    curve = paths[paths.length - 1];
    inCommand = 1;
  }
  if (curve.type == 'line') {
    const f = new Vector3(curve.from.x, curve.from.y, curve.from.z);
    const to = new Vector3(curve.to.x, curve.to.y, curve.to.z);
    const v = new Vector3().lerpVectors(f, to, inCommand);
    return v;
  }
  if (curve.type == 'curve') {
    const p = createBezier(curve.from, curve.curve.cp1, curve.curve.cp2, curve.curve.end).get(inCommand);
    return new Vector3(p.x, p.y, p.z);
  }
}

export function getGeometry(path, bezierSteps = 10) {
  let points = [];
  const geometries = [];
  const nodes = [];
  let currentCoords = {x: 0, y: 0, z: 0};
  for (let i = 0; i < path.length; ++i) {
    const command = path[i];
    switch (command.command) {
      case 'lineTo': lineTo(command, i); break;
      case 'curveTo': curveTo(command, i); break;
      case 'moveTo' : moveTo(command, i); break;
    }
  }
  geometries.push(points);
  points = [];

  return geometries.map(pts => {
    const array = new Float32Array(pts.length * 3);
    let ix = 0;
    pts.forEach(({x, y, z}) => {
      array[ix++] = x;
      array[ix++] = y;
      array[ix++] = z;
    });
    return {array, size: 3};
  });

  function moveTo({x, y, z}) {
    if (points.length > 0) {
      geometries.push(points);
      points = [];
    }
    currentCoords = {x, y, z};
  }

  function lineTo({x, y, z, relative}, commandId) {
    if (relative) {
      x += currentCoords.x;
      y += currentCoords.y;
      z += currentCoords.z;
    }
    if (points.length == 0) {
      points.push(currentCoords);
      const node = {...currentCoords, commandId: commandId - 1 };
      nodes.push(node);
    }
    points.push({x, y, z});
    currentCoords = {x, y, z};
    nodes.push({x, y, z, commandId});
  }

  function curveTo({cp1, cp2, end }, commandId) {
    let cp0 = Object.assign({}, currentCoords);
    const bezierCurve = new Float32Array(4 * 3);
    let index = 0;
    const keys = [null, 'cp1', 'cp2', 'end'];
    [cp0, cp1, cp2, end].forEach(({x, y, z, relative}, i) => {
      if (relative) {
        x += cp0.x; y += cp0.y; z += cp0.z;
      }
      bezierCurve[index++] = x;
      bezierCurve[index++] = y;
      bezierCurve[index++] = z;
      //let node = {x,y,z, commandId, key: keys[i]};
      //if(i === 1 || i === 2) node.control = true;
      //if(i !== 0) this.nodes.push(node);
      cp0 = {x, y, z};
    });
    const bezier = new Bezier(bezierCurve);
    let From = 0;
    if (points.length > 0) {
      From = 1;
    }
    for (let i = From; i <= bezierSteps; ++i) {
      const t = i / bezierSteps;
      const point = bezier.get(t);
      points.push(point);
    }
    currentCoords = cp0;
  }

}

function createBezier(cp0, cp1, cp2, end) {
  if (!end) {
    return createQuadBezier(cp0, cp1, cp2);
  }

  const bezierCurve = new Float32Array(4 * 3);
  let index = 0;
  const keys = [null, 'cp1', 'cp2', 'end'];
  [cp0, cp1, cp2, end].forEach(({x, y, z, relative}, i) => {
    if (relative) {
      x += cp0.x; y += cp0.y; z += cp0.z;
    }
    bezierCurve[index++] = x;
    bezierCurve[index++] = y;
    bezierCurve[index++] = z;
    const node = {x, y, z};
    // if(i === 1 || i === 2) node.control = true;
    // if(i !== 0) this.nodes.push(node);
    //cp0 = {x,y,z};
  });
  return new Bezier(bezierCurve);

}

function createQuadBezier(cp0, cp2, cp3) {
  console.error('implement me');
}
function commandsToCurves(commands) {
  let cc = {x: 0, y: 0, z: 0};
  const curves = [];
  commands.forEach((cmd, ix) => {
    switch (cmd.command) {
      case 'moveTo': 
        cc = Object.assign({}, cmd);
        break;
      case 'lineTo':
        curves.push({type: 'line', from: cc, to: cmd});
        cc = Object.assign({}, cmd);
        break;
      case 'curveTo':
        curves.push({type: 'curve', from: cc, curve: cmd});
        cc = Object.assign({}, cmd.end);
        break;
    }
  });
  return curves;
}

export class Path {
  constructor(commands) {
    this.commands = commands;
  }

  prepareNewGeomety() {
    this.points = [];
    this.geometries = [];
    this.nodes = [];
    this.currentCoords = {x: 0, y: 0, z: 0};
  }



  moveTo({x, y, z}) {
    if (this.points.length > 0) {
      this.geometries.push(this.points);
      this.points = [];
    }
    this.currentCoords = {x, y, z};
  }

  lineTo({x, y, z, relative}, commandId) {
    if (relative) {
      x += this.currentCoords.x;
      y += this.currentCoords.y;
      z += this.currentCoords.z;
    }
    if (this.points.length == 0) {
      this.points.push(this.currentCoords);
      const node = {...this.currentCoords, commandId: commandId - 1 };
      this.nodes.push(node);
    }
    this.points.push({x, y, z});
    this.currentCoords = {x, y, z};
    this.nodes.push({x, y, z, commandId});
  }

  curveTo({cp1, cp2, end }, commandId) {
    let cp0 = Object.assign({}, this.currentCoords);
    const bezierCurve = new Float32Array(4 * 3);
    let index = 0;
    const keys = [null, 'cp1', 'cp2', 'end'];
    [cp0, cp1, cp2, end].forEach(({x, y, z, relative}, i) => {
      if (relative) {
        x += cp0.x; y += cp0.y; z += cp0.z;
      }
      bezierCurve[index++] = x;
      bezierCurve[index++] = y;
      bezierCurve[index++] = z;
      const node = {x, y, z, commandId, key: keys[i]};
      if (i === 1 || i === 2) {
        node.control = true;
      }
      if (i !== 0) {
        this.nodes.push(node);
      }
      cp0 = {x, y, z};
    });
    const bezier = new Bezier(bezierCurve);
    let From = 0;
    if (this.points.length > 0) {
      From = 1;
    }
    for (let i = From; i <= this.bezierSteps; ++i) {
      const t = i / this.bezierSteps;
      const point = bezier.get(t);
      this.points.push(point);
    }
    this.currentPoint = cp0;
  }

  modify(commandId, key, point) {
    const cmd = this.commands[commandId];
    if (key === '') {
      Object.assign(cmd, point);
    } else {
      set(cmd, key, point);
    }
  }

  getNodes() {
    return this.nodes; 
  }


  getRawGeometry(bezierSteps = 10) {
    this.bezierSteps = bezierSteps;
    this.prepareNewGeomety();
    for (let i = 0; i < this.commands.length; ++i) {
      const command = this.commands[i];
      switch (command.command) {
        case 'lineto': this.lineTo(command, i); break;
        case 'curveto': this.curveTo(command, i); break;
        case 'moveto' : this.moveTo(command, i); break;
      }
    }
    this.geometries.push(this.points);
    this.points = [];

    return this.geometries.map(pts => {
      const array = new Float32Array(pts.length * 3);
      let ix = 0;
      pts.forEach(({x, y, z}) => {
        array[ix++] = x;
        array[ix++] = y;
        array[ix++] = z;
      });
      return {array, size: 3};
    });
  }
}
