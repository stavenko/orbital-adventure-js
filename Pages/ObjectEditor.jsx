import React from 'react';
import {CanvasBase} from '../Canvas.jsx'
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry'
import {Mesh} from 'three/src/objects/Mesh'
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial'


export function ObjectEditor(props) {
    return <div style={{width:500, height:400}}>
        <ObjectEditorImpl {...props} />
    </div>
}

let EditedObject = {
    mainAxis: {
        curve:[0, 0,
            0, 0.1,
            0, 0.9,
            0, 1],
        plane: {p: [0,0,0], n:[0,0,1]}
    },

    slices:[
        {t:0, curve:{curve:[0.0]}},
        {t:0.3, curve:{curve:[ 0, 1,  0.5, 1, 1, 0.5, 1, 0,  1, -0.5, 0.5, -1, 0, -1, -0.5, -1, -1, -0.5, -1, 0, -1, 0.5, -0.5, 1, 0, 1]}},
        {t:1.0, curve:{curve:[ 0, 1,  0.5, 1, 1, 0.5, 1, 0,  1, -0.5, 0.5, -1, 0, -1, -0.5, -1, -1, -0.5, -1, 0, -1, 0.5, -0.5, 1, 0, 1]}}
    ]
};


class ObjectEditorImpl extends CanvasBase{
    constructor(props){
        super(props);
        let mesh = new Mesh(new BoxBufferGeometry(1,1,1), new MeshBasicMaterial({color:0xff0000}));
        this.scene.add(mesh);
    }
    renderCanvas(){

        this.renderer.render(this.scene, this.camera);
    }
}
