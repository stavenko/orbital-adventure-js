import {List, Map, fromJS} from 'immutable';
import * as A from '../actions/parts.js';

const initialState = fromJS({});
const createInitialNewPart = state => ({
  id:Date.now().toString(36),
  type: 'rotational',
  mainAxis:[0, 0, 0, 0.1,       0, 0.99, 0, 1], // signle bezier chunck
  top: [0,1,0], // default top vector
  sliceNormal: [0,1,0],
  slices:[
    {t:0.04, curve:[] }, // slice is a curve with points and weights
    {t:0.5, curve:[] },  // within plane in point t of main axis and normal
    {t:1.0, curve:[] },  // == sliceNormal
  ],
  topCap: true,
  bottomCap: true,
  surfaceWeights:[] // array, that stores weights of 
                     // perpendecular weights of slices

});

export function partsEditor(state = initialState, action){
  switch(action.type){
    case A.NEW_PART:
      console.log(fromJS(createInitialNewPart(state)));
      return state.set('currentPart', fromJS(createInitialNewPart(state)));
    case A.LOAD_PART:
      return state.set('showLoadUI', true);
    default:
      return state;
  }
}
