'use strict'

import React from 'react';
import {render} from 'react-dom'
import {RootComponent} from "./RootComponent.jsx"

document.addEventListener('DOMContentLoaded', function(){
  render(<RootComponent />, 
         document.getElementById('content')
        );
})







