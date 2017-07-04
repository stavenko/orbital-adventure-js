#include <getPerlinValue>



const int SAMPLES = 8;
float getHeightValue(vec3 normal, float levelOfDetail, sampler2D T, vec2 TS){
  float normalLength = length(normal);
  float height = 0.0;
  vec3 nn = normalize(normal);
  for(int i = 0; i < SAMPLES; ++i){
    float level =  float(i);
    float div = pow(2., float(level));
    float divider =  div ;
    float noise = getPerlinValue(T, TS, nn * divider) / div;
    height += noise;
  }
  return height;
}

