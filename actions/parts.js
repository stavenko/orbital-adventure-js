export const NEW_PART = 'NEW_PART';

export function newPart(withProps){
  return {type:NEW_PART, props: withProps}
}

export const LOAD_PART = 'LOAD_PART';
export function loadPart(){
  return {type:LOAD_PART}
}

export const HIDE_LIST = 'HIDE_LIST';
export function hideList(){
  return {type:HIDE_LIST}
}


