
export function transmittanceRMu(s,t, planetProperties, linear = false){
  let radius = planetProperties.spatial.radius;
  let atmosphereHeight = planetProperties.phisical.atmosphereHeight;

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

function limit(r, mu, planetProperties) {
  let {atmosphereHeight} = planetProperties.phisical;
  let {radius} = planetProperties.spatial;
  let RL = radius + atmosphereHeight + 1e3;
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

export function opticalDepth(H,r, mu, planetProperties){

  let {TransmittanceSamples} = planetProperties;
  let {radius} = planetProperties.spatial;
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

function mulS(v, s){
  return [v[0]*s, v[1]*s, v[2] * s];
}

export function getTransmittenceColor(s,t, planetProperties, useFourPacking=false){
  let {phisical} = planetProperties;
  let {betaR, betaMSca, HR, HM} = phisical;
  let [r, mu] = transmittanceRMu(s,t, planetProperties);
  let betaMEx = mulS(betaMSca, 1/0.9);

  let betaRDepth = mulS(betaR, opticalDepth(HR, r, mu, planetProperties));
  let betaMExDepth = mulS(betaMEx, opticalDepth(HM, r, mu, planetProperties));

  let depth = [
    Math.exp(-(betaRDepth[0] + betaMExDepth[0])),
    Math.exp(-(betaRDepth[1] + betaMExDepth[1])),
    Math.exp(-(betaRDepth[2] + betaMExDepth[2])),0
  ];
  debugger;
  if(!useFourPacking)
    return depth;

  throw "Implement 4 component packing";
}

