import React from 'react';
import ReactDOM from 'react-dom';
import {Scene} from 'three/src/scenes/Scene';
import {WebGLRenderer} from 'three/src/renderers/WebGLRenderer';
import {OrthographicCamera} from 'three/src/cameras/OrthographicCamera';
import {Raycaster} from 'three/src/core/Raycaster';
import {Vector2} from 'three/src/math/Vector2';


export class CanvasBase extends React.Component{
    constructor(props) {
        super(props);
        this._events = [];
        this.scene = new Scene;
        this.normalizedMouse = new Vector2;
        this.rayCaster = new Raycaster;
    }
    renderCanvas(){}
    fixSize(){
        if(this.node.width != this.node.clientWidth || this.node.height != this.node.clientHeight){
            this.node.width = this.node.clientWidth;
            this.node.height = this.node.clientHeight;
        }
    }
    render(){
        return <canvas style={{width:'100%', height:'100%'}} />

    }

    componentDidMount(){
        this.node = ReactDOM.findDOMNode(this);
        this.fixSize();
        let width = this.node.width;
        let height = this.node.height;
        this.nodeRect = this.node.getBoundingClientRect();

        this.renderer = new WebGLRenderer({canvas: this.node});
        this.camera = new OrthographicCamera(width/2 , -width/2, height/2, -height/2, 1, 100);

        this.camera.position.z = 10;
        this.camera.lookAt(new Vector3);
        this.renderCanvas();
        this.bindEvents();
    }
    componentWillUnmount(){
        this.unbindEvents();
    }
    bindEvents(){
        this.initEvents();
        this._events.forEach(e=>{
            e.t.addEventListener(e.e, e.f);
        });
    }
    unbindEvents(){
        if(this._events.length) {
            this._events.forEach(e=>e.t.removeEndEventListener(e.e, e.f));
            this._events = [];
        }
    }

    resizeWindow(){
        console.log('resize-rezise');
    }

}
