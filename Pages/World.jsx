import React from 'react';
import {WorldCanvas} from './Widgets/WorldCanvas.jsx';

export class World extends React.Component {
  constructor(props) {
    super(props);
  }


  render() {
    
    return <div className='canvas-container'>
      <WorldCanvas />
    </div>;
  }
}
