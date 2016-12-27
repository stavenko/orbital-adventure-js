import React,{Component} from 'react';
import {combineReducers} from 'redux';
import {Page} from './MainPage.jsx';
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import {Provider, connect} from 'react-redux';
import { Router, Route, IndexRoute, browserHistory, hashHistory } from 'react-router'
import reducers from './reducers.js';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux'
import {CurveEditorWidget} from './Pages/CurveEditor.jsx';
import {PartsEditor as PartsEditorWidget} from './Pages/PartsEditor.jsx';
import {ObjectEditor as ObjectEditorWidget} from './Pages/ObjectEditor.jsx';

import './css/style.scss';

let storeState = createStore(combineReducers(Object.assign({
      routing: routerReducer
    },reducers), applyMiddleware(thunk)));

const history = syncHistoryWithStore(hashHistory, storeState);

export function RootComponent(){
  return <Provider store={storeState} >
    <Router history={history} >
      <Route path="/" component={Root}>
        <Route path="editor" component={PartsEditor} />
        <Route path="bar" component={Bar} />
      </Route>
    </Router>
  </Provider>
}

const Root = connect(
  mapStateToProps,
  mapDispatchToProps
)(Page);

const CurveEditor = connect(mapStateToProps, mapDispatchToProps)(CurveEditorWidget);
const ObjectEditor = connect(mapStateToProps, mapDispatchToProps)(ObjectEditorWidget);
const PartsEditor = connect(mapStateToProps, mapDispatchToProps)(PartsEditorWidget);

function Bar(props){
  return <div> Im bar </div>
}
function mapStateToProps(state){
  return state;
}
function mapDispatchToProps(dispatch){
  let o = {/* put action functions here */};
  let actions = {};
  for(let k in o){
    let fn = o[k];
    actions[k] = function(){return dispatch(fn.apply(null, arguments));}
  }
  return actions;
}
