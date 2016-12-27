import {List, Map, fromJS} from 'immutable';
import {} from './actions.js';

let defaultState={pageName:'page-name'};

export function state(state = fromJS(defaultState), action) {
  return state;
};
export default {state}

// export const rootReducer = combineReducers({state});
