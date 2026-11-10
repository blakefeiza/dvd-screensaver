'use strict';
// Bouncing DVD logo. The path is analytic (triangle waves) and tuned so the logo
// lands exactly in a corner every CYCLE_SECONDS; each landing fires confetti and
// flashes total Sales in the middle of the screen.
(function () {
  var CYCLE_SECONDS = 30;
  var FIRST_HIT_SECONDS = 6; // first corner hit comes early so the user sees it
  var FLASH_MS = 7000;
  var LOGO_W = 150, LOGO_H = 75;
  var COLORS = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#00c7be', '#0a84ff', '#bf5af2', '#ff2d92'];
  // (k, m): x wall-bounces k times and y m times per cycle, ending in a corner.
  var PATTERNS = [[3, 2], [2, 3], [5, 3], [3, 4], [4, 3], [5, 4], [4, 5], [7, 5]];

  var canvas, ctx, W = 0, H = 0;
  // Steady pace: the logo always moves at SPEED px/s along its path. Each cycle is one bounce pattern that
  // ends in a corner (so every lap still ends in a corner hit); a longer pattern simply takes longer.
  var SPEED = 230;                 // px per second at 1x
  var SPEED_STEPS = [1, 1.4, 1.9, 2.6]; // click the logo to step up; after the top step it goes back to 1x
  var speedIdx = 0;
  var cycle = 0, phase = 0, patIdx = 0, flipX = 0, flipY = 0, lastT = null;
  var logoX = 0, logoY = 0;
  function nextPattern() {
    var pi;
    do { pi = Math.floor(Math.random() * PATTERNS.length); } while (pi === patIdx);
    patIdx = pi;
  }
  patIdx = 0; // first lap is the short [3,2] pattern so the first corner hit comes quickly
  var lastCycle = 0, colorIdx = 0, lastBounceKey = '';
  var particles = [], flashUntil = 0;

  window.onload = function () {
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
  };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Popup content: fixed, because Tableau Public cannot run extensions or read the workbook.
  // Total Sales = sum of Sales over the 10,194 Superstore Orders rows.
  var kpis = [{ label: 'Total Sales', value: '$2,326,534' }];

  function tri(s, L) { // 0 -> L -> 0 triangle wave, starts at 0
    if (L <= 0) return 0;
    var p = ((s % (2 * L)) + 2 * L) % (2 * L);
    return L - Math.abs(p - L);
  }

  function onPointerMove(e) {
    var r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    canvas.style.cursor = (px >= logoX && px <= logoX + LOGO_W && py >= logoY && py <= logoY + LOGO_H) ? 'pointer' : 'default';
  }
  function onPointerDown(e) {
    var r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (px >= logoX && px <= logoX + LOGO_W && py >= logoY && py <= logoY + LOGO_H) {
      speedIdx = (speedIdx + 1) % SPEED_STEPS.length;
      speedBadgeUntil = performance.now() + 1500;
    }
  }
  var speedBadgeUntil = 0;

  function frame(now) {
    var dt = lastT === null ? 0 : Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    var maxX = Math.max(1, W - LOGO_W), maxY = Math.max(1, H - LOGO_H);
    var pat = PATTERNS[patIdx];
    var len = Math.sqrt(Math.pow(pat[0] * maxX, 2) + Math.pow(pat[1] * maxY, 2));
    if (lastCycle === 0 && cycle === 0 && lastT !== null && phase === 0 && dt === 0) phase = Math.max(0, 1 - (6 * SPEED) / len); // first corner hit about 6 s in
    phase += (SPEED * SPEED_STEPS[speedIdx] * dt) / len;
    if (phase >= 1) { // reached the corner: start the next lap from it, heading away
      phase -= 1;
      flipX ^= pat[0] & 1;
      flipY ^= pat[1] & 1;
      cycle++;
      nextPattern();
    }
    pat = PATTERNS[patIdx];
    var sx = pat[0] * maxX * phase, sy = pat[1] * maxY * phase;
    var x = tri(sx + (flipX ? maxX : 0), maxX), y = tri(sy + (flipY ? maxY : 0), maxY);
    logoX = x; logoY = y;

    if (cycle !== lastCycle) { // wrapped past a corner hit
      lastCycle = cycle;
      celebrate();
    }
    var key = Math.floor(sx / maxX) + ':' + Math.floor(sy / maxY);
    if (key !== lastBounceKey) {
      lastBounceKey = key;
      colorIdx = (colorIdx + 1) % COLORS.length;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawLogo(x, y, COLORS[colorIdx]);
    drawConfetti();
    drawFlash(now);
    drawSpeedBadge(now);
    requestAnimationFrame(frame);
  }

  function drawLogo(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 900 54px Arial Black, Arial, sans-serif';
    ctx.fillText('DVD', LOGO_W / 2, 46);
    ctx.beginPath();
    ctx.ellipse(LOGO_W / 2, 60, 68, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIDEO', LOGO_W / 2, 61);
    ctx.restore();
  }

  function celebrate() {
    flashUntil = performance.now() + FLASH_MS;
    for (var i = 0; i < 260; i++) {
      particles.push({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2 + Math.random() * 4,
        size: 5 + Math.random() * 7,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }

  function drawConfetti() {
    particles = particles.filter(function (p) { return p.y < H + 30; });
    particles.forEach(function (p) {
      p.x += p.vx + Math.sin(p.y / 40) * 0.8;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
  }

  function drawSpeedBadge(now) {
    if (now > speedBadgeUntil) return;
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Speed ' + SPEED_STEPS[speedIdx].toFixed(1) + 'x', 14, 12);
    ctx.restore();
  }

  function drawFlash(now) {
    if (now > flashUntil) return;
    // Blink ~3x per second.
    if (Math.floor(now / 170) % 2 === 0) return;
    var n = Math.max(1, kpis.length);
    var size = Math.max(24, Math.min(W / 7, H / (3.5 + n * 0.9)) / (n > 1 ? 1.25 : 1)); // value size shrinks as KPIs are added
    var small = size * 0.4;
    var block = n * (small + size) * 1.15;
    var top = H / 2 - block / 2 - small * 0.9;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    function line(txt, font, fill, lw, y) {
      ctx.font = font; ctx.fillStyle = fill; ctx.lineWidth = lw;
      ctx.strokeText(txt, W / 2, y); ctx.fillText(txt, W / 2, y);
    }
    line('CORNER HIT!', '900 ' + small + 'px Arial Black, Arial, sans-serif', '#ff2d92', small / 5, top);
    var y = top + small * 1.2;
    kpis.forEach(function (k) {
      line(String(k.label).toUpperCase(), '900 ' + small + 'px Arial Black, Arial, sans-serif', '#fff', small / 5, y);
      y += small * 0.2 + size * 0.55;
      if (k.value !== '') line(String(k.value), '900 ' + size + 'px Arial Black, Arial, sans-serif', '#ffd60a', size / 12, y);
      y += size * 0.75;
    });
    ctx.restore();
  }
})();
