uniform vec4 atmosphereTableResolution;

uniform float rayleighDensity[10];
uniform float mieDensity[10];
uniform float absorptionDensity[10];

uniform vec3 solarIrradiance;
uniform float sunAngularRadius;
uniform float bottomRadius;
uniform float topRadius;
uniform vec3 rayleighScattering;
uniform vec3 mieScattering;
uniform vec3 mieExtinction;
uniform float miePhaseFunctionG;
uniform vec3 absorptionExtinction;
uniform vec3 groundAlbedo;
uniform float muSMin;
const int INTERPOLATORS=16;
uniform vec4 LinearInterpolators[INTERPOLATORS];

uniform vec3 skySpectralRadianceToLuminance;
uniform vec3 sunSpectralRadianceToLuminance;
