import React from 'react';
import ReactDOM from 'react-dom';
import {ContextualBrowser} from '../Widgets/PartEditor/ContextualBrowser.jsx'


export class PartsEditor extends React.Component{

  render(){
    console.log(this.props);
    let props = {
      state:this.props.partsEditor, 
      actions: this.props.actions.partsEditor
    };
    const editorState = '';
    return <div className='parts-editor'>
      <div className='browser'>
        <ContextualBrowser {...props} />
      </div>
      <div className='main-view'>
        main-view
      </div>
      <div className='additional-editors'>
        <div className='detail-editor' >
          de
        </div>
        <div className='viewer'>
          viewrer
        </div>
      </div>
    </div>
  }
}
