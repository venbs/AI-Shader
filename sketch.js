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
    noiseDetail: 3.0,
    noiseFalloff: 0.5,
    noiseContrast: 3.0,
    noiseSpeed: 5,
    waveSpeed: 1,
    warpStrength: 0.3,
    chromaticAberration: 0.03,
};
let myShader;
let clickTime = 0;

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
    myShader.setUniform('u_mouseCoord', [width / 2, height / 2]);
}

function draw() {

    // 设置噪波参数
    let noiseLevel = 255;
    noiseDetail(params.noiseDetail, params.noiseFalloff);
    let noiseScale = params.noiseScale;
    let step = 5; // 步长：设置为1获得平滑效果
    let colors = [
        [params.colorA.r, params.colorA.g, params.colorA.b],        // 颜色1 [R, G, B]
        [params.colorB.r, params.colorB.g, params.colorB.b],    // 颜色2
        [params.colorC.r, params.colorC.g, params.colorC.b],    // 颜色3
        [params.colorD.r, params.colorD.g, params.colorD.b]    // 颜色4
    ];

    // 使用 loadPixels 提升性能

    gfx.loadPixels();

    // 遍历像素（使用步长优化）
    for (let y = 0; y < gfx.height; y += step) {
        for (let x = 0; x < gfx.width; x += step) {
            // 缩放输入坐标
            let nx = noiseScale * x / 10000;
            let ny = noiseScale * y / 10000;
            let nt = noiseScale * frameCount * params.noiseSpeed / 10000;
            // 计算噪波值
            let c = noiseLevel * noise(nx, ny, nt);
            let contrast = params.noiseContrast;
            c = constrain((c - 128) * contrast + 128, 0, 255);

            let segment = floor(c / 85);
            if (segment === 3 && c === 255) {
                t = 1;
            } else {
                t = (c % 85) / 85;
            }
            segment = constrain(segment, 0, 2);

            let r = lerp(colors[segment][0], colors[segment + 1][0], t);
            let g = lerp(colors[segment][1], colors[segment + 1][1], t);
            let b = lerp(colors[segment][2], colors[segment + 1][2], t);

            let index = (x + y * gfx.width) * 4;
            gfx.pixels[index] = r;     // R
            gfx.pixels[index + 1] = g; // G
            gfx.pixels[index + 2] = b; // B
            gfx.pixels[index + 3] = 255; // A

            // 如果步长大于1，填充相邻像素
            if (step > 1) {
                for (let dy = 0; dy < step && y + dy < gfx.height; dy++) {
                    for (let dx = 0; dx < step && x + dx < gfx.width; dx++) {
                        let idx = ((x + dx) + (y + dy) * gfx.width) * 4;
                        gfx.pixels[idx] = r;
                        gfx.pixels[idx + 1] = g;
                        gfx.pixels[idx + 2] = b;
                        gfx.pixels[idx + 3] = 255;
                    }
                }
            }
        }
    }
    gfx.updatePixels();
    background(255);

    shader(myShader);
    myShader.setUniform('u_tex', gfx);
    myShader.setUniform('u_resolution', [width, height]);
    myShader.setUniform('u_time', (millis() - clickTime) / 1000.0);
    myShader.setUniform('u_waveSpeed', params.waveSpeed); // 波浪速度
    myShader.setUniform('u_warpStrength', params.warpStrength);
    myShader.setUniform('u_chromaticAberration', params.chromaticAberration);

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
    clickTime = millis();
    // Y坐标需要翻转：p5.js坐标系原点在左上，WebGL坐标系原点在左下
    myShader.setUniform('u_mouseCoord', [mouseX, height - mouseY]);
  }
  


