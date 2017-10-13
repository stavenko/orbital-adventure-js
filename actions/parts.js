export const ROUGH_GEOMETRY_READY = 'ROUGH_GEOMETRY_READY';

export function roughGeometryReady() {
  return {type: ROUGH_GEOMETRY_READY};
}

export const NEW_PART = 'NEW_PART';
export function newPart(withProps) {
  return {type: NEW_PART, props: withProps};
}

export const CHANGE_INITIAL_PART_SETTING = 'CHANGE_INITIAL_PART_SETTING';
export function changeInitialPartSettings(prop, v) {

  let value;
  if (typeof (v) === 'boolean') {
    value = v;
  } else {
    value = parseFloat(v);
  }

  return {type: CHANGE_INITIAL_PART_SETTING,
    prop, value
  };
}

export const LOAD_PART = 'LOAD_PART';
export function loadPart() {
  return {type: LOAD_PART};
}

export const HIDE_LIST = 'HIDE_LIST';
export function hideList() {
  return {type: HIDE_LIST};
}


export const SPLIT_CURRENT_PART_S = 'SPLIT_CURRENT_PART_S';
export function splitCurrentPartAtS(s) {
  return {
    type: SPLIT_CURRENT_PART_S,
    at: s
  };
}
export const SPLIT_CURRENT_PART_T = 'SPLIT_CURRENT_PART_T';
export function splitCurrentPartAtT(t) {
  return {
    type: SPLIT_CURRENT_PART_T,
    at: t
  };
}

export const CHANGE_PART_POINTS = 'CHANGE_PART_POINTS';
export function changePartPoints(pointIndex) {
  return {
    type: CHANGE_PART_POINTS,
    pointIndex
  };
}

export const CREATE_CUTTING_PLANE = 'CREATE_CUTTING_PLANE';
export function createCuttingPlane(plane) {
  return {
    type: CREATE_CUTTING_PLANE,
    plane
  };
}

export const SELECT_PLANE = 'SELECT_PLANE';
export function selectPlane(plane) {
  return {
    type: SELECT_PLANE,
    plane
  };
}

export const CHANGE_PLANE = 'CHANGE_PLANE';
export function changePlane(ix, plane) {
  return {
    type: CHANGE_PLANE,
    plane, ix
  };
}

export const SELECT_MODE = 'SELECT_MODE';
export function selectMode(mode) {
  return {
    type: SELECT_MODE,
    mode
  };
}
