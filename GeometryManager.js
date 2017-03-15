import isEqual from 'lodash/isEqual';
import {BufferGeometry} from 'three/src/core/BufferGeometry';

const GeometryCache = {};
const PropsCache = {};
const ActualGeometry = {};

export function getOrCreateGeometry(props){
  if(!props.id) console.warn('Cannot rely on props id');
  let cached = PropsCache[props.id] || {};
  if(props.type == cached.type && isEqual(props.arguments, cached.arguments)){
    return ActualGeometry[props.id];
  }
  delete PropsCache[props.id];
  delete ActualGeometry[props.id];
  return createGeometry(props);

}

export function createGeometry(props){
  let geometry = new props.type(...props.arguments);
  GeometryCache[geometry.uuid] = props; // old way
  PropsCache[props.id] = props;
  ActualGeometry[props.id] = geometry;
  return geometry;

}

export function replaceGeometryIfNeeded(props, oldGeometry){
  console.warn("TODO: replace this function call");
  let cached = GeometryCache[oldGeometry.uuid] || {};
  if(props.type == cached.type && isEqual(props.arguments, cached.arguments)){
    return oldGeometry;
  }else{
    // console.log("not ok", props.arguments, cached.arguments);
    
  }
  delete GeometryCache[oldGeometry.uuid];
  return createGeometry(props);
}

export function createBufferGeometry(props){
  let geometry = new BufferGeometry();

  for(let key in props){
    let attr = props[key];
    let attribute = new BufferAttribute(attr.array, attr.size)
    if(key == 'index')
      geometry.setIndex(attribute);
    else
      geometry.addAttribute(key, attribute);
  }
  return geometry;
}

