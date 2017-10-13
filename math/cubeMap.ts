import {Vector3, Vector2} from 'three';

enum Face {Top, Bottom, Left, Right, Near, Far };

export class CubeCoords {
  face: Face;
  st: Vector2;

  constructor(st:Vector2, f:Face) {
    this.st = st;
    this.face = f;
  }
}


export function normal2Cube(v:Vector3):CubeCoords {
  const face = determineFace(v);
  const st = getFaceCoords(v, face);
  return new CubeCoords(st, face);
}

export function getFaceCoords(n: Vector3, f: Face): Vector2 {
  const abs = Math.abs;
  if (f == 2) {
    return new Vector2(-n.z / abs(n.x), -n.y / abs(n.x));
  } // +x
  if (f == 0) {
    return new Vector2(n.z / abs(n.x), -n.y / abs(n.x));
  } 

  if (f == 4) {
    return new Vector2(n.x / abs(n.z), -n.y / abs(n.z));
  } // +z
  if (f == 5) {
    return new Vector2(-n.x / abs(n.z), -n.y / abs(n.z));
  } 

  if (f == 3) {
    return new Vector2(n.x / abs(n.y), n.z / abs(n.y));
  } // +y
  if (f == 1) {
    return new Vector2(n.x / abs(n.y), -n.z / abs(n.y));
  } 

  throw new Error(`Wrong face number: ${f}`);
};

export function determineFace(n: Vector3):Face {
  const abs = Math.abs;
  const ax = abs(n.x);
  const ay = abs(n.y);
  const az = abs(n.z);

  if (ay > ax && ay > az) {
    if (n.y > 0.0) {
      return 3;
    } else {
      return 1;
    }
  } 

  if (ax > ay && ax > az) {
    if (n.x > 0.0) {
      return 2;
    } else {
      return 0;
    }
  }

  if (az > ay && az > ax) {
    if (n.z > 0.0) {
      return 4;
    } else {
      return 5;
    }
  }
  console.warn('select any');

  if (n.x > 0.0) {
    return 2;
  } else {
    return 0;
  }
  // these are absolutely equal impossible to choose

}


