import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';

const initialState = fromJS({});
const createInitialNewPart = state => {id:Date.now().toString(36)};

export function partsEditor(state = initialState, action){
  switch(action.type){
    case A.NEW_PART:
      return state.set('currentPart', fromJS(createInitialNewPart(state)));
    case A.LOAD_PART:
      return state.set('showLoadUI', true);
    default:
      return state;
  }
}
