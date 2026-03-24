// ---- Shared config ----
const _savedCfg = (() => {
  try { return JSON.parse(localStorage.getItem('riso-cfg') || '{}'); } catch { return {}; }
})();

window.cfg = {
  color1:    _savedCfg.color1    ?? 'fluorescentpink',
  color2:    _savedCfg.color2    ?? 'blue',
  dither:    _savedCfg.dither    ?? 'atkinson',
  halftone:  _savedCfg.halftone  ?? 'circle',
  mode:      _savedCfg.mode      ?? 'both',
  threshold: _savedCfg.threshold ?? 130,
  frequency: _savedCfg.frequency ?? 5,
};

function saveCfg() {
  try { localStorage.setItem('riso-cfg', JSON.stringify(window.cfg)); } catch {}
}

const PALETTE = [
  { name: 'red',             label: 'Red',        hex: '#ff665e' },  // ~3°
  { name: 'orange',          label: 'Orange',     hex: '#ff6c2f' },  // ~18°
  { name: 'sunflower',       label: 'Sunflower',  hex: '#ffb511' },  // ~41°
  { name: 'yellow',          label: 'Yellow',     hex: '#ffe800' },  // ~55°
  { name: 'green',           label: 'Green',      hex: '#00a95c' },  // ~153°
  { name: 'mint',            label: 'Mint',       hex: '#82d8d5' },  // ~178°
  { name: 'teal',            label: 'Teal',       hex: '#00838a' },  // ~183°
  { name: 'aqua',            label: 'Aqua',       hex: '#5ec8e5' },  // ~193°
  { name: 'blue',            label: 'Blue',       hex: '#0078bf' },  // ~202°
  { name: 'cornflower',      label: 'Cornflower', hex: '#62a8e5' },  // ~208°
  { name: 'purple',          label: 'Purple',     hex: '#765ba7' },  // ~261°
  { name: 'orchid',          label: 'Orchid',     hex: '#aa60bf' },  // ~287°
  { name: 'bubblegum',       label: 'Bubblegum',  hex: '#f984ca' },  // ~324°
  { name: 'fluorescentpink', label: 'F. Pink',    hex: '#ff48b0' },  // ~326°
  { name: 'black',           label: 'Black',      hex: '#1a1a1a' },
];

// ---- Build swatches ----
function buildSwatches(containerId, colorKey, selClass) {
  const container = document.getElementById(containerId);
  PALETTE.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'swatch' + (window.cfg[colorKey] === c.name ? ' ' + selClass : '');
    btn.style.background = c.hex;
    btn.title = c.label;
    btn.dataset.name = c.name;
    btn.addEventListener('click', () => {
      window.cfg[colorKey] = c.name;
      document.getElementById(colorKey === 'color1' ? 'ink1-name' : 'ink2-name').textContent = c.label;
      container.querySelectorAll('.swatch').forEach(s =>
        s.classList.toggle(selClass, s.dataset.name === c.name));
      saveCfg();
      window.rebuildLayers && window.rebuildLayers();
    });
    container.appendChild(btn);
  });
}

buildSwatches('ink1-swatches', 'color1', 'sel1');
buildSwatches('ink2-swatches', 'color2', 'sel2');

// Set initial label text
document.getElementById('ink1-name').textContent =
  PALETTE.find(p => p.name === window.cfg.color1)?.label || '';
document.getElementById('ink2-name').textContent =
  PALETTE.find(p => p.name === window.cfg.color2)?.label || '';

// ---- Build pills ----
function buildPills(containerId, options, cfgKey, onChange) {
  const container = document.getElementById(containerId);
  options.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (window.cfg[cfgKey] === o.value ? ' active' : '');
    btn.textContent = o.label;
    btn.addEventListener('click', () => {
      window.cfg[cfgKey] = o.value;
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      saveCfg();
      onChange && onChange(o.value);
      if (window.isFrozen && window.isFrozen()) window.redrawFrozen && window.redrawFrozen();
    });
    container.appendChild(btn);
  });
}

