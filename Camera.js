import {Vector2} from 'three/src/math/Vector2';
import {Vector3} from 'three/src/math/Vector3';
export class Camera{
  constructor(camera, element){
    this.camera = camera;
    this.element = element;
    this.rotateStart = new Vector2;
    this.rotateEnd = new Vector2;
    this.target = new Vector3
    this. thetaDelta = 0;
    this. phiDelta = 0;
  }

  startRotation(event){
    this.rotateStart.set(event.clientX, event.clientY);
  }

  rotate(event){
    let rotateSpeed = 1;
    this.rotateEnd.set(event.clientX, event.clientY);
    let rotateDelta = new Vector2().subVectors(this.rotateEnd, this.rotateStart);
    this.rotateLeft(2*Math.PI * rotateDelta.x / this.element.clientWidth * rotateSpeed);
    this.rotateUp(2*Math.PI * rotateDelta.y / this.element.clientHeight * rotateSpeed);
    this.rotateStart.copy(this.rotateEnd);
    this.update();
  }

  rotateLeft(a){
    this.thetaDelta -= a;
  }
  rotateUp(a){ 
    this.phiDelta -= a;
  }

  update(){
    let pos = this.camera.position.clone();
    let target = this.target.clone();
    let offset = pos.sub(target);
    let theta = Math.atan2(offset.x, offset.z);
    let phi =Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);
    theta += this.thetaDelta;
    phi += this.phiDelta;
    let radius = offset.length();
    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
    this.thetaDelta = 0;
    this.phiDelta = 0;
  }

}
