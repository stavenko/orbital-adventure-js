export function fact(n){
  let F = 1;
  for(let i = n; i >= 1; --i){
    F*=i;
  }
  return F;
}

