// Riso Camera sketch
// Full-screen webcam processed through two Riso ink layers in real time.

let capture, ink1, ink2, mirrorBuffer;
let frozen = false, frozenFrame = null;
// On touch devices (phones/tablets) start with the rear camera.
// On desktop leave unconstrained so any webcam works.
let facingMode = ('ontouchstart' in window) ? 'environment' : null;

function calcCanvasSize() {
  // 3:4 portrait aspect ratio (standard iOS photo)
  const aspect = 3 / 4;
  if (windowWidth / windowHeight > aspect) {
    // window is wider than 3:4 — fit to height
    return { w: Math.floor(windowHeight * aspect), h: windowHeight };
  } else {
    // window is narrower — fit to width
    return { w: windowWidth, h: Math.floor(windowWidth / aspect) };
  }
}

function setup() {
  pixelDensity(1);
  const { w, h } = calcCanvasSize();
  let cnv = createCanvas(w, h);
  cnv.parent('canvas-container');
  frameRate(6);
  buildLayers();
  startCamera();
}

function buildLayers() {
  Riso.channels = [];
  ink1 = new Riso(window.cfg.color1);
  ink2 = new Riso(window.cfg.color2);
}

function startCamera() {
  if (capture) capture.remove();
  // Use plain VIDEO on initial load (no facingMode constraint) — same as webcam demo.
  // After a flip, use ideal constraints so it works on both desktop and mobile.
  const constraints = facingMode
    ? { video: { facingMode: { ideal: facingMode } }, audio: false }
    : VIDEO;
  capture = createCapture(constraints);
  capture.hide();
  mirrorBuffer = createGraphics(width, height);
}

function getFrame() {
  const vw = capture.elt.videoWidth;
  const vh = capture.elt.videoHeight;

  // Cover-fit: scale video to fill canvas, cropping excess rather than stretching
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  mirrorBuffer.clear();
  mirrorBuffer.push();
  if (facingMode === 'user') {
    mirrorBuffer.translate(width, 0);
    mirrorBuffer.scale(-1, 1);
  }
  mirrorBuffer.image(capture, dx, dy, dw, dh);
  mirrorBuffer.pop();

  return mirrorBuffer.get();
}

function draw() {
  background(240);

  if (!capture || !capture.elt.videoWidth) {
    fill(30);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textFont('monospace');
    text('waiting for camera...', width / 2, height / 2);
    return;
  }

  clearRiso();

  const frame = (frozen && frozenFrame) ? frozenFrame : getFrame();
  const { dither, halftone, mode, threshold, frequency } = window.cfg;

  if (mode === 'both' || mode === 'dither') {
    let d = ditherImage(frame, dither, threshold);
    ink1.image(d, 0, 0);
  }
  if (mode === 'both' || mode === 'halftone') {
    let h = halftoneImage(frame, halftone, frequency, 45, 100);
    ink2.image(h, 0, 0);
  }

  drawRiso();
}

function windowResized() {
  const { w, h } = calcCanvasSize();
  resizeCanvas(w, h);
  mirrorBuffer = createGraphics(w, h);
}

// --- API exposed to the HTML UI ---

window.rebuildLayers = function () {
  buildLayers();
  if (frozen) redraw();
};

window.captureFrame = function () {
  frozenFrame = getFrame();
  frozen = true;
  noLoop();
  redraw();
  window.setFrozenUI && window.setFrozenUI(true);
};

window.retake = function () {
  frozen = false;
  frozenFrame = null;
  loop();
  window.setFrozenUI && window.setFrozenUI(false);
};

window.saveCapture = function () {
  saveCanvas('riso-capture', 'png');
};

window.flipCamera = function () {
  facingMode = (!facingMode || facingMode === 'environment') ? 'user' : 'environment';
  // Resume live view when switching camera
  if (frozen) {
    frozen = false;
    frozenFrame = null;
    window.setFrozenUI && window.setFrozenUI(false);
  }
  startCamera();
  loop();
};

window.isFrozen = function () { return frozen; };
window.redrawFrozen = function () { if (frozen) redraw(); };
