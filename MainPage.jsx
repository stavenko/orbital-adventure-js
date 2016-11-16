'use strict'
import React from 'react';
import {Link, IndexLink} from 'react-router';

import 'bootstrap-webpack'

export function Page(props){
  return <div>
    <Link to="editor" >got to editor</Link>
    <h1> main page {props.state.get('str')} </h1>
    {props.children}
  </div>
}

