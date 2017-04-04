
uniform vec3 center;
uniform vec3 planetCenter;
uniform vec3 north;
uniform vec3 east;
uniform float size;
uniform float radius;

uniform mat4 modelM;
uniform mat4 viewM;
uniform mat4 viewInverseM;
uniform mat4 projectionM;

vec4 conjugate(vec4 q){
  return vec4(q.xyz * -1.0, q.w);
}
vec4 inverseQuat(vec4 quat){
  float n = length(quat);
  return conjugate(quat)/n;
}

vec4 multiplyQuats(vec4 q1, vec4 q2){
  return vec4(
      q1.w*q2.x + q1.x*q2.w + q1.y * q2.z - q1.z*q2.y,
      q1.w*q2.y - q1.x*q2.z + q1.y * q2.w + q1.z*q2.x,
      q1.w*q2.z + q1.x*q2.y - q1.y * q2.x + q1.z*q2.w,
      q1.w*q2.w - q1.x*q2.x - q1.y * q2.y - q1.z*q2.z
      );
}


vec3 rotate(vec3 v, vec4 q){
  vec4 qpos = vec4(v, 0.0);
  vec4 t = multiplyQuats(q, qpos);
  vec4 qr = multiplyQuats(t, conjugate(q));
  return qr.xyz;
} 

vec4 fromAxisAngle(vec3 axis, float angle){
  vec3 a2 = vec3(sin(angle / 2.0));
  vec4 quat = vec4(axis * a2, cos(angle/2.0));
  return quat;
}

void main(){
  vec2 xy = position.xy;

  vec3 northAligned = north * xy.y + east * xy.x;
  vec3 inGridPosition = vec3(northAligned*size);

  vec3 gridPosition =  inGridPosition+ center;
  float lengthToPosition = length(inGridPosition);
  vec3 v = center - planetCenter;
  vec3 v0 = gridPosition - planetCenter;
  vec3 axis = normalize(cross(v, v0));
  float angle = lengthToPosition / radius;
  vec3 finalPosition = rotate(v, fromAxisAngle(axis, angle));

  mat4 pv1 = projectionM * viewInverseM;

  gl_Position =  pv1 * vec4(finalPosition+ planetCenter, 1.0);
}
