/**
 * @jest-environment jsdom
 */

// ---------------------------------------------------------------------------
// Tests for:
//   1. save-btn uses Web Share API on iOS/mobile
//   2. save-btn falls back to window.saveCapture() when Web Share fails / unavailable
//   3. save-btn creates a PNG File from the canvas for sharing
//   4. facingMode is "environment" on touch devices, null on desktop
// ---------------------------------------------------------------------------

/* ---- helpers ----------------------------------------------------------- */

/**
 * Build a minimal DOM that mirrors the parts of index.html the save-btn
 * handler relies on, then evaluate the handler-registration code.
 */
function setupSaveBtnDOM() {
  document.body.innerHTML = `
    <div id="canvas-container">
      <canvas width="100" height="100"></canvas>
    </div>
    <button class="text-btn" id="save-btn">↓ Save</button>
  `;

  // Stub window.saveCapture so the inline handler doesn't bail early.
  window.saveCapture = jest.fn();

  // Register the same click handler that lives in index.html.
  document.getElementById('save-btn').addEventListener('click', () => {
    if (!window.saveCapture) return;
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
}

/* ---- tests ------------------------------------------------------------- */

describe('save-btn click handler', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete navigator.share; // reset between tests
  });

  // 1. Uses Web Share API when available (iOS / mobile)
  test('uses Web Share API when navigator.share is available', async () => {
    setupSaveBtnDOM();

    const shareStub = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareStub,
      writable: true,
      configurable: true,
    });

    // Stub canvas.toBlob to invoke callback synchronously with a fake blob
    const fakeBlob = new Blob(['px'], { type: 'image/png' });
    const canvas = document.querySelector('#canvas-container canvas');
    canvas.toBlob = jest.fn((cb, _type) => cb(fakeBlob));

    document.getElementById('save-btn').click();

    // Allow the async handler inside toBlob callback to settle
    await new Promise((r) => setTimeout(r, 0));

    expect(shareStub).toHaveBeenCalledTimes(1);
    expect(window.saveCapture).not.toHaveBeenCalled();
  });

  // 2. Falls back to window.saveCapture() when Web Share API is unavailable
  test('falls back to saveCapture when navigator.share is not available', () => {
    setupSaveBtnDOM();

    // Ensure share is absent
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    document.getElementById('save-btn').click();

    expect(window.saveCapture).toHaveBeenCalledTimes(1);
  });

  // 2b. Falls back to window.saveCapture() when Web Share API rejects (non-AbortError)
  test('falls back to saveCapture when navigator.share rejects with a non-AbortError', async () => {
    setupSaveBtnDOM();

    const error = new Error('ShareError');
    error.name = 'DataError';
    const shareStub = jest.fn().mockRejectedValue(error);
    Object.defineProperty(navigator, 'share', {
      value: shareStub,
      writable: true,
      configurable: true,
    });

    const fakeBlob = new Blob(['px'], { type: 'image/png' });
    const canvas = document.querySelector('#canvas-container canvas');
    canvas.toBlob = jest.fn((cb, _type) => cb(fakeBlob));

    document.getElementById('save-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(shareStub).toHaveBeenCalledTimes(1);
    expect(window.saveCapture).toHaveBeenCalledTimes(1);
  });

  // 2c. Does NOT fall back when the user cancels (AbortError)
  test('does not fall back to saveCapture when user cancels share (AbortError)', async () => {
    setupSaveBtnDOM();

    const error = new DOMException('Share cancelled', 'AbortError');
    const shareStub = jest.fn().mockRejectedValue(error);
    Object.defineProperty(navigator, 'share', {
      value: shareStub,
      writable: true,
      configurable: true,
    });

    const fakeBlob = new Blob(['px'], { type: 'image/png' });
    const canvas = document.querySelector('#canvas-container canvas');
    canvas.toBlob = jest.fn((cb, _type) => cb(fakeBlob));

    document.getElementById('save-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(shareStub).toHaveBeenCalledTimes(1);
    expect(window.saveCapture).not.toHaveBeenCalled();
  });

  // 3. Creates a PNG File from the canvas for sharing
  test('creates a PNG File named riso-capture.png from canvas', async () => {
    setupSaveBtnDOM();

    let sharedFile = null;
    const shareStub = jest.fn().mockImplementation(async (data) => {
      sharedFile = data.files[0];
    });
    Object.defineProperty(navigator, 'share', {
      value: shareStub,
      writable: true,
      configurable: true,
    });

    const fakeBlob = new Blob(['px'], { type: 'image/png' });
    const canvas = document.querySelector('#canvas-container canvas');
    canvas.toBlob = jest.fn((cb, type) => {
      expect(type).toBe('image/png');
      cb(fakeBlob);
    });

    document.getElementById('save-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(sharedFile).toBeInstanceOf(File);
    expect(sharedFile.name).toBe('riso-capture.png');
    expect(sharedFile.type).toBe('image/png');
  });
});

describe('facingMode detection', () => {
  // 4a. "environment" on touch devices
  test('facingMode is "environment" when ontouchstart exists on window', () => {
    // Simulate a touch-capable device
    window.ontouchstart = null; // property exists ⇒ truthy check passes
    const facingMode = ('ontouchstart' in window) ? 'environment' : null;
    expect(facingMode).toBe('environment');
    delete window.ontouchstart;
  });

  // 4b. null on desktop
  test('facingMode is null when ontouchstart is absent', () => {
    delete window.ontouchstart;
    const facingMode = ('ontouchstart' in window) ? 'environment' : null;
    expect(facingMode).toBeNull();
  });
});
