import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';
import * as RotationalShape from '../math/RotationalShape.js'

const initialPartConfig = {
  length:1,
  radius: 0.23,
  lengthSegments: 2,
  radialSegments: 4,
  topCone: true,
  topConeLength: 0.33,
  bottomCone: false,
  bottomConeLength: 0.33,
  type: 'rotational',
  orientation: 'path-tangent'
}
const createInitialNewPart = state => ({
  id:Date.now().toString(36),
  type: 'rotational',


});
const initialState = fromJS({
  editorState:{
    symmetryMode: null, // {'type': ['plane', 'point'], 'amount': [2-10] 
                        // in case of point} or null, if no symmetry
  }
});

export function partsEditor(state = initialState, action){
  switch(action.type){
    case A.NEW_PART:
      let {props} = action;

      let newPart = {
        shape:Object.assign({},initialPartConfig), 
        calculated: RotationalShape.createRotationalShape(initialPartConfig),
        stage:'rough'
      };

      return state.set('currentPart', fromJS(newPart));
    case A.ROUGH_GEOMETRY_READY:
      return state.setIn(['currentPart','stage'], 'precise');
    case A.LOAD_PART:
      return state.set('showLoadUI', true);
    case A.CHANGE_INITIAL_PART_SETTING: {
      let shape = state.getIn(['currentPart', 'shape']).toJS();
      shape[action.prop] = action.value;
      state = state.setIn(['currentPart', 'shape'], fromJS(shape));
      let calculated = RotationalShape.createRotationalShape(shape);
      return state.setIn(['currentPart', 'calculated'], fromJS(calculated));
    }
    case A.SPLIT_CURRENT_PART_S:{
      let part = state.get('currentPart').toJS();
      let calculated = RotationalShape.splitPartAtS(part.calculated, action.at);
      return state.setIn(['currentPart', 'calculated'], fromJS(calculated));
    }
    case A.SPLIT_CURRENT_PART_T:{
      let part = state.get('currentPart').toJS();
      let calculated = RotationalShape.splitPartAtT(part.calculated, action.at);
      return state.setIn(['currentPart', 'calculated'], fromJS(calculated));
    }
    case A.CHANGE_PART_POINTS:{
      let part = state.get('currentPart').toJS();
      part.calculated.pointIndex = action.pointIndex;
      return state.setIn(['currentPart', 'calculated'], fromJS(part.calculated));
    }
    case A.SELECT_MODE:{
      return state.setIn(['editorState', 'mode'], action.mode);
    }
    case A.SELECT_PLANE:{
      return state.setIn(['editorState', 'selectedPlane'], action.plane);
    }
    case A.CREATE_CUTTING_PLANE:{
      let part = state.get('currentPart').toJS();
      if(!part.calculated.cuttingPlanes) part.calculated.cuttingPlanes = [];
      part.calculated.cuttingPlanes.push(action.plane);
      return state.setIn(['currentPart', 'calculated'], fromJS(part.calculated));
    }
    default:
      return state;
  }
}
