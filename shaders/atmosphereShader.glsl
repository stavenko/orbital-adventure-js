precision highp float;

uniform vec2 resolution;
uniform vec3 planetPosition; // planetPosition relative to camera;
uniform vec3 sunDirection;

uniform vec2 sun_size;
uniform vec3 sun_radiance;
uniform vec3 white_point;
uniform float exposure;

uniform float ttimeVar;


uniform vec2 resolutionOf4d;
uniform vec2 _additional;

varying vec3 cameraRay;

uniform sampler2D uu;
uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform sampler2D singleMieScatteringTexture;
uniform sampler2D irradianceTexture;

uniform sampler2D scatteringDensityTexture3;
uniform sampler2D scatteringTexture1;
uniform sampler2D scatteringTexture2;
uniform sampler2D scatteringTexture3;
uniform sampler2D deltaIrradianceTexture1;
uniform sampler2D deltaIrradianceTexture2;
uniform sampler2D deltaIrradianceTexture3;
uniform sampler2D deltaIrradianceTexture4;
uniform sampler2D irradianceTexture1;
uniform sampler2D irradianceTexture2;
uniform sampler2D irradianceTexture3;
uniform sampler2D deltaMultipleScatteringTexture2;
uniform sampler2D deltaMultipleScatteringTexture1;
#define COMBINED_SCATTERING_TEXTURES
// #define MESS

#include <AtmosphereUniforms>
#include <AtmosphereConstructor>
#include <AtmosphereFunctions>
#include <textureDimensionsSetup>

vec4 texture3(sampler2D t, vec3 uvw){
  float layer = floor(( uvw.z) * 32.0);
  float cy = floor(layer / 4.0) / 8.0;
  float cx = floor(mod(layer, 4.0)) / 4.0;

  vec2 uv = uvw.xy / vec2(4.0, 8.0);

  vec2 shift = vec2(cx, cy);
  
  uv += shift;
  return texture2D(t, uv);
}

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
  return GetSkyRadiance(a, camera, view_ray, shadow_length, sun_direction,
      transmittance) * a.SkySpectralRadianceToLuminance;
}
Luminance3 GetSkyLuminanceToPoint(AtmosphereParameters a,
    Position camera, Position point, Length shadow_length,
    Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadianceToPoint(a, camera, point, shadow_length, sun_direction,
      transmittance) * a.SkySpectralRadianceToLuminance;
}

