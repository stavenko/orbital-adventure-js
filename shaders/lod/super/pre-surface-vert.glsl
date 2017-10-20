precision highp float;
attribute vec2 sspoint;

void main(){
  vec4 pos = vec4(sspoint.xy, 0.0, 1.0);
  gl_Position = pos;
}

