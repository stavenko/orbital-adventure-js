precision mediump float;
attribute vec3 position;
uniform vec3 weights[16];
uniform vec2 uvStart;
uniform vec2 uvEnd;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 uv;
varying vec3 normal;

float Fact[10];

//, 1.0, 2.0, 6.0, 24.0, 120.0, 720.0, 5040.0, 40320.0, 362880.0, 3628800.0);
float dt = 0.001;
float ds = 0.001;

float fact( int n){
  if(n <= 1) return 1.;
  if(n == 2) return 2.;
  if(n == 3) return 6.;
  if(n == 4) return 24.;
  if(n == 5) return 120.;
}

float bernstein(float t, int i){
  float ii = float(i);
  float ni = fact(3) / (fact(i) * fact(3-i));
  return  ni * pow(t, ii) * pow(1.0-t, 3.0-ii);
}


void main(){
  Fact[0] = 1.0;
  vec3 point = vec3(0);
  vec3 tangentT = vec3(0);
  vec3 tangentS = vec3(0);
  vec2 uvDiff = uvEnd - uvStart;
  for(int i=0; i < 4; ++i){
    for(int j=0; j < 4; ++j){
      if(position.x >= 1.0) dt *= -1.0;
      if(position.y >= 1.0) ds *= -1.0;
      float bt = bernstein(position.x, i);
      float btd = bernstein(position.x+dt, i);
      float bs = bernstein(position.y, j);
      float bsd = bernstein(position.y+dt, j);
      point += weights[i*4 + j] * bt * bs;
      tangentT += weights[i*4 + j] * btd * bs;
      tangentS += weights[i*4 + j] * bt * bsd;
    }
  }
  if(dt < 0.0) tangentT *= -1.0;
  if(ds < 0.0) tangentS *= -1.0;
  
  normal = normalize(cross(tangentT, tangentS));
  uv = uvDiff * position.yx + uvStart;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);


  
}



