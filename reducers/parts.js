import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';
import * as RotationalShape from '../math/RotationalShape.js'

const initialPartConfig = {
  length:1,
  radius: 0.23,
  lengthSegments: 1,
  radialSegments: 4,
  topCone: true,
  topConeLength: 0.33,
  bottomCone: true,
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
    case A.SPLIT_CURRENT_PART_T:{
      let part = state.get('currentPart').toJS();
      let calculated = RotationalShape.splitPartAtT(part.calculated, action.at);
      return state.setIn(['currentPart', 'calculated'], fromJS(calculated));
    }
    default:
      return state;
  }
}
