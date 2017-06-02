precision highp float;

uniform vec2 resolution;
uniform vec3 planetPosition; // planetPosition relative to camera;
uniform vec3 sunDirection;
uniform vec3 skySpectralRadianceToLuminance;
uniform vec3 sunSpectralRadianceToLuminance;

uniform vec2 sun_size;
uniform vec3 sun_radiance;
uniform vec3 white_point;


uniform float exposure;

uniform float ttimeVar;

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

uniform float rayleighDensity[10];
uniform float mieDensity[10];
uniform float absorptionDensity[10];


//uniform sampler2D transmittanceTexture;
//uniform sampler2D deltaIrradianceTexture;
//uniform sampler2D scatteringTexture;

uniform vec4 atmosphereTableResolution;
uniform vec2 resolutionOf4d;
uniform vec2 _additional;



varying vec3 cameraRay;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform sampler2D singleMieScatteringTexture;
uniform sampler2D irradianceTexture;

RadianceSpectrum GetSkyRadiance(AtmosphereParameters atmosphere,
    Position camera, Direction view_ray, Length shadow_length,
    Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadiance(atmosphere, transmittanceTexture,
      scatteringTexture, singleMieScatteringTexture,
      camera, view_ray, shadow_length, sun_direction, transmittance);
}
RadianceSpectrum GetSkyRadianceToPoint(AtmosphereParameters atmosphere,
    Position camera, Position point, Length shadow_length,
    Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadianceToPoint(atmosphere, transmittanceTexture,
      scatteringTexture, singleMieScatteringTexture,
      camera, point, shadow_length, sun_direction, transmittance);
}
IrradianceSpectrum GetSunAndSkyIrradiance(AtmosphereParameters atmosphere,
   Position p, Direction normal, Direction sun_direction,
   out IrradianceSpectrum sky_irradiance) {
  return GetSunAndSkyIrradiance(atmosphere, transmittanceTexture,
      irradianceTexture, p, normal, sun_direction, sky_irradiance);
}
Luminance3 GetSkyLuminance(AtmosphereParameters a,
    Position camera, Direction view_ray, Length shadow_length,
    Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadiance(camera, view_ray, shadow_length, sun_direction,
      transmittance) * SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}
Luminance3 GetSkyLuminanceToPoint(AtmosphereParameters a,
    Position camera, Position point, Length shadow_length,
    Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadianceToPoint(camera, point, shadow_length, sun_direction,
      transmittance) * SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Illuminance3 GetSunAndSkyIlluminance( AtmosphereParameters a,
   Position p, Direction normal, Direction sun_direction,
   out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance =
      GetSunAndSkyIrradiance(a, p, normal, sun_direction, sky_irradiance);
  sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
})


void constructProfile(float from[10], out DensityProfile prof){
  prof.layers[0].width = from[0];
  prof.layers[0].exp_term = from[1];
  prof.layers[0].exp_scale = from[2];
  prof.layers[0].linear_term = from[3];
  prof.layers[0].constant_term = from[4];

  prof.layers[1].width = from[0];
  prof.layers[1].exp_term = from[1];
  prof.layers[1].exp_scale = from[2];
  prof.layers[1].linear_term = from[3];
  prof.layers[1].constant_term = from[4];

}

vec2 toIJ(float ix, vec2 resolution){
  float j = floor(ix / resolution.x);
  float i = ix - j*resolution.x;
  return vec2(i,j);
}


vec4 texture3d(sampler2D sampler, vec3 resolution, vec2 resolution2, vec3 uvw){
  vec3 indexes = floor(uvw * resolution);
  float IX = (indexes.x * resolution.y + indexes.y)* resolution.z + indexes.z;
  vec2 ij = toIJ(IX, resolution2);
  vec2 uv = ij / resolution2;
  return texture2D(sampler, uv);
}

vec4 texture4D(sampler2D sampler, vec4 uvwo){
  vec4 resolution = atmosphereTableResolution;
  vec2 resolution2 = resolutionOf4d;
  vec4 indexes = floor(uvwo * resolution);
  float size = resolution.x * resolution.y * resolution.z * resolution.w;
  float X = indexes[0] * resolution[1] + indexes[1];
  float XX = X * resolution[2] + indexes[2];
  float IX = XX * resolution[3] + indexes[3];
  vec2 ij = toIJ(IX, resolution2);
  vec2 uv = ij / resolution2;
  return texture2D(sampler, uv);
}

