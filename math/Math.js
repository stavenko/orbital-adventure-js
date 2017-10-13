export function fact(n) {
  let F = 1;
  for (let i = n; i >= 1; --i) {
    F *= i;
  }
  return F;
}

export function toArray(type, fromArray) {
  const array = new type(fromArray.length);
  fromArray.forEach((v, i) => array[i] = v);
  return array;
}
