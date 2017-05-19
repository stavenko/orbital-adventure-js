import FMath from 'fmath';

const Tan126 = Math.tan(1.26*1.1);
const sqrt = Math.sqrt;
const atan = Math.atan;
const max = Math.max;
const cos = Math.cos;
const sin = Math.sin;
const exp = Math.exp;
const pow = Math.pow;
const mieG = 0.8;

let FM = new FMath();

export function phaseFunctionRay(mu) {
  return (3.0 / (16.0 * Math.PI)) * (1.0 + mu * mu);
}

// Mie phase function
export function phaseFunctionMie(mu) {
  return 1.5 * 1.0 / (4.0 * Math.PI) * (1.0 - mieG*mieG) * pow(1.0 + (mieG*mieG)
  - 2.0*mieG*mu, -3.0/2.0) * (1.0 + mu * mu) / (2.0 + mieG*mieG);
}

export function vNan(v){
  for(let c =0;c <v.length; ++c){
    if(isNaN(v[c])) return true;
  }
  return false;
}

export function mulS(v, s){
  return [v[0]*s, v[1]*s, v[2] * s];
}

export function clamp(v, m, M){
  return Math.min(Math.max(v,m), M);
}

export function dot(v1, v2){
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];


}
export function vadd(v1,v2){
  let r = new Float32Array(3);
  r[0] = v1[0] + v2[0],
  r[1] = v1[1] + v2[1],
  r[2] = v1[2] + v2[2]
  return r;
}

export function vmul4(to, v1,v2){
  to[0] = v1[0] * v2[0];
  to[1] = v1[1] * v2[1];
  to[2] = v1[2] * v2[2];
  to[3] = v1[3] * v2[3];

}
export function vmul(to, v1,v2){
  to[0] = v1[0] * v2[0];
  to[1] = v1[1] * v2[1];
  to[2] = v1[2] * v2[2];
}
export function vmul1( v1,v2){
  let to = new Float32Array(3);
  to[0] = v1[0] * v2[0];
  to[1] = v1[1] * v2[1];
  to[2] = v1[2] * v2[2];
  return to;
}
export function vdiv(v1,v2){
  let r = new Float32Array(3);
  r[0] = v1[0] == 0.0? 0: v1[0] / v2[0],
  r[1] = v1[1] == 0.0? 0: v1[1] / v2[1],
  r[2] = v1[2] == 0.0? 0: v1[2] / v2[2]
  return r;
}

export function vmin(v1,v2){
  return [
    Math.min(v1[0], v2[0]),
    Math.min(v1[1], v2[1]),
    Math.min(v1[2], v2[2])
  ]
}

const TAN15= Math.tan(1.5);
const K = TAN15 / 1.15;

let STORE = new Map;

