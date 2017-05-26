import {vNan, limit, Transmittance, 
  texture4DGetter,
  tableLookup,
  phaseFunctionRay,
  vadd,
  mulS, vmul, vmul1} from './utils.js';


let getTransmittanceTime = 0;
let getTransmittanceCalls = 0;
const sqrt = Math.sqrt;
const max = Math.max;
const cos = Math.cos;
const sin = Math.sin;
const exp = Math.exp;
const pow = Math.pow;

export const Stats = {
  resetStats: function(){
    getTransmittanceTime = 0
  },
  getStats(){
    return {getTransmittanceTime, getTransmittanceCalls}
  }
}

function vec3(x,y,z){
  return new Float32Array([x,y,z]);
}

export function getDeltaSRCopier(planetProps, deltaSRTexture){
  let {radius, atmosphereHeight} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let deltaSRGetter = tableLookup(texture4DGetter(deltaSRTexture, [resMus, resNu, resMu, resR],4), planetProps);

  return (precalculations)=>{
    let {r,mu, muS, nu} = precalculations;
    let pixel = deltaSRGetter([r, mu, muS, nu]);
    let phase = phaseFunctionRay(nu);
    pixel = [
      pixel[0] / phase,
      pixel[1] / phase,
      pixel[2] / phase,
    ]
    return [...pixel, 0];
  }

}

export function getDeltaSRIterativeColor(planetProps, transmittanceTexture, deltaJTexture){
  let {radius, atmosphereHeight} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let buffer = new Float32Array(3);
  let deltaJ = tableLookup(texture4DGetter(deltaJTexture, [resMus, resNu, resMu, resR],4), planetProps);
  let transmittanceGetter = new Transmittance(transmittanceTexture, radius, atmosphereHeight, resMu, resR);
  return (precalculations, iteration)=>{
    let {r,mu, muS, nu} = precalculations;
    let raymie = inscatter(r,mu,muS, nu);
    return raymie;
  }


  function integrand(r, mu, muS, nu, t){
    let ri = sqrt(r * r + t * t + 2.0 * r * mu * t);
    let mui = (r * mu + t) / ri;
    let muSi = (nu * t + muS * r) / ri;
    let dj =  deltaJ([ri, mui, muSi, nu])
    if(dj.length < 3) debugger; //  "dj is empty";
    let tr = transmittanceGetter.getTransmittance([r, mu, t]);
    let integr =  vmul1(dj, tr);
    if(vNan(integr)) debugger;
    return integr;
  }

  function inscatter(r,mu, muS, nu){
		let raymie = vec3(0, 0, 0);
    let dx = limit(r, mu, planetProps) / planetProps.InscatterIntegralSamples;
    let xi = 0.0;
    let raymiei = integrand(r, mu, muS, nu, 0.0);
    for (let i = 1; i <= planetProps.InscatterIntegralSamples; ++i) {
      let xj = i * dx;
      let raymiej = integrand(r, mu, muS, nu, xj);
      let rmij = mulS(vadd(raymiei, raymiej), 1/2*dx);

      raymie[0] += rmij[0];
      raymie[1] += rmij[1];
      raymie[2] += rmij[2];
      xi = xj;
      raymiei = raymiej;
    }
    return [...raymie, 0];
  }
}

