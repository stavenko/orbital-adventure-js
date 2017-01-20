import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';
import * as RotationalPart from '../math/RotationalPart.js'

const initialPartConfig = {
  length:1,
  lengthSegments: 0,
  radialSegments: 8,
  topCone: true,
  //bottomCone: true,
  type: 'rotational'
}
const createInitialNewPart = state => ({
  id:Date.now().toString(36),
  type: 'rotational',


});
const initialState = fromJS({
  partConfig:initialPartConfig
});

export function partsEditor(state = initialState, action){
  switch(action.type){
    case A.NEW_PART:
      let {props} = action;
      if(!props) props = state.get('partConfig').toJS();
      let newPart = RotationalPart.createRotationalPart(props);
      return state.set('currentPart', fromJS(newPart));
    case A.LOAD_PART:
      return state.set('showLoadUI', true);
    default:
      return state;
  }
}
