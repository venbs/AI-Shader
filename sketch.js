// P5.js 创意编程模板
// 在这里开始你的创意！
let pane;
let gfx;
let params = {
    colorA: { r: 179, g: 215, b: 255 },
    colorB: { r: 61, g: 141, b: 255 },
    colorC: { r: 229, g: 209, b: 255 },
    colorD: { r: 255, g: 255, b: 255 },
    fps: 0,
    noiseScale: 10.0,
    noiseDetail: 2.0,
    noiseFalloff: 0.2,
    noiseContrast: 3.0,
    noiseSpeed: 5,
    waveSpeed: 1,
    warpStrength: 0.3,
    chromaticAberration: 0.03,
};
let myShader;
let clickTime = 0;
const MAX_RIPPLES = 20;
let activeRipples = [];

function preload() {
    myShader = loadShader('shader.vert', 'shader.frag');
}


function setup() {
    // 创建画布（全屏）- 启用 WebGL 加速
    createCanvas(windowWidth, windowHeight, WEBGL);
    pixelDensity(1); // 降低像素密度以提升性能
    // 创建一个离屏 2D 缓冲区（gfx）
    gfx = createGraphics(windowWidth, windowHeight);
    gfx.pixelDensity(1);

    // 创建调参面板
    pane = new Pane({ title: 'AI DOUYIN EFFECT' });

    // 配置驱动的参数绑定
    const bindings = [
        { key: 'fps', options: { readonly: true } },
        { key: 'noiseScale', options: { min: 1, max: 100 } },
        { key: 'noiseDetail', options: { min: 1, max: 10 } },
        { key: 'noiseFalloff', options: { min: 0.1, max: 1 } },
        { key: 'noiseContrast', options: { min: 1, max: 5 } },
        { key: 'noiseSpeed', options: { min: 0, max: 20 } },
        { key: 'colorA', options: { type: 'color' } },
        { key: 'colorB', options: { type: 'color' } },
        { key: 'colorC', options: { type: 'color' } },
        { key: 'colorD', options: { type: 'color' } },
        { key: 'waveSpeed', options: { min: 0.5, max: 5 } },
        { key: 'warpStrength', options: { min: 0.1, max: 1 } },
        { key: 'chromaticAberration', options: { min: 0.001, max: 0.04 } }
    ];

    bindings.forEach(({ key, options }) => pane.addBinding(params, key, options));

    // Add Snapshot Button
    pane.addButton({
        title: 'Take Snapshot',
    }).on('click', () => {
        save('wave_ripple_' + floor(millis()) + '.jpg');
    });
    // myShader.setUniform('u_mouseCoord', [width / 2, height / 2]); // This initial uniform is no longer needed
}

function draw() {

    // 准备颜色数据 (归一化到 0-1)
    let colorA = [params.colorA.r / 255, params.colorA.g / 255, params.colorA.b / 255];
    let colorB = [params.colorB.r / 255, params.colorB.g / 255, params.colorB.b / 255];
    let colorC = [params.colorC.r / 255, params.colorC.g / 255, params.colorC.b / 255];
    let colorD = [params.colorD.r / 255, params.colorD.g / 255, params.colorD.b / 255];

    background(255);

    // 更新涟漪状态：移除过期的
    let currentTime = millis() / 1000.0;
    activeRipples = activeRipples.filter(r => (currentTime - r.startTime) < 4.0); // 4秒后淡出

    // 准备传递给 shader 的数组 (平铺数据)
    // GLSL 数组：[x1, y1, x2, y2, ...]
    let ripplePosArr = [];
    let rippleTimeArr = [];

    // 限制最大数量 (取最新的 MAX_RIPPLES 个)
    let renderRipples = activeRipples.slice(-MAX_RIPPLES);

    for (let r of renderRipples) {
        ripplePosArr.push(r.x);
        ripplePosArr.push(r.y);
        rippleTimeArr.push(currentTime - r.startTime);
    }

    // 补齐数组长度以满足 shader 的固定长度要求 (如果需要严格匹配)
    // p5.js shader setUniform传递数组通常会自动处理，但为了安全最好填满可以用0或负值
    // 这里我们传入实际数量 count，在 shader 里 loop < count 即可，数组长度不足部分 p5 会补0? 
    // 安全起见，手动补齐0
    while (ripplePosArr.length < MAX_RIPPLES * 2) {
        ripplePosArr.push(-1000, -1000); // 放到屏幕外
    }
    while (rippleTimeArr.length < MAX_RIPPLES) {
        rippleTimeArr.push(100.0); // 使得 time > 4.0 从而没有任何效果
    }


    shader(myShader);

    // 传递颜色 uniform
    myShader.setUniform('u_colorA', colorA);
    myShader.setUniform('u_colorB', colorB);
    myShader.setUniform('u_colorC', colorC);
    myShader.setUniform('u_colorD', colorD);

    // 传递噪波参数 uniform
    myShader.setUniform('u_noiseScale', params.noiseScale);
    myShader.setUniform('u_noiseDetail', params.noiseDetail);
    myShader.setUniform('u_noiseFalloff', params.noiseFalloff);
    myShader.setUniform('u_noiseContrast', params.noiseContrast);
    myShader.setUniform('u_noiseSpeed', params.noiseSpeed);

    // 其他 uniforms
    myShader.setUniform('u_resolution', [width, height]);
    // myShader.setUniform('u_time', (millis() - clickTime) / 1000.0); // Replaced by individual ripple times
    myShader.setUniform('u_absoluteTime', currentTime);
    myShader.setUniform('u_frameCount', frameCount);
    myShader.setUniform('u_waveSpeed', params.waveSpeed);
    myShader.setUniform('u_warpStrength', params.warpStrength);
    myShader.setUniform('u_chromaticAberration', params.chromaticAberration);

    // 多重涟漪 uniforms
    myShader.setUniform('u_rippleCount', renderRipples.length); // JS Number passed to float uniform works fine
    myShader.setUniform('u_ripplePos', ripplePosArr);
    myShader.setUniform('u_rippleTime', rippleTimeArr);

    plane(width, height);
    params.fps = floor(frameRate());
}

// 当窗口大小改变时，重新调整画布
function windowResized() {
    resizeCanvas(windowWidth, windowHeight, WEBGL);
    gfx = createGraphics(windowWidth, windowHeight);
}

function mousePressed() {
    // 检查点击事件是否发生在 canvas 上，避免点击参数面板时触发
    if (event && event.target.tagName !== 'CANVAS') {
        return;
    }
    // 添加新涟漪
    // Y坐标需要翻转：p5.js坐标系原点在左上，WebGL坐标系原点在左下
    activeRipples.push({
        x: mouseX,
        y: height - mouseY,
        startTime: millis() / 1000.0
    });
    // myShader.setUniform('u_mouseCoord', [mouseX, height - mouseY]); // This is no longer needed
}
