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
    // 外边缘过渡
    float outer = smoothstep(radius + thickness, radius, dist);
    // 内边缘过渡
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
    float thickness = 0.2;
    
    // 定义色差偏移量 (如果没传 uniform，这里硬编码一个值测试，例如 0.01)
    // 偏移量建议随波纹扩大而稍微减小，或者保持固定均可
    float colorOffset = u_chromaticAberration; 
    // 或者使用 uniform: float colorOffset = u_chromaticAberration;

    // --- 核心修改：分别计算 R、G、B 通道的圆环 ---
    
    // R通道：半径稍微大一点 (波纹外侧偏红)
    float rRing = getRingShape(mouseDist, baseRadius + colorOffset, thickness);
    
    // G通道：保持原始半径
    float gRing = getRingShape(mouseDist, baseRadius, thickness);
    
    // B通道：半径稍微小一点 (波纹内侧偏蓝)
    float bRing = getRingShape(mouseDist, baseRadius - colorOffset, thickness);

    // 组合成带有色差的圆环颜色
    vec3 circleColor = vec3(rRing, gRing, bRing) * feadOut;

    // 3. 背景扭曲处理 (通常扭曲只用主波纹强度，避免画面太乱)
    // 这里我们使用 G通道 (中间值) 作为扭曲强度的依据
    vec2 warpedCoord = vTexCoord;
    warpedCoord -= vec2(gRing * feadOut * u_warpStrength); 
    
    // 获取背景纹理
    vec3 texColor = texture2D(u_tex, warpedCoord).rgb;

    // 4. 混合模式 (Screen 滤色混合)
    // 数学公式: Result = 1 - (1 - Base) * (1 - Blend)
    vec3 color = vec3(1.0) - (vec3(1.0) - circleColor * 0.7) * (vec3(1.0) - texColor);

    // 增加四周的遮罩
    float distToCenter = length(vTexCoord - vec2(0.5));
    float vignette = smoothstep(0.1, 0.6, distToCenter);
    vec3 finalColor = mix(color, vec3(1.0), vignette);

    gl_FragColor = vec4(finalColor, 1.0);
}