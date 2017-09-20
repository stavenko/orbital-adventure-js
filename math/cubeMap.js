const abs = Math.abs;
const pow = Math.pow;
const floor = Math.floor;

export function vec2(x, y){
  const v = [x, y];
  Object.defineProperty(v, 'x', { get:() => v[0] });
  Object.defineProperty(v, 'y', { get:() => v[1] });
  Object.defineProperty(v, 'len', { get:() => Math.sqrt(v[0] * v[0] + v[1] * v[1]) });
  v.multiplyScalar = (s) => multiplyScalar2(v, s);
  v.add = v1 => add2(v, v1);
  v.sub = v1 => sub2(v, v1);
  v.normalize = () => normalize(v);
  return v;
}

export function vec3(x = 0.0, y = 0.0, z =0.0){
  const v = [x,y,z];
  Object.defineProperty(v, 'x', { get:() => v[0] })
  Object.defineProperty(v, 'y', { get:() => v[1] })
  Object.defineProperty(v, 'z', { get:() => v[2] })
  Object.defineProperty(v, 'len', { get:() => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) })
  v.multiplyScalar = s => multiplyScalar3(v, s);
  v.add = s => add3(v, s);
  v.mul = s => mul3(v, s);
  v.sub = s => sub3(v, s);
  v.div = s => dib3(v, s);
  v.normalize = () => normalize(v);
  v.cross = v1 => cross(v, v1);
  return v;
}

function cross(v1, v){
  const [x,y,z] = v1;
  const xx = y * v.z - z * v.y;
  const yy = z * v.x - x * v.z;
  const zz = x * v.y - y * v.x;
  return vec3(xx, yy, zz);
}

function normalize(v){
  const s = 1 / v.len;
  return v.multiplyScalar(s);
}

function multiplyScalar2(v, s){
  return vec2(v.x * s, v.y * s);
}
function multiplyScalar2(v, s){
  return vec2(v.x * s, v.y * s);
}

function multiplyScalar3(v, s){
  return vec3(v.x * s, v.y * s, v.z * s);
}

function sub2(v1, v2){
  return vec2(v1.x - v2.x, v1.y - v2.y);
}

function sub3(v1, v2){
  return vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
}

function add2(v1, v2){
  return vec2(v1.x + v2.x, v1.y + v2.y);
}

function add3(v1, v2){
  return vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
}

function mul2(v1, v2){
  return vec2(v1.x * v2.x, v1.y * v2.y);
}

function mul3(v1, v2){
  return vec3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
}

function div2(v1, v2){
  return vec2(v1.x / v2.x, v1.y / v2.y);
}

function div3(v1, v2){
  return vec3(v1.x / v2.x, v1.y / v2.y, v1.z / v2.z);
}

export function st2uv(v){
  return vec2(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
}

export function uv2st(v){
  return vec2(v.x * 2 - 1, v.y * 2 - 1);
}

export function determineFace(n){
  const ax = abs(n.x);
  const ay = abs(n.y);
  const az = abs(n.z);

  if(ay > ax && ay > az){
    if(n.y > 0.0) return 3;
    else return 1;
  } 

  if(ax > ay && ax > az){
    if(n.x > 0.0) return 2;
    else return 0;
  }

  if(az > ay && az > ax){
    if(n.z > 0.0) return 4;
    else return 5;
  }
  console.warn('select any');

  if(n.x > 0.0) return 2;
  else return 0;
  
  // these are absolutely equal impossible to choose
}

export function st2Normal(st, face){
  const ss = st.x; // * 2.0 - 1.0;
  const tt = st.y; // * 2.0 - 1.0;

  if(face == 0) return vec3(-1.0, -tt, ss);// back
  if(face == 1) return vec3(ss, -1.0, -tt); // left
  if(face == 2) return vec3(1.0, -tt,-ss); // front
  if(face == 3) return vec3(ss,  1.0, tt); // right
  if(face == 4) return vec3(ss, -tt, 1.0); // top
  if(face == 5) return vec3(-ss, -tt, -1.0); // bottom
  return vec3();
}


export function getSt(n, f){
  n = vec3(...n);
  if(f == 2) return vec2(-n.z/ abs(n.x), -n.y/abs(n.x)); // +x
  if(f == 0) return vec2(n.z/ abs(n.x), -n.y/abs(n.x)); 

  if(f == 4) return vec2(n.x/ abs(n.z), -n.y/abs(n.z)); // +z
  if(f == 5) return vec2(-n.x/ abs(n.z), -n.y/abs(n.z)); 

  if(f == 3) return vec2(n.x/ abs(n.y), n.z/abs(n.y)); // +y
  if(f == 1) return vec2(n.x/ abs(n.y), -n.z/abs(n.y)); 
  throw new Error("Wrong face number", f);
}

export function findTile(st,  lod){
  const division = pow(2.0, lod);
  
  const J = floor(st[0] * division);
  const I = floor(st[1] * division);
  return vec2(J,I);
}

export function calculateTile(tileCoords, lod){
  const division = pow(2.0, lod);
  const tile = tileCoords[1] * division + tileCoords[0];
  return tile;

}

export function tileMath(){
  const b = 1.001;
  const B = 1.002;
  for(let i = 0; i < 6; ++i){
    console.log('face', i);

    const pouz  = [vec2(b, 0), vec2(B, 0)];
    console.log('positive overflow U, zero V');
    printNewCoords(pouz, i);

    const pouo  = [vec2(b, 1), vec2(B, 1)];
    console.log('positive overflow U, 1 - V');
    printNewCoords(pouo, i);

    const nouz  = [vec2(-0.001, 0), vec2(-0.002, 0)];
    console.log('negative overflow U, zero V');
    printNewCoords(nouz, i);

    const nouo  = [vec2(-.001, 1), vec2(-.002, 1)];
    console.log('negative overflow U, 1 - V');
    printNewCoords(nouo, i);





    const povz  = [...pouz].map(l => l.reverse());
    console.log('positive overflow V, zero U');
    printNewCoords(povz, i);


    const povo  = [...pouo].map(l => l.reverse());
    console.log('positive overflow V, 1 - U');
    printNewCoords(povo, i);

    const novz  = [...nouz].map(l => l.reverse());
    console.log('negative overflow V, zero U');
    printNewCoords(novz, i);

    const novo  = [...nouo].map(l => l.reverse());
    console.log('positive overflow V, 1 - U');
    printNewCoords(novo, i);
  }

  function printNewCoords(v, face){
    for (let i = 0; i < v.length; ++i) {
      const st = uv2st(v[i]);
      const n = st2Normal(st, face);
      const newFace = determineFace(n);
      const newSt = getSt(n, newFace);
      const newUV = st2uv(newSt);
      console.log('new face', newFace,[...v[i]], [...newUV] );
    }
  }
}
