(() => {
  'use strict';

  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TILE = 28;
  const PERIOD = 256;
  const PW = PERIOD * TILE;

  const COLORS = {
    grass: [106, 168, 79],
    grassEdge: [80, 124, 58],
    dirt: [134, 96, 67],
    stone: [124, 124, 124],
    trunk: [102, 74, 46],
    leaves: [74, 132, 62]
  };

  let W = 0;
  let H = 0;
  let DPR = 1;
  let terrain = null;
  let clouds = [];
  let offset = 0;
  let lastTime = 0;
  let rafId = 0;

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function shade(color, delta) {
    return 'rgb(' +
      clamp(Math.round(color[0] + delta), 0, 255) + ',' +
      clamp(Math.round(color[1] + delta), 0, 255) + ',' +
      clamp(Math.round(color[2] + delta), 0, 255) + ')';
  }

  function heightAt(i) {
    const t = (((i % PERIOD) + PERIOD) % PERIOD) / PERIOD * Math.PI * 2;
    return 0.60
      + 0.045 * Math.sin(t * 3)
      + 0.028 * Math.sin(t * 7 + 1.3)
      + 0.016 * Math.sin(t * 13 + 2.1);
  }

  function buildTerrain() {
    const c = document.createElement('canvas');
    c.width = PW;
    c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    for (let i = 0; i < PERIOD; i++) {
      const x = i * TILE;
      const surfaceRow = Math.round(heightAt(i) * H / TILE);

      for (let j = surfaceRow; j * TILE < H + TILE; j++) {
        const y = j * TILE;
        let base;
        if (j === surfaceRow) base = COLORS.grass;
        else if (j <= surfaceRow + 3) base = COLORS.dirt;
        else base = COLORS.stone;

        const n = (hash(i, j) - 0.5) * 16;
        g.fillStyle = shade(base, n);
        g.fillRect(x, y, TILE, TILE);

        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.fillRect(x, y + TILE - 2, TILE, 2);
        g.fillRect(x + TILE - 2, y, 2, TILE);
      }

      const surfaceY = surfaceRow * TILE;
      g.fillStyle = shade(COLORS.grassEdge, 0);
      g.fillRect(x, surfaceY, TILE, 5);
    }

    for (let i = 0; i < PERIOD; i++) {
      if (hash(i, 91) < 0.94) continue;

      const x = i * TILE;
      const surfaceY = Math.round(heightAt(i) * H / TILE) * TILE;
      const trunkH = TILE * 4;
      const trunkW = 8;
      const tx = x + TILE / 2 - trunkW / 2;
      const ty = surfaceY - trunkH;

      g.fillStyle = shade(COLORS.trunk, 0);
      g.fillRect(tx, ty, trunkW, trunkH);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(tx + trunkW - 2, ty, 2, trunkH);

      const lw = TILE * 5;
      const lh = TILE * 3;
      const lx = x + TILE / 2 - lw / 2;
      const ly = ty - lh + TILE * 0.6;

      g.fillStyle = shade(COLORS.leaves, 0);
      g.fillRect(lx, ly, lw, lh);
      g.fillRect(lx + TILE * 0.5, ly - TILE * 0.6, lw - TILE, TILE * 0.8);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(lx, ly + lh - 3, lw, 3);
    }

    terrain = c;
  }

  function buildClouds() {
    clouds = [];
    const count = Math.max(5, Math.round(W / 300));
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 30 + Math.random() * (H * 0.3),
        scale: 0.55 + Math.random() * 0.9,
        speed: 5 + Math.random() * 9
      });
    }
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#4a90d9');
    sky.addColorStop(0.55, '#8ec9f0');
    sky.addColorStop(1, '#cfe9f7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const sunX = W * 0.78;
    const sunY = H * 0.16;
    const r = Math.max(28, Math.min(W, H) * 0.055);

    const glow = ctx.createRadialGradient(sunX, sunY, r * 0.4, sunX, sunY, r * 6);
    glow.addColorStop(0, 'rgba(255,247,214,0.55)');
    glow.addColorStop(1, 'rgba(255,247,214,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - r * 6, sunY - r * 6, r * 12, r * 12);

    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(Math.round(sunX - r / 2), Math.round(sunY - r / 2), Math.round(r), Math.round(r));
  }

  function drawClouds(dt) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const c of clouds) {
      if (dt) {
        c.x += c.speed * dt;
        if (c.x > W + 200) {
          c.x = -200;
          c.y = 30 + Math.random() * (H * 0.3);
        }
      }
      const u = 12 * c.scale;
      const x = Math.round(c.x);
      const y = Math.round(c.y);
      ctx.fillRect(x, y, u * 6, u * 2);
      ctx.fillRect(x + u, y - u, u * 4, u);
      ctx.fillRect(x + u * 2, y + u * 2, u * 3, u);
    }
  }

  function drawTerrain() {
    const x0 = -(offset % PW);
    for (let x = x0; x < W; x += PW) {
      ctx.drawImage(terrain, Math.round(x), 0);
    }
  }

  function render(dt) {
    drawSky();
    drawClouds(dt);
    drawTerrain();
  }

  function loop(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    offset += dt * 14;
    render(dt);
    rafId = requestAnimationFrame(loop);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!reduceMotion && !rafId) {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  });

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    buildTerrain();
    buildClouds();
    offset = 0;
    render(0);
  }

  resize();
  if (!reduceMotion) rafId = requestAnimationFrame(loop);

  const toast = document.getElementById('toast');
  let toastTimer = 0;

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      let ok = false;

      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
      }

      showToast(ok ? 'Скопировано: ' + text : text);
    });
  });
})();