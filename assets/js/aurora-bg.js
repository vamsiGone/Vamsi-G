'use strict';

/**
 * Lightweight WebGL "aurora" background for the hero section.
 * Fails silently: if WebGL is unavailable, reduced-motion is requested,
 * or anything throws during setup, the canvas is simply left blank and
 * the CSS gradient fallback underneath (.hero-gradient) remains visible.
 */
(function () {

  var canvas = document.getElementById('aurora-canvas');
  if (!canvas) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  if (prefersReducedMotion || isSmallScreen) return;

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  var VERTEX_SRC = [
    'attribute vec2 aPosition;',
    'void main() {',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAGMENT_SRC = [
    'precision highp float;',
    'uniform vec2 uResolution;',
    'uniform float uTime;',
    'uniform vec3 uColorA;',
    'uniform vec3 uColorB;',
    'uniform vec3 uColorC;',
    'uniform float uIntensity;',
    'uniform vec2 uMouse;',

    'float hash(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',

    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;',
    '}',

    'float fbm(vec2 p) {',
    '  float value = 0.0;',
    '  float amp = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    value += amp * noise(p);',
    '    p *= 2.02;',
    '    amp *= 0.55;',
    '  }',
    '  return value;',
    '}',

    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uResolution.xy;',
    '  vec2 p = uv;',
    '  p.x *= uResolution.x / uResolution.y;',

    '  vec2 mouseP = uMouse;',
    '  mouseP.x *= uResolution.x / uResolution.y;',
    '  vec2 toMouse = p - mouseP;',
    '  float distToMouse = length(toMouse);',
    '  float ripple = smoothstep(0.55, 0.0, distToMouse);',
    '  p += normalize(toMouse + 0.0001) * ripple * 0.14 * sin(distToMouse * 9.0 - uTime * 1.6);',

    '  float t = uTime * 0.045;',

    '  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t)));',
    '  vec2 r = vec2(',
    '    fbm(p * 1.6 + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),',
    '    fbm(p * 1.6 + 4.0 * q + vec2(8.3, 2.8) + 0.12 * t)',
    '  );',

    '  float f = fbm(p * 1.2 + 4.0 * r);',

    '  vec3 color = mix(uColorA, uColorB, clamp(f * f * 2.2, 0.0, 1.0));',
    '  color = mix(color, uColorC, clamp(length(r) * 0.7, 0.0, 1.0));',

    '  float glow = smoothstep(0.1, 0.85, f);',
    '  float vertical = smoothstep(1.0, 0.1, uv.y);',

    '  float alpha = glow * vertical * uIntensity;',

    '  gl_FragColor = vec4(color, alpha);',
    '}'
  ].join('\n');

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
  var fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vertexShader || !fragmentShader) return;

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  gl.useProgram(program);

  var quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  var uResolution = gl.getUniformLocation(program, 'uResolution');
  var uTime = gl.getUniformLocation(program, 'uTime');
  var uColorA = gl.getUniformLocation(program, 'uColorA');
  var uColorB = gl.getUniformLocation(program, 'uColorB');
  var uColorC = gl.getUniformLocation(program, 'uColorC');
  var uIntensity = gl.getUniformLocation(program, 'uIntensity');
  var uMouse = gl.getUniformLocation(program, 'uMouse');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ---- color sampling from CSS custom properties ----
  var swatchCanvas = document.createElement('canvas');
  swatchCanvas.width = 1;
  swatchCanvas.height = 1;
  var swatchCtx = swatchCanvas.getContext('2d');

  function cssColorToRgbFloat(colorStr) {
    swatchCtx.clearRect(0, 0, 1, 1);
    swatchCtx.fillStyle = '#000';
    swatchCtx.fillStyle = colorStr;
    swatchCtx.fillRect(0, 0, 1, 1);
    var d = swatchCtx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  // ---- rgb <-> hsl, used to slowly drift the palette's hue over time ----
  function rgbToHsl(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }

  var colors = { a: [0.96, 0.73, 0.26], b: [1, 0.54, 0.24], c: [0.55, 0.49, 0.96] };
  var baseHsl = { a: rgbToHsl.apply(null, colors.a), b: rgbToHsl.apply(null, colors.b), c: rgbToHsl.apply(null, colors.c) };

  // full hue rotation takes this long (seconds) — slow enough that the shift
  // is invisible moment-to-moment but sweeps through cool tones (teal, green, blue) over time
  var HUE_CYCLE_SECONDS = 420;

  function refreshColors() {
    try {
      var styles = getComputedStyle(document.documentElement);
      var a = cssColorToRgbFloat(styles.getPropertyValue('--aurora-1').trim() || '#f5b942');
      var b = cssColorToRgbFloat(styles.getPropertyValue('--aurora-2').trim() || '#ff8a3d');
      var c = cssColorToRgbFloat(styles.getPropertyValue('--aurora-3').trim() || '#8b7cf6');
      baseHsl.a = rgbToHsl(a[0], a[1], a[2]);
      baseHsl.b = rgbToHsl(b[0], b[1], b[2]);
      baseHsl.c = rgbToHsl(c[0], c[1], c[2]);
    } catch (e) { /* keep previous colors */ }
  }

  function updateDriftedColors(elapsedSeconds) {
    var hueShift = (elapsedSeconds / HUE_CYCLE_SECONDS) % 1;
    var a = hslToRgb((baseHsl.a[0] + hueShift) % 1, baseHsl.a[1], baseHsl.a[2]);
    var b = hslToRgb((baseHsl.b[0] + hueShift) % 1, baseHsl.b[1], baseHsl.b[2]);
    var c = hslToRgb((baseHsl.c[0] + hueShift) % 1, baseHsl.c[1], baseHsl.c[2]);
    colors.a = a;
    colors.b = b;
    colors.c = c;
  }

  refreshColors();
  window.addEventListener('themechange', refreshColors);

  // ---- mouse-reactive distortion ----
  var hero = canvas.closest('.hero');
  var mouseTarget = [0.5, 0.5];
  var mouseCurrent = [0.5, 0.5];

  function updateMouseTarget(e) {
    var rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouseTarget[0] = (e.clientX - rect.left) / rect.width;
    mouseTarget[1] = 1 - (e.clientY - rect.top) / rect.height;
  }

  if (hero) {
    hero.addEventListener('mousemove', updateMouseTarget, { passive: true });
    hero.addEventListener('mouseleave', function () { mouseTarget[0] = 0.5; mouseTarget[1] = 0.5; }, { passive: true });
  }

  // ---- sizing ----
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var pw = Math.round(w * dpr);
    var ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---- render loop, paused off-screen / hidden tab ----
  var running = true;
  var rafId = null;
  var startTime = performance.now();

  function frame(now) {
    if (!running) return;
    resize();
    mouseCurrent[0] += (mouseTarget[0] - mouseCurrent[0]) * 0.07;
    mouseCurrent[1] += (mouseTarget[1] - mouseCurrent[1]) * 0.07;
    updateDriftedColors((now - startTime) / 1000);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - startTime) / 1000);
    gl.uniform3f(uColorA, colors.a[0], colors.a[1], colors.a[2]);
    gl.uniform3f(uColorB, colors.b[0], colors.b[1], colors.b[2]);
    gl.uniform3f(uColorC, colors.c[0], colors.c[1], colors.c[2]);
    gl.uniform1f(uIntensity, 0.85);
    gl.uniform2f(uMouse, mouseCurrent[0], mouseCurrent[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running && rafId === null) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { running = true; start(); }
  });

  if ('IntersectionObserver' in window) {
    if (hero) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !document.hidden) { running = true; start(); } else { stop(); }
        });
      }, { threshold: 0.01 });
      io.observe(hero);
    }
  }

  running = true;
  start();

})();
