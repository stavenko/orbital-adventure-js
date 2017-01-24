import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';
import * as RotationalShape from '../math/RotationalShape.js'

const initialPartConfig = {
  length:3,
  radius: 0.13,
  lengthSegments: 5,
  radialSegments: 4,
  topCone: true,
  topConeLength: 0.10,
  bottomCone: false,
  bottomConeLength: 0.10,
  type: 'rotational',
  orientation: 'path-tangent'
}
const createInitialNewPart = state => ({
  id:Date.now().toString(36),
  type: 'rotational',


});
const initialState = fromJS({
});

export function partsEditor(state = initialState, action){
  switch(action.type){
    case A.NEW_PART:
      // state.
      let {props} = action;
      //if(!props) props = state.get('partConfig').toJS();
      let newPart = {
        shape:Object.assign({},initialPartConfig), 
        calculated: RotationalShape.createRotationalShape(initialPartConfig),
        stage:'rough'
      };// 
      return state.set('currentPart', fromJS(newPart));
    case A.LOAD_PART:
      return state.set('showLoadUI', true);
    case A.CHANGE_INITIAL_PART_SETTING: {
      //console.log('change', state.get('currentPart'));
      let shape = state.getIn(['currentPart', 'shape']).toJS();
      shape[action.prop] = action.value;
      state = state.setIn(['currentPart', 'shape'], fromJS(shape));
      let calculated = RotationalShape.createRotationalShape(shape);
      return state.setIn(['currentPart', 'calculated'], fromJS(calculated));
        
    }
    default:
      return state;
  }
}