/*
vec4 texture4D(sampler3D table, float r, float mu, float muS, float nu)
{
    float H = sqrt(Rt * Rt - Rg * Rg);
    float rho = sqrt(r * r - Rg * Rg);
#ifdef INSCATTER_NON_LINEAR
    float rmu = r * mu;
    float delta = rmu * rmu - r * r + Rg * Rg;
    vec4 cst = rmu < 0.0 && delta > 0.0 ? vec4(1.0, 0.0, 0.0, 0.5 - 0.5 / float(RES_MU)) : vec4(-1.0, H * H, H, 0.5 + 0.5 / float(RES_MU));
	float uR = 0.5 / float(RES_R) + rho / H * (1.0 - 1.0 / float(RES_R));
    float uMu = cst.w + (rmu * cst.x + sqrt(delta + cst.y)) / (rho + cst.z) * (0.5 - 1.0 / float(RES_MU));
    // paper formula
    //float uMuS = 0.5 / float(RES_MU_S) + max((1.0 - exp(-3.0 * muS - 0.6)) / (1.0 - exp(-3.6)), 0.0) * (1.0 - 1.0 / float(RES_MU_S));
    // better formula
    float uMuS = 0.5 / float(RES_MU_S) + (atan(max(muS, -0.1975) * tan(1.26 * 1.1)) / 1.1 + (1.0 - 0.26)) * 0.5 * (1.0 - 1.0 / float(RES_MU_S));
#else
	float uR = 0.5 / float(RES_R) + rho / H * (1.0 - 1.0 / float(RES_R));
    float uMu = 0.5 / float(RES_MU) + (mu + 1.0) / 2.0 * (1.0 - 1.0 / float(RES_MU));
    float uMuS = 0.5 / float(RES_MU_S) + max(muS + 0.2, 0.0) / 1.2 * (1.0 - 1.0 / float(RES_MU_S));
#endif
    float lerp = (nu + 1.0) / 2.0 * (float(RES_NU) - 1.0);
    float uNu = floor(lerp);
    lerp = lerp - uNu;
    return texture3D(table, vec3((uNu + uMuS) / float(RES_NU), uMu, uR)) * (1.0 - lerp) +
           texture3D(table, vec3((uNu + uMuS + 1.0) / float(RES_NU), uMu, uR)) * lerp;
}

*/
export function tableLookup(getter, planetProps){
  let {radius, atmosphereHeight} = planetProps.phisical;
  let {resR, resMu, resNu, resMus} = planetProps;
  let Rg = radius;
  let Rt = radius + atmosphereHeight;
  return ([r, mu, muS, nu])=>{
    let H = sqrt(Rt* Rt - Rg*Rg);
    let rho = 0;
    if(r >= Rg) rho = sqrt(r*r - Rg*Rg);

    let rmu = r * mu;
    let delta = rmu * rmu - r * r + Rg * Rg;
    let cst = rmu < 0.0 && delta > 0.0 
      ? [1.0, 0.0, 0.0, 0.5 - 0.5 / resMu] 
      : [-1.0, H * H, H, 0.5 + 0.5 / resMu];

    let uR = 0.5 / resR + rho / H * (1 - 1 / resR);

    let uMu_ = cst[3] + (rmu * cst[0] + sqrt(delta + cst[1])) / (rho + cst[2]) * (0.5 - 1.0 / resMu);
    let uMu = clamp(uMu_, 0.0, 1.0);
    if(isNaN(uMu)) uMu = 0.0;
    // paper formula
    // float uMuS = 0.5 / float(RES_MU_S) + max((1.0 - exp(-3.0 * muS - 0.6)) / (1.0 - exp(-3.6)), 0.0) * (1.0 - 1.0 / float(RES_MU_S));
    // better formula
    let uMus = 0.5 / resMus 
      + (atan(max(muS, -0.1975) * Tan126) / 1.1 + (1.0 - 0.26)) * 0.5 * (1.0 - 1.0 / resMus);

     
    let lerp = (nu + 1.0) / 2.0 * (resNu - 1.0);
    let uNu = Math.max((lerp ) / resNu, 0.0);
    if(uMus < 0 || uNu < 0 || uMu < 0 || uR < 0 || uMus > 1 || uNu > 1 || uMu > 1 || uR > 1 ||isNaN(uMus) || isNaN(uNu) || isNaN(uMu) || isNaN(uR)){
      console.log([uMus, uNu, uMu, uR]);
      if(isNaN(uMu)){
        console.log('umu', uMu_, cst, rmu, delta, rho, resMu);
      }
      debugger;
    }

    return getter([uMus, uNu, uMu, uR]);

  }
}

export function texture4DGetter(texture, dimensions, components){
  let b = new Float32Array(4);
  return coords=>{
    vmul4(b, coords, dimensions);
    let i = Math.floor(b[0]);
    let j = Math.floor(b[1]);
    let k = Math.floor(b[2]);
    let r = Math.floor(b[3]);
    let X = i*dimensions[1] + j;
    let XX = X * dimensions[2]  + k
    let ix =  components * (XX * dimensions[3] + r);
    let color = texture.subarray(ix, ix+components);
    if(color.length < components)
      debugger;

    return color;
  }

}
export class Irradiance{
  constructor(texture, radius, atmosphereHeight, resMus, resR){
    this.texture = texture;
    this.resMus = resMus;
    this.resR = resR;
    this.radius = radius;
    this.atmosphereHeight = atmosphereHeight;
  }

  getIrradianceIx(uv){
    let W = this.resMus / 2;
    let H = this.resR * 2;
    let c0 = Math.min(Math.abs(Math.floor(uv[0]) * H), H-1);
    let c1 = Math.min(Math.abs(Math.floor(uv[1]) * W), W-1);
    return 4 * (c0 * W + c1);
  }

  getIrradianceUV(r, muS){
    let ur = (r -this.radius) / this.atmosphereHeight;
    let umus = (muS + 0.2) / 1.2
    return [umus, ur];
  }

  getIrradiance(r, mu) {
    let uv = this.getIrradianceUV(r,mu);
    let ix = this.getIrradianceIx(uv);
    let color = this.texture.subarray(ix, ix+3);
    return color;

  }
}

export class Transmittance{
  constructor(texture, radius, atmosphereHeight, resMu, resR, linear=false){
    this.texture = texture;
    this.atmosphereHeight = atmosphereHeight;
    this.radius = radius;
    this.linear = linear;
    this.resMu = resMu;
    this.resR = resR;
  }

  getTransmittance(arr){
    let v = null
    if(arr.length == 2) v = this.getTransmittanceRMU(arr);
    if(arr.length == 3) v = this.getTransmittanceRMUD(arr);
    return v;
  }

  getTransmittanceIx(uv){
    let W = this.resMu * 2;
    let H = this.resR * 2;
    let i = Math.min(Math.abs(Math.floor(uv[0] * W)), W-1);
    let j = Math.min(Math.abs(Math.floor(uv[1] * H)), H-1);
    return 4 * (j * W + i);

  }

