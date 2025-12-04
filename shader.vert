// 顶点着色器 - 处理顶点位置和纹理坐标

// 输入：顶点位置（3D坐标）
attribute vec3 aPosition;
// 输入：纹理坐标（2D坐标，范围0-1）
attribute vec2 aTexCoord;
// 输出：传递给片段着色器的纹理坐标
varying vec2 vTexCoord;

void main() {
  // 将纹理坐标传递给片段着色器
  vTexCoord = aTexCoord;
  
  // 将3D位置转换为4D齐次坐标（w=1.0表示点）
  vec4 positionVec4 = vec4(aPosition, 1.0);
  
  // 将xy坐标放大2倍，使平面覆盖整个屏幕（从-1到1的范围）
  positionVec4.xy = positionVec4.xy * 2.0;
  
  // 设置最终顶点位置（输出到GPU）
  gl_Position = positionVec4;
}

