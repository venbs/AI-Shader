// 片段着色器 - 处理每个像素的颜色和效果
precision highp float;

varying vec2 vTexCoord;

uniform vec2 u_resolution;
uniform vec2 u_mouseCoord;
uniform float u_time;
uniform sampler2D u_tex;
uniform float u_waveSpeed;
uniform float u_warpStrength;
uniform float u_chromaticAberration; 

// --- 辅助函数：计算单色圆环强度 ---
float getRingShape(float dist, float radius, float thickness) {
    float outer = smoothstep(radius + thickness, radius, dist);
    float inner = smoothstep(radius, radius - thickness, dist);
    return outer - inner;
}

// --- 辅助函数：随机数 (可选，用于一种更散乱的模糊，这里暂时不用) ---
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
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
    // 提前计算距离中心的距离
    float distToCenter = length(vTexCoord - vec2(0.5));
    
    // 使用与下方白色蒙层相同的逻辑，计算模糊的权重
    // 0.1 到 0.6 之间过渡，边缘处值为 1.0，中心为 0.0
    float edgeStrength = smoothstep(0.1, 0.8, distToCenter);
    
    // 定义最大模糊半径 (根据需要调整，0.02 比较适中)
    float maxBlurRadius = 0.05; 
    
    // 当前像素的模糊程度 = 边缘强度 * 最大半径
    float currentBlur = edgeStrength * maxBlurRadius;

    vec3 texColor = vec3(0.0);
    
    // --- 模糊采样循环 ---
    // 如果位于中心区域(模糊度极小)，直接采样一次以节省性能
    if(currentBlur < 0.001) {
        texColor = texture2D(u_tex, warpedCoord).rgb;
    } else {
        // 否则进行简单的盒式模糊 (Box Blur)
        // 循环范围越大，模糊越平滑但性能消耗越高
        // 这里使用 5x5 的网格采样 (x: -2~2, y: -2~2)
        float totalSamples = 0.0;
        for(float x = -2.0; x <= 2.0; x += 1.0) {
            for(float y = -2.0; y <= 2.0; y += 1.0) {
                // 计算偏移量：基于当前模糊强度
                // 0.005 是一个缩放因子，防止步长过大
                vec2 offset = vec2(x, y) * 0.005 * (edgeStrength * 4.0); 
                
                // 累加颜色
                texColor += texture2D(u_tex, warpedCoord + offset).rgb;
                totalSamples += 1.0;
            }
        }
        // 取平均值
        texColor /= totalSamples;
    }

    // 4. 混合模式 (Screen 滤色混合)
    vec3 color = vec3(1.0) - (vec3(1.0) - circleColor * 0.85) * (vec3(1.0) - texColor);

    // 增加四周的白色遮罩 (复用 edgeStrength)
    // mix(颜色, 白色, 强度)
    vec3 finalColor = mix(color, vec3(1.0), edgeStrength);

    gl_FragColor = vec4(finalColor, 1.0);
}