  getTransmittanceRMU([r,mu]){
    let __t = Date.now();
    let uv = this.getTransmittenceUV(r,mu, this.radius, this.atmosphereHeight);
    let ix = this.getTransmittanceIx(uv);
    let color = this.texture.subarray(ix, ix+3);
    return color;
  }

  getTransmittanceRMUD([r, mu, d]){
    let _rSQR = r*r;
    let r1 = Math.sqrt(_rSQR + d*d  + 2*r*mu*d);
    let mu1 = (r*mu + d) / r1;
    if(mu > 0){
      let t1 = this.getTransmittanceRMU([r, mu]);
      let t2 = this.getTransmittanceRMU([r1,mu1]);
      return vmin( vdiv(t1, t2), [1,1,1]);
    }else{
      let t1 = this.getTransmittanceRMU([r1, -mu1]);
      let t2 = this.getTransmittanceRMU([r,-mu]);
      return vmin( vdiv(t1, t2), [1,1,1]);
    }
  }
  getTransmittenceUV(r, mu){
    let uR = 0, uMu;
    let Rg = this.radius;
    let Rt = Rg + this.atmosphereHeight;
    if(!this.linear){
      
      if(r >= Rg) 
        uR = Math.sqrt((r - Rg) / this.atmosphereHeight);
      uMu = Math.atan((mu + 0.15) * K) / 1.5;
    }else{
      if(r >= Rg) 
        uR = (r - Rg) / (Rt - Rg);
      uMu = (mu + 0.15) / (1.15);
    }
    return [uMu, uR];
  }
}


export function limit(r, mu, planetProperties) {
  let {atmosphereHeight, radius} = planetProperties.phisical;
  let RL = radius + atmosphereHeight + 1;
  let Rg = radius;

  let dout = -r * mu + Math.sqrt(r * r * (mu * mu - 1.0) + RL * RL);

  let delta2 = r * r * (mu * mu - 1.0) + Rg * Rg;
  if (delta2 >= 0.0) {
    let din = -r * mu - Math.sqrt(delta2);
    if (din >= 0.0) {
      dout = Math.min(dout, din);
    }
  }
  return dout;
}

export function precalculateR(planetProps) {
  let {radius, atmosphereHeight, HR, betaR} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  return (k, count) => {
    let Rt = radius + atmosphereHeight;
    let _radiusSQR = radius * radius;
    let dr = (k == 0)
      ?0.01
      :(k==(count-1))
        ?-0.001
        :0.0;
    
    let w = k / (count-1);
    let r = Math.sqrt(_radiusSQR + w*w*(Rt*Rt - _radiusSQR)) + dr;
    let _rSQR = r*r;
    let dmin = Rt - r;
    let dmax = Math.sqrt(_rSQR - _radiusSQR) + Math.sqrt(Rt*Rt - _radiusSQR);
    let dminp = r-radius;
    let dmaxp = Math.sqrt(_rSQR - _radiusSQR);
    return {w, r, dmin, dmax, dminp, dmaxp, _rSQR, _radiusSQR}
  }
}

export function calculateMu(planetProps){
  let {radius, atmosphereHeight, HR, betaR} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let Rt = radius + atmosphereHeight;

  return (k, depth, precalculations) => {
    let {dmin, dmax, dminp, dmaxp, r} = precalculations;
    let y = k - 0.5;
    let mu;
    let _q = resMu / 2 - 1.0
    if(y < resMu / 2){
      let d = 1 - y / _q;
      d = Math.min(Math.max(dminp, d*dmaxp), dmaxp * 0.999);
      mu = (radius*radius - r*r - d*d) / (2*r*d);
      mu = Math.min(mu, -Math.sqrt(1.0 - Math.pow(radius/r, 2)) - 0.001);
    }else {
      let d = (y - resMu/2) / _q;
      d = Math.min(Math.max(dmin, d*dmax), dmax * 0.999);
      mu = (Rt*Rt - r*r - d*d) / (2*r*d);
    }
    return {mu};
  }
}

export function calculateMuS(planetProps){
  let {resMus} = planetProps;
  return (i, width, pre)=>{
    let x = i - 0.5;
    let muS = x / (resMus-1);
    muS = Math.tan((2 * muS -1 + 0.26)*1.1)/Tan126;
    return {muS}
  }
}
export function calculateNu(planetProps){
  let {resNu} = planetProps;
  return (k, depth, pre)=>{
    let z = k -0.5;
    let nu = -1.0 + z / (resNu - 1) * 2;
    return {nu};
  }
}

export const precalcs = {
  count: precalculateR,
  width: calculateMuS,
  height: calculateNu,
  depth: calculateMu
}
