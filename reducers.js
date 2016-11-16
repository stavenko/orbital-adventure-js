import {List, Map, fromJS} from 'immutable';
import {} from './actions.js';
let defaultState={str:'aaaaaaa im main'};
export function state(state = fromJS(defaultState), action) {
  return state;
};
export default {state}

// export const rootReducer = combineReducers({state});