vec4 texture(sampler2D t, vec2 uv){
  return texture2D(t, uv);
}

vec4 texture(sampler2D t, vec4 uvwt){
  return texture4D(t, uvwt);
}

const vec3 kSphereCenter = vec3(0.0, 0.0, 1.0);
const float kSphereRadius = 1.0;
const vec3 kSphereAlbedo = vec3(0.8);
const vec3 kGroundAlbedo = vec3(0.0, 0.0, 0.04);
const vec3 camera = vec3(0.0);

#ifdef USE_LUMINANCE
#define GetSkyRadiance GetSkyLuminance
#define GetSkyRadianceToPoint GetSkyLuminanceToPoint
#define GetSunAndSkyIrradiance GetSunAndSkyIlluminance
#endif

vec3 GetSkyRadiance(AtmosphereParameters, vec3 camera, vec3 view_ray, float shadow_length,
    vec3 sun_direction, out vec3 transmittance);
vec3 GetSkyRadianceToPoint(AtmosphereParameters, vec3 camera, vec3 point, float shadow_length,
    vec3 sun_direction, out vec3 transmittance);
vec3 GetSunAndSkyIrradiance( AtmosphereParameters,     vec3 p, vec3 normal, vec3 sun_direction, out vec3 sky_irradiance);

float GetSunVisibility(vec3 point, vec3 sun_direction) {
  vec3 p = point - kSphereCenter;
  float p_dot_v = dot(p, sun_direction);
  float p_dot_p = dot(p, p);
  float ray_sphere_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
  float distance_to_intersection = -p_dot_v - sqrt(
      kSphereRadius * kSphereRadius - ray_sphere_center_squared_distance);
  if (distance_to_intersection > 0.0) {
    // Compute the distance between the view ray and the sphere, and the
    // corresponding (tangent of the) subtended angle. Finally, use this to
    // compute an approximate sun visibility.
    float ray_sphere_distance =
        kSphereRadius - sqrt(ray_sphere_center_squared_distance);
    float ray_sphere_angular_distance = -ray_sphere_distance / p_dot_v;
    return smoothstep(1.0, 0.0, ray_sphere_angular_distance / sun_size.x);
  }
  return 1.0;
}
float GetSkyVisibility(vec3 point) {
  vec3 p = point - kSphereCenter;
  float p_dot_p = dot(p, p);
  return
      1.0 + p.z / sqrt(p_dot_p) * kSphereRadius * kSphereRadius / p_dot_p;
}

void GetSphereShadowInOut(vec3 view_direction, vec3 sun_direction,
    out float d_in, out float d_out) {
  vec3 pos = camera - kSphereCenter;
  float pos_dot_sun = dot(pos, sun_direction);
  float view_dot_sun = dot(view_direction, sun_direction);
  float k = sun_size.x;
  float l = 1.0 + k * k;
  float a = 1.0 - l * view_dot_sun * view_dot_sun;
  float b = dot(pos, view_direction) - l * pos_dot_sun * view_dot_sun -
      k * kSphereRadius * view_dot_sun;
  float c = dot(pos, pos) - l * pos_dot_sun * pos_dot_sun -
      2.0 * k * kSphereRadius * pos_dot_sun - kSphereRadius * kSphereRadius;
  float discriminant = b * b - a * c;
  if (discriminant > 0.0) {
    d_in = max(0.0, (-b - sqrt(discriminant)) / a);
    d_out = (-b + sqrt(discriminant)) / a;
    // The values of d for which delta is equal to 0 and kSphereRadius / k.
    float d_base = -pos_dot_sun / view_dot_sun;
    float d_apex = -(pos_dot_sun + kSphereRadius / k) / view_dot_sun;
    if (view_dot_sun > 0.0) {
      d_in = max(d_in, d_apex);
      d_out = a > 0.0 ? min(d_out, d_base) : d_base;
    } else {
      d_in = a > 0.0 ? max(d_in, d_base) : d_base;
      d_out = min(d_out, d_apex);
    }
  } else {
    d_in = 0.0;
    d_out = 0.0;
  }
}

