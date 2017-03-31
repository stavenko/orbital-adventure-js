import React,{Component} from 'react';
import {Page} from './MainPage.jsx';
import {createStore} from 'redux';
import {Provider, connect} from 'react-redux';
import { Router, Route, IndexRoute, browserHistory, hashHistory } from 'react-router'
import {rootReducer} from './reducers.js';
import { syncHistoryWithStore } from 'react-router-redux'
import {CurveEditorWidget} from './Pages/CurveEditor.jsx';
import {World} from './Pages/World.jsx';
import {PartsEditor as PartsEditorWidget} from './Pages/PartsEditor.jsx';
import {PathEditor as PathEditorWidget} from './Pages/PathEditor.jsx';
import {ObjectEditor as ObjectEditorWidget} from './Pages/ObjectEditor.jsx';
import * as PartsEditorActions from './actions/parts.js';
import set from 'lodash/set'

import './css/style.scss';

let storeState = createStore(rootReducer);

const history = syncHistoryWithStore(hashHistory, storeState);

export function RootComponent(){
  return <Provider store={storeState} >
    <Router history={history} >
      <Route path="/" component={Root}>
        <Route path="editor" component={PartsEditor} />
        <Route path="world" component={WorldView} />
        <Route path="bar" component={Bar} />
      </Route>
    </Router>
  </Provider>
}

const Root = connect(
  mapStateToProps,
  mapDispatchToProps
)(Page);

const PathEditor = connect(mapStateToProps, mapDispatchToProps)(PathEditorWidget);
const CurveEditor = connect(mapStateToProps, mapDispatchToProps)(CurveEditorWidget);
const ObjectEditor = connect(mapStateToProps, mapDispatchToProps)(ObjectEditorWidget);
const PartsEditor = connect(mapStateToProps, mapDispatchToProps)(PartsEditorWidget);
const WorldView = connect(mapStateToProps, mapDispatchToProps)(World);

function Bar(props){
  return <div> Im bar </div>
}
function mapStateToProps(state){
  return state;
}
function mapDispatchToProps(dispatch){
  let o = {partsEditor: PartsEditorActions}
  let actions = {};
  for(let actionCollection in o){
    let actionsObj = o[actionCollection];
    for(let name in actionsObj){
      let fn = actionsObj[name];
      if(typeof(fn) === 'function'){ 
        set(actions, [actionCollection, name], function(){
          return dispatch(fn.apply(null, arguments));
        })
      }
    }
  }
  return {actions};
}
