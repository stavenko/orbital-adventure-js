'use strict'
import React from 'react';
import {Link, IndexLink} from 'react-router';

import 'bootstrap-webpack'

export function Page(props){
  return <div className='root'>
    <div className='menu'>
      <Link to="editor" >editor</Link>
      <Link to="world" >world</Link>
    </div>
    <div className='scene'>
      {props.children}
    </div>
  </div>
}

