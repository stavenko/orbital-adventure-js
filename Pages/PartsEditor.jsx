import React from 'react';
import ReactDOM from 'react-dom';
import {ContextualBrowser} from './Widgets/ContextualBrowser.jsx';
import {PartDisplay} from './Widgets/PartDisplayer.jsx';
import './parts-editor.scss';


export class PartsEditor extends React.Component {

  render() {
    const props = {
      state: this.props.partsEditor, 
      actions: this.props.actions.partsEditor
    };
    
    const editorState = '';
    return <div className='parts-editor'>
      <div className='browser'>
        <ContextualBrowser {...props} />
      </div>
      <div className='main-view'>
        <PartDisplay {...props} />
      </div>
      <div className='additional-editors'>
        <div className='detail-editor' >
          de
        </div>
        <div className='viewer'>
          viewrer
        </div>
      </div>
    </div>;
  }
}
