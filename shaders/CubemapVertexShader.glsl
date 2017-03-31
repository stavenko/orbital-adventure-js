
varying vec3 _normal;
void main(){
  // _normal = normalize((modelMatrix * vec4(normal,0.0)).xyz) ;
  _normal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
