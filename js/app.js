(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ── harflarga bo'lish ── */
  $$('[data-split]').forEach(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-label', text);
    let i = 0;
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        w.appendChild(s);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ── gul barglari ── */
  const petals = $('.petals');
  if (petals && !reduce) {
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('i');
      p.style.left = rand(0, 100) + '%';
      p.style.setProperty('--dx', rand(-80, 80) + 'px');
      p.style.animationDuration = rand(6, 12) + 's';
      p.style.animationDelay = -rand(0, 12) + 's';
      p.style.scale = rand(.6, 1.3);
      petals.appendChild(p);
    }
  }

  /* ── yuraklar (canvas) ── */
  const cv = $('#fx'), c = cv.getContext('2d');
  let W = 0, H = 0;
  const COLORS = ['#ff4d6d', '#ff8fa3', '#ffd6dd', '#e8c28c', '#ffffff'];
  const ambient = [], sparks = [];
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * d; cv.height = H * d;
    c.setTransform(d, 0, 0, d, 0, 0);
  }
  size();
  addEventListener('resize', size);

  function heart(x, y, s, rot, color, alpha) {
    c.save();
    c.translate(x, y); c.rotate(rot); c.scale(s / 32, s / 32);
    c.globalAlpha = alpha; c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 13);
    c.bezierCurveTo(-24, -3, -13, -21, 0, -8);
    c.bezierCurveTo(13, -21, 24, -3, 0, 13);
    c.fill();
    c.restore();
  }
  function newAmbient(anywhere) {
    return {
      x: rand(0, W), y: anywhere ? rand(0, H) : H + 30,
      s: rand(8, 22), v: rand(.25, .8), ph: rand(0, 6.28), sw: rand(.4, 1.4),
      a: rand(.1, .32), col: COLORS[(Math.random() * 4) | 0]
    };
  }
  for (let i = 0; i < (innerWidth < 700 ? 20 : 34); i++) ambient.push(newAmbient(true));

  function burst(x, y, n = 14, power = 1) {
    if (reduce) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2), sp = rand(2, 8) * power;
      sparks.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2.5 * power,
        s: rand(10, 26), r: rand(-.6, .6), vr: rand(-.08, .08),
        life: 1, dec: rand(.008, .018), col: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
    if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
  }

  /* ── musiqa va ritm ── */
  let actx, analyser, master, audio, synthOn = false, playing = false, usingFile = false;
  const bins = new Uint8Array(256);
  const musicBtn = $('#music');

  function initAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      actx = new AC();
      analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = .6;
      master = actx.createGain();
      master.connect(analyser);
      analyser.connect(actx.destination);
    } catch (e) { actx = null; }

    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.addEventListener('error', startSynth, { once: true });
    audio.src = 'assets/audio/song.mp3';
    if (actx) { try { actx.createMediaElementSource(audio).connect(master); } catch (e) {} }
    const p = audio.play();
    if (p) p.then(() => { usingFile = true; }).catch(() => { if (!usingFile) startSynth(); });
    if (actx && actx.state === 'suspended') actx.resume();
    playing = true;
    musicBtn.hidden = false;
  }

  /* Qo'shiq fayli bo'lmasa — mayin "music box" ohangi */
  function startSynth() {
    if (synthOn || usingFile || !actx) return;
    synthOn = true;
    const step = 60 / 88 / 2;
    const chords = [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]];
    const pat = [0, 1, 2, 3, 2, 1, 2, 3];
    const lead = [78, 0, 76, 74, 0, 73, 74, 0, 74, 0, 73, 71, 0, 69, 71, 0, 74, 0, 71, 0, 69, 0, 66, 0, 71, 0, 0, 69, 0, 0, 0, 0];
    const f = m => 440 * Math.pow(2, (m - 69) / 12);
    const note = (freq, t, dur, vol, type) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + .015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + .05);
    };
    let next = actx.currentTime + .15, n = 0;
    setInterval(() => {
      if (actx.state !== 'running') return;
      if (next < actx.currentTime) next = actx.currentTime + .05;
      while (next < actx.currentTime + .35) {
        const s = n % 8, ch = chords[((n / 8) | 0) % 4];
        note(f(ch[pat[s]] + 12), next, 1.3, .07, 'sine');
        note(f(ch[pat[s]] + 24), next, .4, .012, 'triangle');
        if (s === 0 || s === 4) note(f(ch[0] - 12), next, 1.1, s ? .12 : .2, 'sine');
        const l = lead[n % 32];
        if (l) note(f(l + 12), next, 1.6, .06, 'sine');
        next += step; n++;
      }
    }, 90);
  }

  function setPlaying(on) {
    playing = on;
    musicBtn.classList.toggle('off', !on);
    if (!actx && !audio) return;
    if (on) { actx && actx.resume(); usingFile && audio.play().catch(() => {}); }
    else { usingFile && audio.pause(); actx && actx.suspend(); }
  }
  musicBtn.addEventListener('click', e => { e.stopPropagation(); setPlaying(!playing); });
  document.addEventListener('visibilitychange', () => {
    if (!actx) return;
    if (document.hidden) { usingFile && audio.pause(); actx.suspend(); }
    else if (playing) { actx.resume(); usingFile && audio.play().catch(() => {}); }
  });

  let beat = 0, avg = 0, lastOn = 0, quiet = 0, beatN = 0;
  function readBeat(t) {
    let e = 0;
    if (analyser && playing) {
      analyser.getByteFrequencyData(bins);
      let s = 0;
      for (let i = 0; i < 5; i++) s += bins[i];
      e = s / 5 / 255;
    }
    let on = false;
    if (e < .03) {
      // ovoz o'qilmasa ham sahifa "nafas olib" turadi
      quiet++;
      if (quiet > 40 && t - lastOn > 682) on = true;
    } else {
      quiet = 0;
      avg += (e - avg) * .04;
      on = e > avg * 1.18 && e > .16 && t - lastOn > 300;
    }
    if (on) { lastOn = t; beat = playing || quiet > 40 ? 1 : 0; onBeat(); }
    beat *= .9;
    root.style.setProperty('--beat', beat.toFixed(3));
  }
  function onBeat() {
    beatN++;
    if (!document.body.classList.contains('opened') || reduce) return;
    if (ambient.length < 46) ambient.push(newAmbient(false));
    if (party && beatN % 2 === 0) burst(rand(W * .15, W * .85), rand(H * .2, H * .6), 16, 1.1);
  }

  /* ── kadr ── */
  let party = false;
  function frame(t) {
    readBeat(t);
    c.clearRect(0, 0, W, H);
    for (let i = ambient.length - 1; i >= 0; i--) {
      const p = ambient[i];
      p.y -= p.v * (1 + beat * 1.5);
      p.ph += .012 * p.sw;
      if (p.y < -30) { if (ambient.length > 34) { ambient.splice(i, 1); continue; } Object.assign(p, newAmbient(false)); }
      heart(p.x + Math.sin(p.ph) * 18, p.y, p.s * (1 + beat * .35), Math.sin(p.ph) * .3, p.col, p.a);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vy += .12; p.vx *= .985; p.vy *= .985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.dec;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      heart(p.x, p.y, p.s * (.5 + p.life * .5), p.r, p.col, Math.min(1, p.life * 1.4));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── ochilish ── */
  const gate = $('#gate');
  let opened = false;
  function open(silent) {
    if (opened) return;
    opened = true;
    if (!silent) initAudio();
    document.body.classList.add('opened');
    burst(W / 2, H * .46, 46, 1.5);
    setTimeout(() => burst(W / 2, H * .46, 30, 2), 350);
    setTimeout(() => { gate.remove(); }, 1700);
    setTimeout(() => $('.hero').classList.add('in'), silent ? 0 : 700);
  }
  gate.addEventListener('click', () => open(false));

  /* ── ko'rinishda paydo bo'lish ── */
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting || !opened) return;
      if (e.target.classList.contains('hero')) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      const r = e.target.getBoundingClientRect();
      burst(W / 2, Math.max(80, Math.min(H - 80, r.top + r.height * .35)), 8, .8);
    });
  }, { threshold: .28 });
  $$('.sec').forEach(s => io.observe(s));

  /* ── progress ── */
  const bar = $('.progress i');
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  }, { passive: true });

  /* ── bosganda yuraklar ── */
  addEventListener('pointerdown', e => {
    if (!opened || e.target.closest('button')) return;
    burst(e.clientX, e.clientY, 9, .8);
  }, { passive: true });

  /* ── 3D og'ish (sichqoncha) ── */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    $$('.tilt').forEach(el => {
      const host = el.parentElement;
      host.addEventListener('pointermove', e => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg) scale(1.03)`;
      });
      host.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ── final ── */
  const finale = $('#finale');
  function celebrate() {
    party = true;
    const shots = reduce ? 3 : 14;
    for (let i = 0; i < shots; i++) {
      setTimeout(() => burst(rand(W * .1, W * .9), rand(H * .15, H * .7), 26, 1.4), i * 260);
    }
    setTimeout(() => { party = false; }, 14000);
  }
  $$('.yes').forEach(b => b.addEventListener('click', () => {
    finale.classList.add('said');
    if (!actx) initAudio();
    celebrate();
  }));
  $('.again').addEventListener('click', celebrate);

  /* ── tekshiruv uchun: #open yoki #open&s=2 ── */
  if (location.hash.includes('open')) {
    if (location.hash.includes('still')) document.body.classList.add('still');
    open(true);
    gate.remove();
    const m = location.hash.match(/s=(\d+)/);
    if (m) {
      const sec = $$('.sec')[+m[1]];
      if (sec) { sec.scrollIntoView(); sec.classList.add('in'); }
      if (location.hash.includes('said')) finale.classList.add('said');
    }
  }
})();