vec4 computeColor(AtmosphereParameters atmosphere){
  // redifinitions;
  vec3 view_ray = cameraRay;
  vec3 sun_direction = sunDirection;
  vec3 earth_center = planetPosition;

  vec3 view_direction = normalize(view_ray);
  // Tangent of the angle subtended by this fragment.
  float fragment_angular_size =
      length(dFdx(view_ray) + dFdy(view_ray)) / length(view_ray);

  float shadow_in;
  float shadow_out;
  GetSphereShadowInOut(view_direction, sun_direction, shadow_in, shadow_out);

  // Hack to fade out light shafts when the Sun is very close to the horizon.
  float lightshaft_fadein_hack = smoothstep(
      0.02, 0.04, dot(normalize(camera - earth_center), sun_direction));

/*
<p>We then test whether the view ray intersects the sphere S or not. If it does,
we compute an approximate (and biased) opacity value, using the same
approximation as in <code>GetSunVisibility</code>:
*/

  // Compute the distance between the view ray line and the sphere center,
  // and the distance between the camera and the intersection of the view
  // ray with the sphere (or NaN if there is no intersection).
  vec3 p = camera - kSphereCenter;
  float p_dot_v = dot(p, view_direction);
  float p_dot_p = dot(p, p);
  float ray_sphere_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
  float distance_to_intersection = -p_dot_v - sqrt(
      kSphereRadius * kSphereRadius - ray_sphere_center_squared_distance);

  // Compute the radiance reflected by the sphere, if the ray intersects it.
  float sphere_alpha = 0.0;
  vec3 sphere_radiance = vec3(0.0);
  if (distance_to_intersection > 0.0) {
    // Compute the distance between the view ray and the sphere, and the
    // corresponding (tangent of the) subtended angle. Finally, use this to
    // compute the approximate analytic antialiasing factor sphere_alpha.
    float ray_sphere_distance =
        kSphereRadius - sqrt(ray_sphere_center_squared_distance);
    float ray_sphere_angular_distance = -ray_sphere_distance / p_dot_v;
    sphere_alpha =
        min(ray_sphere_angular_distance / fragment_angular_size, 1.0);

/*
<p>We can then compute the intersection point and its normal, and use them to
get the sun and sky irradiance received at this point. The reflected radiance
follows, by multiplying the irradiance with the sphere BRDF:
*/
    vec3 point = camera + view_direction * distance_to_intersection;
    vec3 normal = normalize(point - kSphereCenter);

    // Compute the radiance reflected by the sphere.
    vec3 sky_irradiance;
    vec3 sun_irradiance = GetSunAndSkyIrradiance(atmosphere,
        point - earth_center, normal, sun_direction, sky_irradiance);
    sphere_radiance =
        kSphereAlbedo * (1.0 / PI) * (sun_irradiance + sky_irradiance);

/*
<p>Finally, we take into account the aerial perspective between the camera and
the sphere, which depends on the length of this segment which is in shadow:
*/
    float shadow_length =
        max(0.0, min(shadow_out, distance_to_intersection) - shadow_in) *
        lightshaft_fadein_hack;
    vec3 transmittance;
    vec3 in_scatter = GetSkyRadianceToPoint(camera - earth_center,
        point - earth_center, shadow_length, sun_direction, transmittance);
    sphere_radiance = sphere_radiance * transmittance + in_scatter;
  }

/*
<p>In the following we repeat the same steps as above, but for the planet sphere
P instead of the sphere S (a smooth opacity is not really needed here, so we
don't compute it. Note also how we modulate the sun and sky irradiance received
on the ground by the sun and sky visibility factors):
*/

  // Compute the distance between the view ray line and the Earth center,
  // and the distance between the camera and the intersection of the view
  // ray with the ground (or NaN if there is no intersection).
  p = camera - earth_center;
  p_dot_v = dot(p, view_direction);
  p_dot_p = dot(p, p);
  float ray_earth_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
  distance_to_intersection = -p_dot_v - sqrt(
      earth_center.z * earth_center.z - ray_earth_center_squared_distance);

  // Compute the radiance reflected by the ground, if the ray intersects it.
  float ground_alpha = 0.0;
  vec3 ground_radiance = vec3(0.0);
  if (distance_to_intersection > 0.0) {
    vec3 point = camera + view_direction * distance_to_intersection;
    vec3 normal = normalize(point - earth_center);

    // Compute the radiance reflected by the ground.
    vec3 sky_irradiance;
    vec3 sun_irradiance = GetSunAndSkyIrradiance(atmosphere, 
        point - earth_center, normal, sun_direction, sky_irradiance);
    ground_radiance = kGroundAlbedo * (1.0 / PI) * (
        sun_irradiance * GetSunVisibility(point, sun_direction) +
        sky_irradiance * GetSkyVisibility(point));

    float shadow_length =
        max(0.0, min(shadow_out, distance_to_intersection) - shadow_in) *
        lightshaft_fadein_hack;
    vec3 transmittance;
    vec3 in_scatter = GetSkyRadianceToPoint(atmosphere, camera - earth_center,
        point - earth_center, shadow_length, sun_direction, transmittance);
    ground_radiance = ground_radiance * transmittance + in_scatter;
    ground_alpha = 1.0;
  }

/*
<p>Finally, we compute the radiance and transmittance of the sky, and composite
together, from back to front, the radiance and opacities of all the ojects of
the scene:
*/

  // Compute the radiance of the sky.
  float shadow_length = max(0.0, shadow_out - shadow_in) *
      lightshaft_fadein_hack;
  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(atmosphere,
      camera - earth_center, view_direction, shadow_length, sun_direction,
      transmittance);

  // If the view ray intersects the Sun, add the Sun radiance.
  if (dot(view_direction, sun_direction) > sun_size.y) {
    radiance = radiance + transmittance * sun_radiance;
  }
  radiance = mix(radiance, ground_radiance, ground_alpha);
  radiance = mix(radiance, sphere_radiance, sphere_alpha);
  vec3 color =
     pow(vec3(1.0) - exp(-radiance / white_point * exposure), vec3(1.0 / 2.2));

  return vec4(color, 1.0);
}

