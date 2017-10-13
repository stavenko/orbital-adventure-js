export function patchToWeights(part, patch) {
  const weights = {};
  for ( const key in patch) {
    if (typeof (patch[key]) === 'string' && part.pointIndex[patch[key]]) {
      weights[key] = part.pointIndex[patch[key]].clone();
    } else {
      weights[key] = patch[key];
    }
  }
  
  return weights;
}