export function getDeltaSMieColor(planetProps, transmittanceTexture){
  let {HM, HR, betaR, betaMSca, radius, atmosphereHeight} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let ray = new Float32Array(4);
  let rayI = new Float32Array(3);
  let rayJ = new Float32Array(3);
  let transmittanceRes = new Float32Array(3);
  let transmittanceGetter = new Transmittance(transmittanceTexture, radius, atmosphereHeight, resMu, resR);

  return precalculations=>{
    let {r,mu, muS, nu} = precalculations;
    let mie = inscatter(r, mu, muS, nu, HM, betaMSca)
    if(vNan(mie)) debugger;
    return mie;
  }

  function deltaRay(ray, r, mu, muS, nu, H, t){
    let _radiusSQR = radius * radius;
    let ri = Math.sqrt(r*r + t*t + 2*r*mu*t);
    let muSi = (nu*t + muS *r) / ri;
    ri = Math.max(radius, ri);
    if(muSi >= -Math.sqrt(1 - _radiusSQR / (ri*ri))){
      let t1 = transmittanceGetter.getTransmittance([r,mu,t]);
      let t2 = transmittanceGetter.getTransmittance([ri,muSi]);
      vmul(ray, t1, t2);
      let c = Math.exp(-(ri - radius)/H)
      ray[0] *= c;
      ray[1] *= c;
      ray[2] *= c;
    }else{
      ray[0] = 0;
      ray[1] = 0;
      ray[2] = 0;
    }
  }

  function inscatter(r,mu, muS, nu, H, color){

    let dx = limit(r, mu, planetProps) / planetProps.InscatterIntegralSamples;
    let xi = 0;
    ray[0] = rayI[0] = rayJ[0] = 0;
    ray[1] = rayI[1] = rayJ[1] = 0;
    ray[2] = rayI[2] = rayJ[2] = 0;

    deltaRay(rayI, r, mu, muS, nu, H,  0.0);

    for(let i = 1; i< planetProps.InscatterIntegralSamples; ++i){
      let xj = i * dx;
      deltaRay(rayJ, r, mu, muS,  nu, H, xj);
      ray[0] += (rayI[0] + rayJ[0]) / 2 * dx;
      ray[1] += (rayI[1] + rayJ[1]) / 2 * dx;
      ray[2] += (rayI[2] + rayJ[2]) / 2 * dx;
      rayI[0] = rayJ[0];
      rayI[1] = rayJ[1];
      rayI[2] = rayJ[2];
    }
    ray[0] *= color[0];
    ray[1] *= color[1];
    ray[2] *= color[2];
    return ray;
  }
}

export function getDeltaSRayColor(planetProps, transmittanceTexture){
  let {HM, HR, betaR, betaMSca, radius, atmosphereHeight} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let ray = new Float32Array(4);
  let rayI = new Float32Array(3);
  let rayJ = new Float32Array(3);
  let transmittanceRes = new Float32Array(3);
  let transmittanceGetter = new Transmittance(transmittanceTexture, radius, atmosphereHeight, resMu, resR);

  return precalculations=>{
    let {r,mu, muS, nu} = precalculations;
    let rayleigh = inscatter(r, mu, muS, nu, HR, betaR);
    if(vNan(rayleigh)) debugger;
    return rayleigh;
  }
  function deltaRay(ray, r, mu, muS, nu, H, t){
    let _radiusSQR = radius * radius;
    let ri = Math.sqrt(r*r + t*t + 2*r*mu*t);
    let muSi = (nu*t + muS *r) / ri;
    ri = Math.max(radius, ri);
    if(muSi >= -Math.sqrt(1 - _radiusSQR / (ri*ri))){
      let t1 = transmittanceGetter.getTransmittance([r,mu,t]);
      let t2 = transmittanceGetter.getTransmittance([ri,muSi]);

      vmul(ray, t1, t2);
      let c = Math.exp(-(ri - radius)/H)
      ray[0] *= c;
      ray[1] *= c;
      ray[2] *= c;
    }else{
      ray[0] = 0;
      ray[1] = 0;
      ray[2] = 0;
    }
  }

  function inscatter(r,mu, muS, nu, H, color){

    let dx = limit(r, mu, planetProps) / planetProps.InscatterIntegralSamples;
    let xi = 0;
    ray[0] = rayI[0] = rayJ[0] = 0;
    ray[1] = rayI[1] = rayJ[1] = 0;
    ray[2] = rayI[2] = rayJ[2] = 0;

    deltaRay(rayI, r, mu, muS, nu, H,  0.0);

    for(let i = 1; i< planetProps.InscatterIntegralSamples; ++i){
      let xj = i * dx;
      deltaRay(rayJ, r, mu, muS,  nu, H, xj);
      ray[0] += (rayI[0] + rayJ[0]) / 2 * dx;
      ray[1] += (rayI[1] + rayJ[1]) / 2 * dx;
      ray[2] += (rayI[2] + rayJ[2]) / 2 * dx;
      rayI[0] = rayJ[0];
      rayI[1] = rayJ[1];
      rayI[2] = rayJ[2];
    }
    ray[0] *= color[0];
    ray[1] *= color[1];
    ray[2] *= color[2];
    return ray;
  }
}
