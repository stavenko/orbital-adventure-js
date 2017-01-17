import React from 'react';
import classnames from 'classnames';


const Symmetry = ['mirror', 'two', 'three', 'four', 'five', 'six', 'eight'];

let savedHullSettings = null;
export function HullWidget({hull, editorState, actions}){
  return <div className='hull-properties'>
    <div className='rotational'> 
      <div className='rough-structure'> 
        <div> radial: 
          <input value={getValue('radialSegments')}
            onChange={onChange('radialSegments')}
          />
        </div>
        <div> length: <input  
              value={getValue('lengthSegments')}
              onChange={onChange('lengthSegments')}
        /></div>

        <div> length: <input  
              value={getValue('length')}
              onChange={onChange('length')}
        /></div>
        <div className='reset-structure btn btn-small btn-warning' 
          onClick={()=>actions.resetRoughGeometry(savedHullSettings)} >
          Reset
        </div>
      </div>
      <div className='symmetry-mode'>
        {Symmetry.map(m=><div 
          key={m}
          className={classnames('symmetry',m)} 
          onClick={()=>actions.selectSymmetryMode(m)}/>
        )} 
      </div>
    </div>
    <div className='structural'></div>
  </div>
}

function onChange(label){
  return event=>{
    let value = event.currentTarget.value;
    if(!savedHullSettings)
      savedHullSettings = {[label]:value};
    else
      savedHullSettings[label] = value;

  }

}

function getValue(hull, label){
  if(savedHullSettings && savedHullSettings[label])
    return savedHullSettings[label];
  savedHullSettings = hull.roughSettings;
}

