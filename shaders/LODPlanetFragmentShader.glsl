uniform vec3 someColor;
void main(){
  gl_FragColor = vec4(someColor.xy, 0.5, 1.0);
}
