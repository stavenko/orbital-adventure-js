//attribute vec3 position;

//uniform mat4 viewMatrix;
//uniform mat4 projectionMatrix;


void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
  // gl_Position = vec4(position.xy, 0.0, 1);
}