buildPills('mode-pills', [
  { label: 'Dither + Halftone', value: 'both'     },
  { label: 'Dither only',       value: 'dither'   },
  { label: 'Halftone only',     value: 'halftone' },
], 'mode', updateEffectSections);

buildPills('dither-pills', [
  { label: 'Atkinson',       value: 'atkinson'      },
  { label: 'Bayer',          value: 'bayer'         },
  { label: 'Floyd-Steinberg',value: 'floydsteinberg'},
  { label: 'Threshold',      value: 'none'          },
], 'dither');

buildPills('halftone-pills', [
  { label: 'Circle', value: 'circle' },
  { label: 'Line',   value: 'line'   },
  { label: 'Square', value: 'square' },
  { label: 'Cross',  value: 'cross'  },
], 'halftone');

function updateEffectSections(mode) {
  const m = mode || window.cfg.mode;
  document.getElementById('dither-section').style.display  =
    (m === 'both' || m === 'dither')   ? '' : 'none';
  document.getElementById('halftone-section').style.display =
    (m === 'both' || m === 'halftone') ? '' : 'none';
}
updateEffectSections();

// ---- Sliders ----
function updateSliderFill(slider) {
  const pct = (slider.value - slider.min) / (slider.max - slider.min);
  slider.style.setProperty('--pct', pct);
}

const thSlider = document.getElementById('threshold-slider');
const thVal    = document.getElementById('threshold-val');
thSlider.value   = window.cfg.threshold;
thVal.textContent = window.cfg.threshold;
updateSliderFill(thSlider);
thSlider.addEventListener('input', () => {
  window.cfg.threshold = parseInt(thSlider.value);
  thVal.textContent = thSlider.value;
  updateSliderFill(thSlider);
  saveCfg();
  if (window.isFrozen && window.isFrozen()) window.redrawFrozen && window.redrawFrozen();
});

const frSlider = document.getElementById('frequency-slider');
const frVal    = document.getElementById('frequency-val');
frSlider.value    = window.cfg.frequency;
frVal.textContent = window.cfg.frequency;
updateSliderFill(frSlider);
frSlider.addEventListener('input', () => {
  window.cfg.frequency = parseInt(frSlider.value);
  frVal.textContent = frSlider.value;
  updateSliderFill(frSlider);
  saveCfg();
  if (window.isFrozen && window.isFrozen()) window.redrawFrozen && window.redrawFrozen();
});

// ---- Settings panel open/close ----
const panel    = document.getElementById('settings-panel');
const backdrop = document.getElementById('settings-backdrop');

document.getElementById('settings-btn').addEventListener('click', () => {
  panel.classList.add('open');
  backdrop.classList.add('visible');
});
backdrop.addEventListener('click', () => {
  panel.classList.remove('open');
  backdrop.classList.remove('visible');
});

// ---- Camera controls ----
document.getElementById('capture-btn').addEventListener('click', () =>
  window.captureFrame && window.captureFrame());
document.getElementById('retake-btn').addEventListener('click', () =>
  window.retake && window.retake());
document.getElementById('save-btn').addEventListener('click', () => {
  if (!window.saveCapture) return;
  // Use Web Share API on iOS/mobile (download attribute is ignored by Safari)
  const canvas = document.querySelector('#canvas-container canvas');
  if (canvas && navigator.share) {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'riso-capture.png', { type: 'image/png' });
      try {
        await navigator.share({ files: [file] });
      } catch (e) {
        if (e.name !== 'AbortError') window.saveCapture();
      }
    }, 'image/png');
  } else {
    window.saveCapture();
  }
});
document.getElementById('layers-btn').addEventListener('click', () =>
  window.exportLayers && window.exportLayers());
document.getElementById('flip-btn').addEventListener('click', () =>
  window.flipCamera && window.flipCamera());

// ---- UI state ----
window.setFrozenUI = function (isFrozen) {
  document.getElementById('top-bar').classList.toggle('visible', isFrozen);
  document.getElementById('capture-btn').classList.toggle('frozen', isFrozen);
};
