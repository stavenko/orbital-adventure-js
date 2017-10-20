precision highp float;
uniform int face;
uniform int lod;
uniform sampler2D permutationTable;
uniform vec2 permutationTableSize;


void main(){
  vec2 cr = vec2(64.0, 64.);
  vec2 cl = gl_FragCoord.xy / cr;
  gl_FragColor = vec4(cl, 0.0, 1.0);
}
