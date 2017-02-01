export const ROUGH_GEOMETRY_READY = 'ROUGH_GEOMETRY_READY';

export function roughGeometryReady(){
  return {type:ROUGH_GEOMETRY_READY}
}

export const NEW_PART = 'NEW_PART';
export function newPart(withProps){
  return {type:NEW_PART, props: withProps}
}

export const CHANGE_INITIAL_PART_SETTING='CHANGE_INITIAL_PART_SETTING';
export function changeInitialPartSettings(prop, v){

  let value;
  if(typeof(v) == 'boolean') value=v;
  else value = parseFloat(v);

  return {type: CHANGE_INITIAL_PART_SETTING,
    prop, value
  }
}

export const LOAD_PART = 'LOAD_PART';
export function loadPart(){
  return {type:LOAD_PART}
}

export const HIDE_LIST = 'HIDE_LIST';
export function hideList(){
  return {type:HIDE_LIST}
}


