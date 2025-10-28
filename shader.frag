precision highp float;
varying vec2 vTexCoord;
uniform vec2 u_resolution;
uniform vec2 u_mouseCoord;
uniform float u_time;
uniform sampler2D u_tex;
uniform float u_waveSpeed;
uniform float u_warpStrength;

void main() {
  vec2 st = vTexCoord * 2.0 - 1.0;
  float wave = sin(u_time * u_waveSpeed); 
  vec2 mousePos = u_mouseCoord / u_resolution * 2.0 - 1.0;
  st.x *= u_resolution.x / u_resolution.y;
  mousePos.x *= u_resolution.x / u_resolution.y;
  float radius = u_time * u_waveSpeed;
  float mouseDist = length(st - mousePos);
  float feadOut = max(1.0 - u_time*0.3,0.0);
  float thickness = 0.2;  // 圆环厚度
  float outerCircle = smoothstep(radius + thickness, radius, mouseDist);
  float innerCircle = smoothstep(radius, radius - thickness, mouseDist);
  float circle = feadOut * (outerCircle - innerCircle) * 1.0;
  vec3 circleColor = vec3(circle) * 0.8;  

  vec2 warpedCoord = vTexCoord;
  warpedCoord -= vec2(circle * u_warpStrength, circle * u_warpStrength);
  
  vec3 texColor = texture2D(u_tex, warpedCoord).rgb;

  
  vec3 color = vec3(1.0) - (vec3(1.0) - circleColor) * (vec3(1.0) - texColor);

  float mask = pow(length(st),10.0);
  color += mask;
  gl_FragColor = vec4(color,1.0);
}
