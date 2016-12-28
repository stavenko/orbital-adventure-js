import React from 'react';
import ReactDOM from 'react-dom';
import {PartsBrowser} from './PartsBrowser.jsx';
import {PartContents} from './PartContents.jsx';

export function ContextualBrowser({state,actions}){
  if(!state.has('currentPart')) return <PartsBrowser 
    state={state} 
    actions={actions} />
  else  return <PartContents 
    part={state.currentPart} 
    actions={actions} />
}

