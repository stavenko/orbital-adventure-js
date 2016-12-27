import React from 'react';
import ReactDOM from 'react-dom';
import {PartsBrowser} from './PartsBrowser.jsx';

export function ContextualBrowser(props){
  if(!props.currentPart) return <PartsBrowser {...props} />
  else  return <PartContents part={props.currentPart} />
}

