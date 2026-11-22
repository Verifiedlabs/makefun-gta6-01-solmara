import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, repeatX = 1, repeatY = 1, isColor = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createRoadTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#252834';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle asphalt grain
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const shade = 30 + ((i * 29) % 22);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer white shoulders
  ctx.fillStyle = '#dfe5f2';
  ctx.fillRect(8, 0, 4, 256);
  ctx.fillRect(244, 0, 4, 256);

  // Double warm yellow center line
  ctx.fillStyle = '#f5b841';
  ctx.fillRect(123, 0, 4, 256);
  ctx.fillRect(130, 0, 4, 256);

  // Dashed lane lines
  ctx.fillStyle = 'rgba(240, 245, 255, 0.72)';
  for (let y = 12; y < 256; y += 64) {
    ctx.fillRect(66, y, 4, 30);
    ctx.fillRect(186, y, 4, 30);
  }

  return toTexture(c, 1, 1);
}

export function createIntersectionTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#252834';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1000; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    ctx.fillStyle = i % 2 ? '#2c3040' : '#1e212b';
    ctx.fillRect(x, y, 2, 2);
  }

  // Crisp crosswalk bars on all 4 edges
  ctx.fillStyle = '#edf2fa';
  for (let i = 26; i <= 220; i += 24) {
    ctx.fillRect(i, 6, 13, 28);
    ctx.fillRect(i, 222, 13, 28);
    ctx.fillRect(6, i, 28, 13);
    ctx.fillRect(222, i, 28, 13);
  }

  return toTexture(c, 1, 1);
}

export function createSidewalkTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc7bc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#a9a094';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  return toTexture(c, 22, 22);
}

export function createBoardwalkTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9c6b43';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = y % 32 === 0 ? '#a8744a' : '#8f5e39';
    ctx.fillRect(0, y, 256, 14);
    ctx.fillStyle = '#5c3b21';
    ctx.fillRect(0, y + 14, 256, 2);
  }
  return toTexture(c, 1, 36);
}

export function createSandTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#f3d8a3');
  grad.addColorStop(0.75, '#eac68a');
  grad.addColorStop(1, '#c8a56f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const x = (i * 89) % 256;
    const y = (i * 151) % 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,248,225,0.4)' : 'rgba(166,124,72,0.25)';
    ctx.fillRect(x, y, 2, 2);
  }
  return toTexture(c, 2, 16);
}

export function createOceanTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#0b7ea8');
  grad.addColorStop(0.5, '#085d87');
  grad.addColorStop(1, '#0e4c75');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(130, 240, 255, 0.25)';
  ctx.lineWidth = 3;
  for (let y = 12; y < 256; y += 28) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const wy = y + Math.sin((x / 256) * Math.PI * 4 + y) * 5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  return toTexture(c, 10, 14);
}

export function createArtDecoFacadeTexture(baseHex, trimHex, windowGlowHex) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Horizontal Art-Deco speed stripes
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 10, 256, 8);
  ctx.fillRect(0, 128, 256, 6);
  ctx.fillRect(0, 240, 256, 8);

  // Warm sunset-lit hotel windows
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 18 + col * 58;
      const wy = 28 + row * 54;
      const lit = (row * 5 + col * 3) % 4 !== 0;
      ctx.fillStyle = lit ? windowGlowHex : '#2a3347';
      ctx.fillRect(wx, wy, 40, 34);
      ctx.strokeStyle = trimHex;
      ctx.lineWidth = 3;
      ctx.strokeRect(wx, wy, 40, 34);
      // Balcony ledge
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(wx - 3, wy + 34, 46, 4);
    }
  }
  return toTexture(c, 1, 1);
}

export function createSkyscraperTexture(glassHex, goldHex) {
  const c = makeCanvas(256, 512);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2a3b5e');
  grad.addColorStop(0.5, glassHex);
  grad.addColorStop(1, '#1a2038');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 6; col++) {
      const wx = 10 + col * 40;
      const wy = 10 + row * 31;
      const hash = (row * 17 + col * 31) % 11;
      if (hash < 4) ctx.fillStyle = '#ffe59c';
      else if (hash < 7) ctx.fillStyle = '#ff9c6e';
      else if (hash === 8) ctx.fillStyle = '#7bf0ff';
      else ctx.fillStyle = '#1e2c45';
      ctx.fillRect(wx, wy, 30, 20);
    }
  }

  // Gold architectural mullions
  ctx.fillStyle = goldHex;
  for (let col = 0; col <= 6; col++) {
    ctx.fillRect(col * 40 + 4, 0, 3, 512);
  }
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 252, 256, 8);
  return toTexture(c, 1, 1);
}

export function createContainerTexture(colorHex) {
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 128);

  for (let x = 8; x < 256; x += 14) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 8, 5, 112);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 5, 8, 3, 112);
  }
  ctx.strokeStyle = 'rgba(20, 20, 25, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);
  return toTexture(c, 1, 1);
}

export function createPlazaTileTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7dfd3';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#d3c5b4';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);
  ctx.strokeStyle = '#bfa68a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.strokeStyle = 'rgba(0, 224, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 220, 220);
  return toTexture(c, 8, 8);
}

export function createNeonSignTexture(text, primaryHex, borderHex, bgHex = '#140a24') {
  const c = makeCanvas(512, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  // Outer glowing border
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 8;
  ctx.shadowColor = borderHex;
  ctx.shadowBlur = 18;
  ctx.strokeRect(10, 10, 492, 108);

  // Inner accent line
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 3;
  ctx.shadowColor = primaryHex;
  ctx.shadowBlur = 10;
  ctx.strokeRect(20, 20, 472, 88);

  // Neon lettering
  ctx.font = '900 56px "Avenir Next", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = primaryHex;
  ctx.shadowBlur = 24;
  ctx.fillText(text, 256, 66);
  ctx.fillStyle = primaryHex;
  ctx.shadowBlur = 8;
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