Illuminance3 GetSunAndSkyIlluminance( AtmosphereParameters a,
   Position p, Direction normal, Direction sun_direction,
   out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance =
      GetSunAndSkyIrradiance(a, p, normal, sun_direction, sky_irradiance);
  sky_irradiance *= a.SkySpectralRadianceToLuminance;
  return sun_irradiance * a.SunSpectralRadianceToLuminance;
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

vec3 GetSolarRadiance(AtmosphereParameters ATMOSPHERE) {
  return ATMOSPHERE.solar_irradiance /
      (PI * ATMOSPHERE.sun_angular_radius * ATMOSPHERE.sun_angular_radius);
}

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
  vec3 sun_direction = vec3(0., 1.0, 0.0); //sunDirection;
  vec3 earth_center = planetPosition;

  vec3 view_direction = normalize(view_ray);
  // Tangent of the angle subtended by this fragment.
  // float fragment_angular_size =
  //    length(dFdx(view_ray) + dFdy(view_ray)) / length(view_ray);

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
  sphere_radiance = vec3(0.0);

/*
<p>In the following we repeat the same steps as above, but for the planet sphere
P instead of the sphere S (a smooth opacity is not really needed here, so we
don't compute it. Note also how we modulate the sun and sky irradiance received
on the ground by the sun and sky visibility factors):
*/

  // Compute the distance between the view ray line and the Earth center,
  // and the distance between the camera and the intersection of the view
  // ray with the ground (or NaN if there is no intersection).
  p = -earth_center;
  p_dot_v = dot(p, view_direction);
  p_dot_p = dot(p, p);
  float radius = atmosphere.bottom_radius;
  float ray_earth_center_squared_distance = p_dot_p - p_dot_v * p_dot_v;
  float sqrtArg = radius * radius - ray_earth_center_squared_distance;
  distance_to_intersection = -p_dot_v - sqrt(sqrtArg);


  // Compute the radiance reflected by the ground, if the ray intersects it.
  float ground_alpha = 0.0;
  vec3 ground_radiance = vec3(0.0);
  if (sqrtArg > 0.0 && distance_to_intersection > 0.0) {
    vec3 point = camera + view_direction * distance_to_intersection;
    vec3 normal = normalize(point - earth_center);
    

    // Compute the radiance reflected by the ground.
    vec3 sky_irradiance;
    vec3 sun_irradiance = GetSunAndSkyIrradiance(atmosphere, 
        point - earth_center, normal, sun_direction, sky_irradiance);

    vec3 kGroundAlbedo_ = vec3(0.8, 0.4, 0.3);

    ground_radiance = kGroundAlbedo_ * (1.0 / PI) * (
        sun_irradiance * GetSunVisibility(point, sun_direction) +
        sky_irradiance * GetSkyVisibility(point));
    float shadow_length =
        max(0.0, min(shadow_out, distance_to_intersection) - shadow_in) *
        lightshaft_fadein_hack;

    shadow_length = 0.0; 
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
  shadow_length = 0.0;
  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(atmosphere,
      camera - earth_center, view_direction, shadow_length, sun_direction,
      transmittance);

  // If the view ray intersects the Sun, add the Sun radiance.

  if (dot(view_direction, sun_direction) > sun_size.y) {
     radiance = radiance + transmittance * GetSolarRadiance(atmosphere);
  }
  radiance = mix(radiance, ground_radiance, ground_alpha);
  // radiance = mix(radiance, sphere_radiance, sphere_alpha);
  vec3 white_point_ = vec3(1.0, 1.0, 1.0);
  float exposure_ = 10.0;
  vec3 color =
     pow(vec3(1.0) - exp(-radiance / white_point_ * exposure_), vec3(1.0 / 2.2));
  return vec4(color, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  DensityProfile ray, mie, absorp;

  AtmosphereParameters atmosphere;
  atmosphereObjectConstructor(atmosphere);

  setupTextureDimensions(atmosphereTableResolution);


  vec4 color = computeColor(atmosphere);
   //uv.y /= 32.;
   //uv.x /= 8.0;
  //vec4 tr = texture(scatteringTexture, uv);
  // vec4 tr = texture2D(uu, uv);
  // vec4 tr = texture(scatteringTexture3, vec3(uv, 20.0/32.0));
  // vec4 tr = texture3(deltaMultipleScatteringTexture2, vec3(uv, 1.0/32.));

  // vec4 tr = texture(deltaMultipleScatteringTexture2, uv); 
  //      uv.y/8.0 + 5.0 / 8.0));
   // vec4 tr = texture(singleMieScatteringTexture, vec3(uv, 1.0/32.));
  //vec4 tr = texture2D(scatteringDensityTexture2, uv);
  // vec4 tr = texture2D(deltaIrradianceTexture2, uv);
   // vec4 tr = texture2D(irradianceTexture, uv);
  // vec4 sc = texture(scatteringTexture1, vec4( 0.0/8.0, uv, 1.0/ 31.));
  // vec4 tr = texture2D(scatteringTexture, uv);

  //vec4 tr = texture2D(irradianceTexture2, uv);
  //vec4 uuuu = GetScatteringTextureUvwzFromRMuMuSNu(atmosphere,
    //  atmosphere.top_radius-60.0,  0.0, 0.0, 0.0, false);
  // gl_FragColor = vec4(tr.rgb*1.0, 1.0); 

  gl_FragColor = vec4(color.rgb, 1.50);

}
