export function patchToWeights(part, patch){
  let weights = {};
  for( let key in patch){
    if(typeof(patch[key])=='string' && part.pointIndex[patch[key]])
      weights[key] = part.pointIndex[patch[key]].clone();
    else weights[key] = patch[key];
  }
  
  return weights;
}

