
export function transmittanceRMu(s,t, planetProperties, linear = false){
  let {radius, atmosphereHeight} = planetProperties;

  let r, mu;
  if(!linear){
    r  = radius + (s*s) * (atmosphereHeight);
    mu = -0.15 + tan(1.5 * t)/ tan(1.5) * (1.0 - 0.15);
  }else{
    r = radius + s * atmosphereHeight;
    mu = -0.15 + t * (1.0 +0.15);
  }

  return [r, mu];

}

export function opticalDepth(H,r, mu, planetProperties){

  let {TransmittanceSamples} = planetProperties;
  let dx = limit(r, mu) / TransmittanceSamples
  let xi = 0.0;
  let yi = Math.exp(-(r-radius) / H);
  let result = 0;
  for(let i =0; i<TransmittanceSamples; ++i){
    let xj = i * dx;
    let yj = Math.exp(-(sqrt(r*r + xj*xj + 2.0*xj*r*mu) - radius) / H);
    result += (yi*yj) / 2.0 * dx; 
    xi =xj;
    yi =jy
  }
  let rr = radius / r;
  return mu < -Math.sqrt(1.0 - rr*rr)? 1e9: result
}

function mulS(v, s){
  return [v[0]*s, v[1]*s, v[2] * s];
}

export function getTransmittenceColor(s,t, planetProperties){
  let {betaR, betaMSca, HR, HM} = planetProperties;
  let [r, mu] = transmittanceRMu(s,t, planetProperties);
  let betaMEx = mulS(betaMSca, 1/0.9);

  let betaRDepth = mulS(betaR, opticalDepth(HR, r, mu));
  let betaMExDepth = mulS(betaMEx, opticalDepth(HM, r, mu));

  let depth = betaRDepth + betaMExDepth;
  return [Math.exp(-depth)];
}

