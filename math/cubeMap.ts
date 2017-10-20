import {Vector3, Vector2} from 'three';
export default '';

enum Face {Top, Bottom, Left, Right, Near, Far };

export class CubeCoords {
  face: Face;
  st: Vector2;

  constructor(st:Vector2, f:Face) {
    if (Math.abs(st.x) > 1 || Math.abs(st.y) > 1) {
      throw new Error('face coordinates cannot be bigger than 1.0'); 
    }
    this.st = st;
    this.face = f;
  }
}

export function cube2Normal(c: CubeCoords): Vector3 {
  const ss = c.st.x; // * 2.0 - 1.0;
  const tt = c.st.y; // * 2.0 - 1.0;
  const face = c.face;

  if (face == 0) {
    return new Vector3(-1.0, -tt, ss).normalize();
  }// back
  if (face == 1) {
    return new Vector3(ss, -1.0, -tt).normalize();
  } // left
  if (face == 2) {
    return new Vector3(1.0, -tt, -ss).normalize();
  } // front
  if (face == 3) {
    return new Vector3(ss, 1.0, tt).normalize();
  } // right
  if (face == 4) {
    return new Vector3(ss, -tt, 1.0).normalize();
  } // top
  if (face == 5) {
    return new Vector3(-ss, -tt, -1.0).normalize();
  } // bottom
  return new Vector3();
}

export function normal2Cube(v:Vector3):CubeCoords {
  const face = determineFace(v);
  const st = getFaceCoords(v, face);
  return new CubeCoords(st, face);
}

export function getFaceBasis(f: number):[Vector3, Vector3, Vector3] {
  const abs = Math.abs;
  const px = new Vector3(1, 0, 0);
  const nx = new Vector3(-1, 0, 0);
  const py = new Vector3(0, 1, 0);
  const ny = new Vector3(0, -1 , 0);
  const pz = new Vector3(0, 0,  1);
  const nz = new Vector3(0, 0, -1);
  if (f == 2) {
    return [nz.clone(), ny.clone(), px.clone()];
  } // +x
  if (f == 0) {
    return [pz.clone(), ny.clone(), nx.clone()];
  } 

  if (f == 4) {
    return [px.clone(), ny.clone(), pz.clone()];
  } // +z
  if (f == 5) {
    return [nx.clone(), ny.clone(), nz.clone()];
  } 

  if (f == 3) {
    return [nx.clone(), pz.clone(), py.clone()];
  } // +y
  if (f == 1) {
    return [nx.clone(), nz.clone(), ny.clone()];
  } 

  throw new Error(`Wrong face number: ${f}`);
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


