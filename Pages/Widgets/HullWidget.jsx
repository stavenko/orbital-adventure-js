import React from 'react';
import classnames from 'classnames';
import {changeInitialPartSettings} from '../../actions/parts.js';


const Symmetry = ['mirror', 'two', 'three', 'four', 'five', 'six', 'eight'];

let userInput = null;
export function HullWidget(props){
  
  if(props.stage === 'rough') return <ShapeCreator {...props}/>
  return <ShapeControls {...props}/>;

}

function ShapeControls(props){
  let {symmetryMode}= props.state.get('editorState').toJS() || {};
  return <div className='hull-properties'>
      <div className='symmetry-mode'>
        {Symmetry.map(m=><div 
          key={m}
          className={classnames('symmetry',m)} 
          onClick={()=>actions.selectSymmetryMode(m)}/>
        )} 
      </div>

  </div>
}

function ShapeCreator(props){
  let onChange = onChangeCreator(props);
  let getValue = getValueCreator(props);
  let {actions} = props;

  return <div className='hull-properties'>
    <div className='rotational'> 
      <div className='field-group-label'>Radial properties</div>
      <div className='radial-properties row-flex'> 
        <div> 
          <label>radius:  </label>
          <input value={getValue('radius')}
            onChange={onChange('radius')}
          />
        </div>
        <div> 
          <label> segments: </label>
          <input  
              value={getValue('radialSegments')}
              onChange={onChange('radialSegments')}
        /></div>

      </div>

      <div className='field-group-label'>Length properties</div>
      <div className='length-properties row-flex'> 
        <div>           <label> segments: </label>
<input  
              value={getValue('lengthSegments')}
              onChange={onChange('lengthSegments')}
        /></div>
      <div> <label> length:  </label>
        <input  
              value={getValue('length')}
              onChange={onChange('length')}
        /></div>
      </div>
      <div className='field-group-label'>Caps</div>
      <div className='caps-properties row-flex'> 
        <div> 
          <label> Top:  </label>
          <input type='checkbox' 
            checked={getValue('topCone')}
            onChange={onChange('topCone', true)}/>
          <input  
                value={getValue('topConeLength')}
                onChange={onChange('topConeLength')}
            />
        </div>
        <div> 
          <label> Bottom:  </label>
          <input type='checkbox' 
            checked={getValue('bottomCone')} 
            onChange={onChange('bottomCone', true)}/>
          <input  
                value={getValue('bottomConeLength')}
                onChange={onChange('bottomConeLength')}
            />
        </div>
      </div>

    </div>
    <div className='structural'></div>
    <div className='reset-structure btn btn-small btn-warning' 
      onClick={()=>actions.roughGeometryReady()} >
      I'm happy
    </div>
  </div>

}

function onChangeCreator(state){
  let changeInitialPartSettings = state.actions.changeInitialPartSettings;
  if(!userInput) userInput = Object.assign({}, state.shape);
  return (label,ch)=>event=>{
    let value;
    if(ch) value = event.currentTarget.checked;
    else value = event.currentTarget.value;
    userInput[label] = value;
    changeInitialPartSettings(label, value)
  }
}

function getValueCreator(props){
  return label=>{
    let v = userInput[label];
    return v; 
  }
}

