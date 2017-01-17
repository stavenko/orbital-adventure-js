import React from 'react';
import ReactDOM from 'react-dom';
import {ExistPartsList} from './ExistPartList.jsx';

export function PartsBrowser({state, actions}){
  return <div className='parts-browser'>
    <a className='btn btn-primary' onClick={actions.newPart} >New </a>
    <a className='btn btn-success' onClick={actions.loadPart}>Load </a>
    <ExistPartsList show = {state.get('showLoadUI')} actions={actions} />
  </div>
}
