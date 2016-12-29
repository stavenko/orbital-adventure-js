import React from 'react';
import {HullWidget} from './HullWidget.jsx';

export function PartContents({part, editorState, actions}){
  console.log(part);

  return <div className='part-contents' > 
    <HullWidget hull={part.hull} {...{editorState, actions}} />

    <div className='weilding'>
      weilds
    </div>
    <div className='weilding'>
      weilds
    </div>
    
  </div>

}
