// import {Vector3} from 'three/src/math/Vector3';
import {Sphere} from 'three/src/math/Sphere.js';
import {BufferGeometry} from 'three/src/core/BufferGeometry';
import {BufferAttribute} from 'three/src/core/BufferAttribute';
import Bezier from 'bezier-js';

// const pointSize = 3;
export class Curve{
    constructor(points, pointSize = 3) {
        if(!points) points = new Float32Array(0);
        if(!points.subarray) points = new Float32Array(points);
        this.points = points || new Float32Array(0);
        this.pointSize = pointSize;
        let nodes = Math.ceil(this.getNodeAmount());
        let pointsForNodes = nodes * 3 - 2;
        let weHaveNodes = this.points.length / pointSize;
        if(pointsForNodes - weHaveNodes == 1) this.isClosed = true;


        console.log('segments', weHaveNodes, pointsForNodes, this.isClosed);
    }

    getNodeAmount(){
        let points = this.points.length / this.pointSize;
        return (points + 2) / 3;
    }

    getClosedNodes(){
        let nodesAmount = Math.floor(this.getNodeAmount());
        let lastPoint = this.points.length / this.pointSize - 1;
        let nodes = [];
        for(let i = 0; i < nodesAmount; ++i){
            let pointId = i * 3;
            let p = {};
            if(i == 0) p.left = this.get(lastPoint);
            else p.left = this.get(pointId - 1);
            p.point = this.get(pointId);
            p.right = this.get(pointId + 1);
            nodes.push(p);
        }
        return nodes;
    }

    getNodes(){
        if(this.isClosed) return this.getClosedNodes();
        let pts = this.getNodeAmount();
        let nodes = [];
        let last = pts - 1;
        for(let i = 0; i < pts; ++i){
            let pointId = i * 3;
            let p = {};
            if(i != 0) p.left = this.get(pointId - 1);
            p.point = this.get(pointId);
            if(i != last) p.right = this.get(pointId + 1);
            nodes.push(p);
        }
        return nodes;

    }
    get(pointId){
        let pix = this.pointSize * pointId;
        let pos = ['x','y','z'].reduce((o,k, i)=>{
            if( i > this.pointSize -1) return o;
            o[k] = this.points[pix+i];
            return o;
        }, {id:pointId});
        return pos;
    }

    set(pointId, point){
        let ix = pointId * this.pointSize;
        for(let c = 0; c < this.pointSize; ++c){
            this.points[ix + c] = point[c];
        }
    }

    getSegmentAmount(){
        if(this.isClosed) return this.points.length / this.pointSize / 3;
        let points = this.points.length / this.pointSize;
        return (points - 1) / 3;
    }

    getClosedBezierArray(){
        let segments = this.getSegmentAmount();
        let points = this.points.length / this.pointSize;
        let last = segments - 1;
        let beziers = [];
        for(let i = 0; i < segments; i++){
            let ab = new Float32Array(4 * this.pointSize);
            let abIx = 0;
            let segmentStarting = i * 3;
            for(let j = 0; j < 4; j++){
                let pointId =(segmentStarting + j) % points
                let p = this.get(pointId);
                for(let c = 0; c < this.pointSize; ++c){
                    ab[abIx++] = p[['x','y','z','w'][c]];
                }

            }
            beziers.push(new Bezier(ab));
        }
        return beziers;
    }

    getBeziersArray(){
        if(this.isClosed) return this.getClosedBezierArray();
        let segments = this.getSegmentAmount();
        let beziers = [];
        for(let i =0 ; i < segments; ++i){
            let segmentStarting = i * 3 * this.pointSize;
            let segmentLength = 4 * this.pointSize;
            let segment = this.points.subarray(segmentStarting, segmentStarting+segmentLength);
            beziers.push(new Bezier(segment));
        }
        return beziers;
    }

    getRawGeometry(PerBezier = 10){
        let beziers = this.getBeziersArray();
        let totalPoints = PerBezier * beziers.length;
        let vertices = new Float32Array((totalPoints+1) * 3);
        let currentPoint = 0;
        beziers.forEach((b, segmentIx)=>{
            let To = PerBezier;
            if(segmentIx == (beziers.length-1)) To = PerBezier + 1;
            for(let i =0; i < To ; ++i){
                let t = i / PerBezier;
                let p = b.get(t);
                for(let c =0 ; c < 3 ; ++c){
                    if(c < this.pointSize )
                        vertices[currentPoint++] = p[['x','y','z','w'][c]];
                    else
                        vertices[currentPoint++] = 0.0;
                }

            }
        });
        return {array: vertices, size: 3};
    }

    getGeometry(PerBezier = 10){
      let rawGeometry = this.getRawGeometry(PerBezier);
      let geometry = new BufferGeometry();
      geometry.addAttribute('position', new BufferAttribute(rawGeometry.array, rawGeometry.size));
      return geometry;
    }
}

