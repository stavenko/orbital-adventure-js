import React from 'react';

import {} from 'three/src/objects/LineSegments';
import {Line} from 'three/src/objects/Line';
import {LineBasicMaterial} from 'three/src/materials/LineBasicMaterial';

import {Vector3} from 'three/src/math/Vector3';
import {Mesh} from 'three/src/objects/Mesh';
import {MeshBasicMaterial} from 'three/src/materials/MeshBasicMaterial';
import {BoxBufferGeometry} from 'three/src/geometries/BoxBufferGeometry';
import {CanvasBase} from '../Canvas.jsx'
import {Curve} from '../math/Curve.js';

export function CurveEditorWidget(props){
    return  <div style={{width:'100%', height:'40%'}}>
        <CurveEditorWidgetImpl {...props}/>
    </div>

}
const CircleWeight = 0.5522539464083382;
let cw = CircleWeight;


class CurveEditorWidgetImpl extends CanvasBase{
    constructor(props){
        super(props);
        this.curve = new Curve([
            0, 1,  // a
            cw, 1,
            1, cw,
            1, 0,  // b
            1, -cw,
            cw, -1,
            0, -1, // c
            -cw, -1,
            -1, -cw,
            -1, 0,  // d
            -1, cw,
            -cw, 1,
            0, 1  //e
        ].map(x=>x*100), 2);
    }

    renderCanvas(){
        this.renderCurve();
    }

    initEvents(){
        this._events.push({e:'mousemove', t:this.node, f:this.mouseMove.bind(this)});
        this._events.push({e:'mousedown', t:this.node, f:this.mouseDown.bind(this)});
        this._events.push({e:'mouseup', t:this.node, f:this.mouseUp.bind(this)});
        this._events.push({e:'resize', t:window, f:this.resizeWindow.bind(this)});
    }


    mouseMove(event){
        if(this.trackingMesh) return this.handleControlling(event);

        this.normalizedMouse.x = ( (event.clientX - this.nodeRect.left) / this.node.width ) * 2 - 1;
        this.normalizedMouse.y = - ( (event.clientY - this.nodeRect.top )/ this.node.height ) * 2 + 1;
        this.rayCaster.setFromCamera(this.normalizedMouse, this.camera);

        let intersects = this.rayCaster.intersectObject( this.scene, true );
        if(intersects.length > 0){
            this.pointedMesh = intersects[0].object;
        }

        else this.pointedMesh = null;
    }

    handleControlling(event){
        let mouse = new Vector3;
        mouse.x = ((event.clientX - this.nodeRect.left) / this.node.width ) * 2 - 1;
        mouse.y = -((event.clientY - this.nodeRect.top )/ this.node.height ) * 2 + 1;
        mouse.z = 0;
        let coords  = mouse.unproject(this.camera);
        this.trackingMesh.position.x = coords.x;
        this.trackingMesh.position.y = coords.y;
        this.curve.set(this.trackingMesh.userData.point.id, [coords.x, coords.y]);
        this.renderCurve();
    }

    mouseDown(e){
        if(!this.pointedMesh)return;
        if(this.pointedMesh.isControlled)
            this.trackingMesh = this.pointedMesh;

    }
    mouseUp(e){
        if(this.trackingMesh) this.trackingMesh = null;
    }

    createLine(){
        let g = this.curve.getGeometry();
        this.line = new Line(g, new LineBasicMaterial({color:0xff0000}));
        this.scene.add(this.line);
        this.nodes = this.curve.getNodes();
        this.meshes = this.nodes.map(this.createMeshes.bind(this));
    }

    createMeshes(forNode, id){
        let square = 6;
        let meshForNode=(node, color)=>{
            let m = new Mesh(new BoxBufferGeometry(square,square,square), new MeshBasicMaterial({color}));
            m.position.x = node.x;
            m.position.y = node.y;
            m.position.z = node.z?node.z: 5.0;
            m.userData.point = node;
            m.userData.id = id;
            m.isControlled = true;
            this.scene.add(m);
            return m;
        };

        let mesh = meshForNode(forNode.point, 0x00ff00),
            left,right;
        if(forNode.left)
            left = meshForNode(forNode.left, 0x0000ff);
        if(forNode.right)
            right = meshForNode(forNode.right, 0x0000ff);

        return {left, mesh, right, id};

    }

    updateLine(){
        this.line.geometry = this.curve.getGeometry(200);
    }

    renderCurve(){
        if(!this.line) this.createLine();
        else this.updateLine();
        console.log(this.node.width, this.node.height);
        this.renderer.render(this.scene, this.camera);
    }


}