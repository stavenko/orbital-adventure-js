import React from 'react';
import {HullWidget} from './HullWidget.jsx';

export function PartContents({part, state, actions}){
  console.log('part', part);

  return <div className='part-contents' > 
    <HullWidget shape={part.shape} stage={part.stage}  {...{state, actions}} />

    <div className='weilding'>
      weilds
    </div>
    <div className='weilding'>
      weilds
    </div>
    
  </div>

}
