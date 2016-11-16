import React from 'react';
import {CanvasBase} from '../Canvas.jsx'
export function ObjectEditor(props) {
    return <div style={{width:500, height:400}}>
        <ObjectEditorImpr {...props} />
    </div>
}

class ObjectEditorImpl extends CanvasBase{
    constructor(props){
        super(props);
    }
    renderCanvas(){

    }
}