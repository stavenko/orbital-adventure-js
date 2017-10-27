#include <getPerlinValue>



const int SAMPLES = 2;
float getHeightValue(vec3 normal, sampler2D T, vec2 TS){
  float normalLength = length(normal);
  float height = 0.0;
  vec3 nn = normalize(normal);
  float freq = 10.0;
  float persistance = 0.2;
  float freqPersistance = 0.7;
  float amplitude = 1.0;
  float maxAmplitude = 1.0;
  for(int i = 0; i < SAMPLES; ++i){
    maxAmplitude += amplitude;
    float noise = getPerlinValue(T, TS, nn * freq) * amplitude;
    amplitude *= persistance;
    freq *= freqPersistance;
    height += noise;
  }
  return height;
}

