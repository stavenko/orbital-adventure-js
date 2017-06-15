#include <simplex3dNoise>


const int SAMPLES = 8;
float getHeightValue(vec3 normal, float levelOfDetail){
  float normalLength = length(normal);
  float height = 0.0;
  for(int i = 0; i < SAMPLES; ++i){
    float level = float(SAMPLES) * levelOfDetail + float(i);
    float div = pow(2, level)
    float divider =  div / normalLength;
    float noise = snoise(normal * divider) / div;
    height += noise;
  }
  return height;
}

