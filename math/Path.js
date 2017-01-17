import Bezier from 'bezier-js';
import set from 'lodash/set';

export function get(commands, t){
  let paths = commandsToCurves(commands);
  let perCommand = 1/paths.length;
  let commandId = Math.floor(t / perCommand);
  let inCommand = t - (command * perCommand);
  let curve = paths[commandId];
  if(curve.type == 'line') {
    let f = new Vector3(curve.from.x, curve.from.y, curve.from.z);
    let to = new Vector3(curve.to.x, curve.to.y, curve.to.z);
    let v = new Vector3().lerpVectors(f,to, t)
    return v;
  }
  if(curve.type == 'curve'){
    let p = createBezier(curve.from, curve.curve.cp1, curve.curve.cp2, curve.curve.end).get(t);
    return new Vector3(p.x, p.y, p.z);
  }

}

function createBezier(cp0, cp1, cp2, end){
  if(!end) return createQuadBezier(cp0,cp1,cp2);

  let bezierCurve = new Float32Array(4 * 3);
  let index = 0;
  let keys = [null,'cp1', 'cp2', 'end'];
  [cp0, cp1, cp2, end].forEach(({x,y,z, relative},i)=>{
    if(relative) {x += cp0.x; y+= cp0.y; z+= cp0.z}
    bezierCurve[index++] = x;
    bezierCurve[index++] = y;
    bezierCurve[index++] = z;
    let node = {x,y,z, commandId, key: keys[i]};
    if(i === 1 || i === 2) node.control = true;
    if(i !== 0) this.nodes.push(node);
    cp0 = {x,y,z};
  })
  return new Bezier(bezierCurve);

}

function createQuadBezier(cp0, cp2, cp3){
  console.error('implement me');
}
function commandsToCurves(commands){
  let cc = {x:0, y:0, z:0};
  let curves = [];
  commands.forEach((cmd,ix) => {
    switch(cmd.command){
      case 'moveTo': 
        cc = Object.assign({}, cmd);
        break;
      case 'lineTo':
        curves.push({type:'line', from:cc, to:cmd});
        cc = Object.assign({}, cmd);
        break;
      case 'curveTo':
        curves.push({type:'curve', from:cc, curve: cmd});
        cc = Object.assign({}, cmd.end);
        break;
    }
  }
  return curves;
}

export class Path{
  constructor(commands){
    this.commands = commands;
  }

  prepareNewGeomety(){
    this.points = [];
    this.geometries = [];
    this.nodes = [];
    this.currentCoords = {x:0, y:0, z:0};
  }



  moveTo({x,y,z}){
    if(this.points.length > 0){
      this.geometries.push(this.points);
      this.points = [];
    }
    this.currentCoords = {x,y,z};
  }

  lineTo({x,y,z, relative}, commandId){
    if(relative){
      x += this.currentCoords.x;
      y += this.currentCoords.y;
      z += this.currentCoords.z;
    }
    if(this.points.length == 0){
      this.points.push(this.currentCoords);
      let node = {...this.currentCoords, commandId: commandId-1 }
      this.nodes.push(node);
    }
    this.points.push({x,y,z});
    this.currentCoords = {x,y,z};
    this.nodes.push({x,y,z, commandId});
  }

  curveTo({cp1, cp2, end }, commandId){
    let cp0 = Object.assign({}, this.currentCoords);
    let bezierCurve = new Float32Array(4 * 3);
    let index = 0;
    let keys = [null,'cp1', 'cp2', 'end'];
    [cp0, cp1, cp2, end].forEach(({x,y,z, relative},i)=>{
      if(relative) {x += cp0.x; y+= cp0.y; z+= cp0.z}
      bezierCurve[index++] = x;
      bezierCurve[index++] = y;
      bezierCurve[index++] = z;
      let node = {x,y,z, commandId, key: keys[i]};
      if(i === 1 || i === 2) node.control = true;
      if(i !== 0) this.nodes.push(node);
      cp0 = {x,y,z};
    })
    let bezier = new Bezier(bezierCurve);
    let From = 0;
    if(this.points.length > 0) From = 1;
    for(let i = From; i <= this.bezierSteps; ++i){
      let t = i / this.bezierSteps;
      let point = bezier.get(t);
      this.points.push(point);
    }
    this.currentPoint = cp0;
  }

  modify(commandId, key, point){
    let cmd = this.commands[commandId];
    if(key === ''){
      Object.assign(cmd, point);
    }else{
      set(cmd, key, point);
    }
  }

  getNodes(){
    return this.nodes; 
  }


  getRawGeometry(bezierSteps = 10){
    this.bezierSteps = bezierSteps;
    this.prepareNewGeomety();
    for(let i =0; i< this.commands.length; ++i){
      let command = this.commands[i]
      switch(command.command){
        case 'lineto': this.lineTo(command,i); break;
        case 'curveto': this.curveTo(command,i); break;
        case 'moveto' : this.moveTo(command, i); break;
      }
    }
    this.geometries.push(this.points);
    this.points = [];

    return this.geometries.map(pts=>{
      let array = new Float32Array(pts.length *3);
      let ix = 0;
      pts.forEach(({x,y,z})=>{
        array[ix++] = x;
        array[ix++] = y;
        array[ix++] = z;
      })
      return {array, size:3};
    })
  }
}
