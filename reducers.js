import {combineReducers} from 'redux';
import {List, Map, fromJS} from 'immutable';
import {partsEditor} from './reducers/parts.js';
import {routerReducer} from 'react-router-redux';
import {applyMiddleware} from 'redux';
import thunk from 'redux-thunk';

const defaultState = {pageName: 'page-name'};

function state(state = fromJS(defaultState), action) {
  return state;
}

export const rootReducer = combineReducers({
  state, partsEditor, routing: routerReducer
}, applyMiddleware(thunk));
