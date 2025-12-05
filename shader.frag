// 片段着色器 - 处理每个像素的颜色和效果
precision highp float;

varying vec2 vTexCoord;

uniform vec2 u_resolution;
uniform vec2 u_mouseCoord;
uniform float u_time;           // 用于涟漪效果的时间
uniform float u_absoluteTime;   // 用于噪波的时间
uniform float u_frameCount;     // 帧数，用于跟p5逻辑对齐
uniform sampler2D u_tex;        // (不再使用，但保留定义以免报错)

uniform float u_waveSpeed;
uniform float u_warpStrength;
uniform float u_chromaticAberration;

// 颜色参数
uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec3 u_colorC;
uniform vec3 u_colorD;

// 噪波参数
uniform float u_noiseScale;
uniform float u_noiseDetail; 
uniform float u_noiseFalloff;
uniform float u_noiseContrast;
uniform float u_noiseSpeed;

// --- Classic Perlin 3D Noise (from stegu/webgl-noise) ---
// https://github.com/stegu/webgl-noise/blob/master/src/classicnoise3D.glsl

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = Pf0 * Pf0 * Pf0 * (Pf0 * (Pf0 * 6.0 - 15.0) + 10.0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

// --- 辅助函数：生成背景噪波颜色 ---
vec3 getNoiseColor(vec2 coord) {
    // 1. 坐标缩放映射 (模拟 p5 的 mapping)
    // p5: let nx = noiseScale * x / 10000; (x 是像素坐标)
    // glsl: coord 是 uv 坐标, 所以 pixelX = coord.x * u_resolution.x
    float px = coord.x * u_resolution.x;
    float py = coord.y * u_resolution.y;
    
    // 原逻辑: let nx = noiseScale * x / 10000;
    float nx = u_noiseScale * px / 10000.0;
    float ny = u_noiseScale * py / 10000.0;
    // 原逻辑: let nt = noiseScale * frameCount * params.noiseSpeed / 10000;
    float nt = u_noiseScale * u_frameCount * u_noiseSpeed / 10000.0;
    
    // 2. 计算噪波 (FBM 多重采样)
    float n = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    float maxAmp = 0.0;
    
    // 循环执行 u_noiseDetail 次
    // WebGL 1.0 中循环次数最好是常量，或者有固定上限。这里设定上限 10
    for(int i = 0; i < 10; i++) {
        if(float(i) >= u_noiseDetail) break;
        
        // 累加当前八度的噪波值
        // cnoise 返回约 -1~1，转换到 0~1
        n += (cnoise(vec3(nx, ny, nt) * freq) * 0.5 + 0.5) * amp;
        
        maxAmp += amp;
        amp *= u_noiseFalloff;
        freq *= 2.0; // P5 默认 lacunarity 是 2
    }
    
    // 归一化结果到 0~1
    n /= maxAmp;

    // 3. 对比度调整
    // c = constrain((c - 128) * contrast + 128, 0, 255);
    // 归一化后: c = clamp((n - 0.5) * contrast + 0.5, 0.0, 1.0)
    float c = clamp((n - 0.5) * u_noiseContrast + 0.5, 0.0, 1.0);
    
    // 4. 颜色插值 (Segment logic)
    // 0-85, 85-170, 170-255 -> 0-1/3, 1/3-2/3, 2/3-1
    float oneThird = 1.0 / 3.0;
    float twoThirds = 2.0 / 3.0;
    
    vec3 finalColor;
    
    if (c < oneThird) {
        float t = c / oneThird;
        finalColor = mix(u_colorA, u_colorB, t);
    } else if (c < twoThirds) {
        float t = (c - oneThird) / oneThird;
        finalColor = mix(u_colorB, u_colorC, t);
    } else {
        float t = (c - twoThirds) / oneThird; // 这里范围实际是 2/3 到 1.0
        // 防止 t > 1.0 (如果 c 就是 1.0)
        t = min(t, 1.0);
        finalColor = mix(u_colorC, u_colorD, t);
    }
    
    return finalColor;
}


// --- 辅助函数：计算单色圆环强度 ---
float getRingShape(float dist, float radius, float thickness) {
    float outer = smoothstep(radius + thickness, radius, dist);
    float inner = smoothstep(radius, radius - thickness, dist);
    return outer - inner;
}

void main() {
    // 1. 坐标归一化处理
    vec2 st = vTexCoord * 2.0 - 1.0;
    vec2 mousePos = u_mouseCoord / u_resolution * 2.0 - 1.0;
    
    // 修正宽高比
    float aspect = u_resolution.x / u_resolution.y;
    st.x *= aspect;
    mousePos.x *= aspect;
    
    // 2. 基础参数计算
    float baseRadius = u_time * u_waveSpeed;
    float mouseDist = length(st - mousePos);
    float feadOut = max(1.0 - u_time * 0.3, 0.0);
    float thickness = 0.25;
    float colorOffset = u_chromaticAberration; 

    // --- 色差圆环计算 ---
    float rRing = getRingShape(mouseDist, baseRadius + colorOffset, thickness);
    float gRing = getRingShape(mouseDist, baseRadius, thickness);
    float bRing = getRingShape(mouseDist, baseRadius - colorOffset, thickness);

    // 组合成带有色差的圆环颜色
    vec3 circleColor = vec3(rRing, gRing, bRing) * feadOut;

    // 3. 背景扭曲处理
    vec2 warpedCoord = vTexCoord;
    warpedCoord -= vec2(gRing * feadOut * u_warpStrength); 
    
    // --- 核心修改：计算边缘模糊强度 ---
    float distToCenter = length(vTexCoord - vec2(0.5));
    float edgeStrength = smoothstep(0.1, 0.8, distToCenter);
    float maxBlurRadius = 0.05; 
    float currentBlur = edgeStrength * maxBlurRadius;

    vec3 texColor = vec3(0.0);
    
    // --- 模糊采样循环 (现在调用 getNoiseColor 而不是 texture2D) ---
    if(currentBlur < 0.001) {
        texColor = getNoiseColor(warpedCoord);
    } else {
        float totalSamples = 0.0;
        // 降低循环次数以进一步优化性能，或者保持不变
        for(float x = -2.0; x <= 2.0; x += 1.0) {
            for(float y = -2.0; y <= 2.0; y += 1.0) {
                vec2 offset = vec2(x, y) * 0.005 * (edgeStrength * 4.0); 
                texColor += getNoiseColor(warpedCoord + offset);
                totalSamples += 1.0;
            }
        }
        texColor /= totalSamples;
    }

    // 4. 混合模式 (Screen 滤色混合)
    vec3 color = vec3(1.0) - (vec3(1.0) - circleColor * 0.85) * (vec3(1.0) - texColor);

    // 增加四周的白色遮罩 (复用 edgeStrength)
    vec3 finalColor = mix(color, vec3(1.0), edgeStrength);

    gl_FragColor = vec4(finalColor, 1.0);
}