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
  var totalSales = null;
  // Each cycle gets a random length and pattern, so corner hits are not on a fixed beat.
  var MIN_CYCLE = 12, MAX_CYCLE = 45;
  var schedule = [];
  function cycleAt(i) {
    while (schedule.length <= i) {
      var n = schedule.length;
      var prev = n ? schedule[n - 1] : null;
      var pi;
      do { pi = Math.floor(Math.random() * PATTERNS.length); } while (prev && pi === prev.pi);
      var dur = n === 0 ? CYCLE_SECONDS : MIN_CYCLE + Math.random() * (MAX_CYCLE - MIN_CYCLE);
      schedule.push({ start: prev ? prev.start + prev.dur : 0, dur: dur, pi: pi });
    }
    return schedule[i];
  }
  var startTime = performance.now() - (CYCLE_SECONDS - FIRST_HIT_SECONDS) * 1000;
  var lastCycle = 0, colorIdx = 0, lastBounceKey = '';
  var particles = [], flashUntil = 0;

  window.onload = function () {
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
    if (window.tableau && tableau.extensions) {
      tableau.extensions.initializeAsync().then(loadSales, function () {});
    }
  };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function loadSales() {
    var ws = [tableau.extensions.worksheetContent.worksheet];
    var pending = ws.length, found = null;
    ws.forEach(function (sheet) {
      sheet.getSummaryDataAsync().then(function (dt) {
        var idx = -1;
        dt.columns.forEach(function (c, i) {
          if (idx < 0 && /sales/i.test(c.fieldName)) idx = i;
        });
        if (idx >= 0 && found === null) {
          var sum = 0;
          dt.data.forEach(function (row) {
            var v = Number(row[idx].value);
            if (!isNaN(v)) sum += v;
          });
          found = sum;
          totalSales = sum;
        }
      }).catch(function () {}).then(function () {
        if (--pending === 0 && found === null) totalSales = null;
      });
    });
    // Refresh when the data changes.
    ws.forEach(function (sheet) {
      sheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, loadSales);
    });
  }

  function tri(s, L) { // 0 -> L -> 0 triangle wave, starts at 0
    if (L <= 0) return 0;
    var p = ((s % (2 * L)) + 2 * L) % (2 * L);
    return L - Math.abs(p - L);
  }

  function frame(now) {
    var t = (now - startTime) / 1000;
    var cycle = 0;
    while (cycleAt(cycle).start + cycleAt(cycle).dur <= t) cycle++;
    var cur = cycleAt(cycle);
    var phase = (t - cur.start) / cur.dur;
    var pat = PATTERNS[cur.pi];
    var maxX = Math.max(1, W - LOGO_W), maxY = Math.max(1, H - LOGO_H);
    var sx = pat[0] * maxX * phase, sy = pat[1] * maxY * phase;
    // Each cycle ends in a corner; start the next one from that corner, heading away,
    // instead of snapping back to the top left. Odd bounce counts flip the start side.
    var flipX = 0, flipY = 0;
    for (var c = 0; c < cycle; c++) {
      var pc = PATTERNS[cycleAt(c).pi];
      flipX ^= pc[0] & 1;
      flipY ^= pc[1] & 1;
    }
    var x = tri(sx + (flipX ? maxX : 0), maxX), y = tri(sy + (flipY ? maxY : 0), maxY);

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

  function drawFlash(now) {
    if (now > flashUntil) return;
    // Blink ~3x per second.
    if (Math.floor(now / 170) % 2 === 0) return;
    var big = totalSales === null ? '' : formatMoney(totalSales);
    var size = Math.max(28, Math.min(W / 7, H / 3.5));
    var small = size * 0.4;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = small / 5;
    ctx.font = '900 ' + small + 'px Arial Black, Arial, sans-serif';
    ctx.fillStyle = '#ff2d92';
    ctx.strokeText('CORNER HIT!', W / 2, H / 2 - size * 0.75);
    ctx.fillText('CORNER HIT!', W / 2, H / 2 - size * 0.75);
    ctx.fillStyle = '#fff';
    ctx.strokeText('TOTAL SALES', W / 2, H / 2 - size * 0.3);
    ctx.fillText('TOTAL SALES', W / 2, H / 2 - size * 0.3);
    ctx.font = '900 ' + size + 'px Arial Black, Arial, sans-serif';
    ctx.lineWidth = size / 12;
    ctx.fillStyle = '#ffd60a';
    ctx.strokeText(big, W / 2, H / 2 + size * 0.45);
    ctx.fillText(big, W / 2, H / 2 + size * 0.45);
    ctx.restore();
  }

  function formatMoney(v) {
    return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
})();
