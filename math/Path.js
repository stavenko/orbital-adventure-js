import Bezier from 'bezier-js';
import set from 'lodash/set';

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