vec2 getTransmittanceResolution(){
  float resMu = atmosphereTableResolution[2];
  float resR = atmosphereTableResolution[3];
  return vec2(resMu*2.0, resR*2.0);
}
vec2 getIrradianceResolution(){
  float resMus = atmosphereTableResolution[0], 
        resR = atmosphereTableResolution[3];
  return vec2(resMus*2.0, resR/2.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  DensityProfile ray, mie, absorp;

  AtmosphereParameters atmosphere;

  constructProfile(rayleighDensity, atmosphere.rayleigh_density);
  constructProfile(mieDensity, atmosphere.mie_density);
  constructProfile(absorptionDensity, atmosphere.absorption_density);
  atmosphere.solar_irradiance= solarIrradiance;
  atmosphere.sun_angular_radius= sunAngularRadius;
  atmosphere.bottom_radius= bottomRadius;
  atmosphere.top_radius= topRadius;
  // atmosphere.rayleigh_density= ray
  atmosphere.rayleigh_scattering= rayleighScattering;
  //atmosphere.mie_density= mie;
  atmosphere.mie_scattering= mieScattering;
  atmosphere.mie_extinction= mieExtinction;
  atmosphere.mie_phase_function_g= miePhaseFunctionG;
  //atmosphere.absorption_density= absorp;
  atmosphere.absorption_extinction= absorptionExtinction;
  atmosphere.ground_albedo= groundAlbedo;
  atmosphere.mu_s_min= muSMin;

  SCATTERING_TEXTURE_R_SIZE = int(atmosphereTableResolution[3]);
  SCATTERING_TEXTURE_NU_SIZE = int(atmosphereTableResolution[1]);
  SCATTERING_TEXTURE_MU_SIZE = int(atmosphereTableResolution[2]);
  SCATTERING_TEXTURE_MU_S_SIZE = int(atmosphereTableResolution[0]);
  vec2 tRes  = getTransmittanceResolution();
  vec2 iRes  = getIrradianceResolution();
  TRANSMITTANCE_TEXTURE_HEIGHT = int(tRes.x); 
  TRANSMITTANCE_TEXTURE_WIDTH = int(tRes.y);
  IRRADIANCE_TEXTURE_WIDTH = int(iRes.x); 
  IRRADIANCE_TEXTURE_HEIGHT = int(iRes.y);
  IRRADIANCE_TEXTURE_SIZE = iRes;

  vec4 color = computeColor(atmosphere);
  gl_FragColor = vec4(uv, 0.0, 1.0);
}

