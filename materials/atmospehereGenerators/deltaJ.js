import {dot, 
  clamp, Transmittance, 
  tableLookup,
  Irradiance, 
  texture4DGetter,
  mulS, vadd, vmul, vmul1,
  phaseFunctionMie, phaseFunctionRay,
} from './utils.js';

const sqrt = Math.sqrt;
const max = Math.max;
const cos = Math.cos;
const sin = Math.sin;
const exp = Math.exp;
const pow = Math.pow;
export function getDeltaJPixel(planetProps, transmittanceTexture, deltaETexture, deltaSRTexture, deltaSMTexture){

  let {HM, HR, betaR, betaMSca, radius, atmosphereHeight} = planetProps.phisical;
  let {resMu, resNu, resMus, resR} = planetProps;
  let transmittanceGetter = new Transmittance(transmittanceTexture, radius, atmosphereHeight, resMu, resR);
  let irradianceGetter = new Irradiance(deltaETexture, radius, atmosphereHeight, resMus, resR);
  const Rg = radius;
  const Rt = radius + atmosphereHeight;
  const dPhi = Math.PI / planetProps.InscatterSphericalSamples;
  const dTheta = Math.PI / planetProps.InscatterSphericalSamples;
  const deltaSR = tableLookup(texture4DGetter(deltaSRTexture, [resMus, resNu, resMu, resR],4), planetProps);
  const deltaSM = tableLookup(texture4DGetter(deltaSMTexture, [resMus, resNu, resMu, resR],4), planetProps);

  return (precalculations, iteration)=>{
    let {r,mu, muS, nu} = precalculations;
    let dj = deltaJ(r, mu, muS, nu, iteration)
    return [...dj, 0];

  }

  function deltaJ(r, mu, muS, nu, iteration){
    r = clamp(r, Rg, Rt);
    mu = clamp(mu, -1.0, 1.0);
    muS = clamp(muS, -1.0, 1.0);
    let nuDiff = sqrt(1.0 - mu * mu) * sqrt(1.0 - muS * muS);
    nu = clamp(nu, muS * mu - nuDiff, muS * mu + nuDiff);

    let v = [sqrt(1 - mu*mu), 0.0, mu];
    let sx = v[0] !== 0.0 ?(nu -muS*mu) /v[0]: 0.0; // zero division possibility
    let s = [sx, sqrt(max(0, 1 - sx*sx - muS*muS)), muS];

    let cosThetaMin = -sqrt(1.0 - (Rg / r) * (Rg / r));
    let result = new Float32Array([0,0,0]);
    for(let i = 0; i< planetProps.InscatterSphericalSamples; ++i){
      let theta = Math.PI * (i+0.5) /planetProps.InscatterSphericalSamples;
      let cosTheta = Math.cos(theta);

      let groundReflectance = 0.0;
      let dground = 0.0;
      let groundTransparency = [0,0,0];
      if (cosTheta < cosThetaMin) { // if ground visible in direction w
        groundReflectance = planetProps.AverageGroundReflectance / Math.PI;
        dground = -r * cosTheta - sqrt(r * r * (cosTheta * cosTheta - 1.0) + Rg * Rg);
        groundTransparency = transmittanceGetter.getTransmittance([Rg, -(r * cosTheta + dground) / Rg, dground]);
    if(isNaN(groundTransparency[0]) || isNaN(groundTransparency[1]) || isNaN(groundTransparency[2]))
       debugger;
      }
      for(let j = 0; j < 2*planetProps.InscatterSphericalSamples; ++j){
        let phi = Math.PI * j /(2*planetProps.InscatterSphericalSamples);
        let dw = dTheta * dPhi * sin(theta);
        let w = [cos(phi) * sin(theta), sin(phi) * sin(theta), cosTheta];
        let nu1 = dot(s, w);
        let nu2 = dot(v, w);
        let phaseRay2 = phaseFunctionRay(nu2);
        let phaseMie2 = phaseFunctionMie(nu2);

        let groundNormal = mulS(vadd([0,0,r], mulS(w, dground)), 1/Rg);
        let groundIrradiance = irradianceGetter.getIrradiance(Rg, dot(groundNormal, s));

        let raymie = mulS(vmul1(groundTransparency, groundIrradiance), groundReflectance);
        let dRayMie;
        if(iteration == 0){
          let phaseRayFirst = phaseFunctionRay(nu1);
          let phaseMieFirst = phaseFunctionMie(nu1);
          let ray = deltaSR([r, w[2], muS, nu1]);
          let mie = deltaSM([r, w[2], muS, nu1]);
          ray = mulS(ray, phaseRayFirst);
          mie = mulS(mie, phaseMieFirst);
          dRayMie = vadd(ray, mie);
        }else{
          dRayMie = deltaSR([r, w[2], muS, nu1]);
        }
        raymie[0] += dRayMie[0];
        raymie[1] += dRayMie[1];
        raymie[2] += dRayMie[2];
        let rK = exp(-(r - radius) / HR) * phaseRay2;
        let mK = exp(-(r - radius) / HM) * phaseMie2;
        let k = mulS(vadd(mulS(betaR, rK), mulS(betaMSca, mK)), dw);
        raymie[0] *= k[0];
        raymie[1] *= k[1];
        raymie[2] *= k[2];
        result[0] += raymie[0];
        result[1] += raymie[1];
        result[2] += raymie[2];
      }
    }
    if(isNaN(result[0]) || isNaN(result[1]) || isNaN(result[2]))
       debugger;
    return result;
  }
}

