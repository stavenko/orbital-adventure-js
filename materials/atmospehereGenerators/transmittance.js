import {mulS, limit} from './utils.js';

export function transmittanceRMu(t,s, planetProperties, linear = false){
  let radius = planetProperties.phisical.radius;
  let atmosphereHeight = planetProperties.phisical.atmosphereHeight;

  if(radius  === undefined)
    debugger;
  let r, mu;
  if(!linear){
    r  = radius + (s*s) * (atmosphereHeight);
    mu = -0.15 + Math.tan(1.5 * t)/Math.tan(1.5) * (1.0 - 0.15);
  }else{
    r = radius + s * atmosphereHeight;
    mu = -0.15 + t * (1.0 +0.15);
  }

  return [r, mu];

}


export function opticalDepth(H,r, mu, planetProperties){

  let {TransmittanceSamples} = planetProperties;
  let {radius} = planetProperties.phisical;
  let dx = limit(r, mu, planetProperties) / TransmittanceSamples
  let xi = 0.0;
  let yi = Math.exp(-(r-radius) / H);
  let result = 0;

  for(let i =0; i < TransmittanceSamples; ++i){
    let xj = i * dx;
    let yj = Math.exp(-(Math.sqrt(r*r + xj*xj + 2.0*xj*r*mu) - radius) / H);
    result += (yi*yj) / 2.0 * dx; 
    xi =xj;
    yi =yj
  }
  let rr = radius / r;
  return mu < -Math.sqrt(1.0 - rr*rr)? 1e9: result
}


export function getTransmittenceColor({s,t}, planetProperties, useFourPacking=false){
  let {phisical} = planetProperties;
  let {betaR, betaMSca, HR, HM} = phisical;
  let [r, mu] = transmittanceRMu(s,t, planetProperties);
  let betaMEx = mulS(betaMSca, 1/0.9);
  let od1 = opticalDepth(HR, r, mu, planetProperties)
  let od = opticalDepth(HM, r, mu, planetProperties)


  let betaRDepth = mulS(betaR, opticalDepth(HR, r, mu, planetProperties));
  let betaMExDepth = mulS(betaMEx, opticalDepth(HM, r, mu, planetProperties));

  let depth = [
    Math.exp(-(betaRDepth[0] + betaMExDepth[0])),
    Math.exp(-(betaRDepth[1] + betaMExDepth[1])),
    Math.exp(-(betaRDepth[2] + betaMExDepth[2])),0
  ];

  if(!useFourPacking)
    return depth;

  throw "Implement 4 component packing";
}

