precision mediump float;

varying vec2 uv;
varying vec3 normal;

void main(){
  gl_FragColor = vec4(uv, 0.0, 1.0);
  gl_FragColor = vec4(uv, 1.0, 1.0);
}
