(() => {
  const scene = document.querySelector('[data-ocean-scene]');
  if (!scene) return;
  const root = document.body;
  const waterCanvas = scene.querySelector('[data-ocean-water]');
  const lifeCanvas = scene.querySelector('[data-ocean-life]');
  const seabedCanvas = scene.querySelector('[data-ocean-seabed-life]');
  const whaleCanvas = scene.querySelector('[data-ocean-whale-life]');
  if (!waterCanvas || !lifeCanvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetBase = `${(scene.dataset.oceanAssets || '/ocean/').replace(/\/+$/, '')}/`;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let renderer = null;
  let ready = false;
  let seabed = null;
  let seabedReady = false;
  let whale = null;
  let whaleReady = false;
  let whaleGeneration = 0;
  let generation = 0;
  let suspended = false;
  let disposed = false;
  let contextLost = false;
  let resizeFrame = null;
  const safe = (action) => { try { action(); } catch {} };

  // Small, soft suspended particles move through the water, rather than twinkling.
  const createWater = () => {
    const context = waterCanvas.getContext('2d', { alpha: true });
    if (!context) return { resize() {}, start() {}, stop() {}, draw() {}, destroy() {} };
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 24;
    const spriteContext = sprite.getContext('2d');
    let particles = [];
    let running = false;
    let frame = null;
    let lastPaint = null;
    let time = 0;
    if (spriteContext) {
      const glow = spriteContext.createRadialGradient(12, 12, 0, 12, 12, 11);
      glow.addColorStop(0, 'rgba(170,220,235,.8)');
      glow.addColorStop(0.25, 'rgba(120,190,218,.3)');
      glow.addColorStop(1, 'rgba(100,170,195,0)');
      spriteContext.fillStyle = glow;
      spriteContext.fillRect(0, 0, 24, 24);
    }
    const makeParticle = () => ({
      x: Math.random(), y: Math.random(), depth: 0.25 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2, radius: 0.4 + Math.random() * 0.85,
      opacity: 0.055 + Math.random() * 0.105,
    });
    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const size = particle.radius * (2.2 + particle.depth * 1.3);
        context.globalAlpha = particle.opacity;
        context.drawImage(sprite, particle.x * width - size / 2, particle.y * height - size / 2, size, size);
      });
      context.globalAlpha = 1;
    };
    const stop = () => {
      running = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastPaint = null;
    };
    const tick = (now) => {
      if (!running) return;
      frame = window.requestAnimationFrame(tick);
      if (lastPaint === null) { lastPaint = now; draw(); return; }
      if (now - lastPaint < 1000 / 30) return;
      const dt = Math.min((now - lastPaint) / 1000, 0.06);
      lastPaint = now;
      time += dt;
      particles.forEach((particle) => {
        particle.x += (Math.sin(time * 0.12 + particle.phase) * 1.8 + 0.8) * particle.depth * dt / width;
        particle.y -= (0.65 + particle.depth * 1.4) * dt / height;
        // Wrap only outside the visible viewport, so there is no visible jump.
        if (particle.y < -0.02) particle.y = 1.02;
        if (particle.x < -0.02) particle.x = 1.02;
        if (particle.x > 1.02) particle.x = -0.02;
      });
      draw();
    };
    return {
      resize() {
        waterCanvas.width = Math.round(width * pixelRatio);
        waterCanvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        const count = width < 680 ? 60 : 145;
        while (particles.length < count) particles.push(makeParticle());
        particles.length = count;
        draw();
      },
      draw,
      start() {
        if (running) return;
        running = true;
        lastPaint = null;
        frame = window.requestAnimationFrame(tick);
      },
      stop,
      destroy() { stop(); particles = []; context.clearRect(0, 0, width, height); },
    };
  };
  const water = createWater();

  const sync = () => {
    if (disposed) return;
    const hidden = document.hidden || suspended;
    root.dataset.oceanMotion = hidden ? 'paused' : reducedMotion.matches ? 'still' : 'running';
    if (hidden || reducedMotion.matches) {
      water.stop();
      if (seabed) safe(() => seabed.stop());
      if (whale) safe(() => whale.stop());
      if (ready && renderer) renderer.stop();
      if (!hidden && ready && renderer) renderer.renderOnce();
      if (!hidden) water.draw();
      if (!hidden && seabedReady) safe(() => seabed.renderOnce());
      if (!hidden && whaleReady) safe(() => whale.renderOnce());
      return;
    }
    water.start();
    if (seabedReady) safe(() => seabed.start());
    if (whaleReady) safe(() => whale.start());
    if (ready && renderer && !contextLost) renderer.start();
  };

  const resize = () => {
    if (disposed) return;
    width = Math.max(1, Math.round(window.innerWidth || scene.clientWidth || 1));
    height = Math.max(1, Math.round(window.innerHeight || scene.clientHeight || 1));
    pixelRatio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    water.resize();
    if (seabedReady) safe(() => seabed.resize(width, height, pixelRatio));
    if (whaleReady) safe(() => whale.resize(width, height, pixelRatio));
    if (ready && renderer && !contextLost) renderer.resize(width, height, pixelRatio);
    sync();
  };
  const scheduleResize = () => {
    if (disposed || resizeFrame !== null) return;
    resizeFrame = window.requestAnimationFrame(() => { resizeFrame = null; resize(); });
  };

  const initialize = () => {
    if (disposed || contextLost) return;
    const token = ++generation;
    if (renderer) safe(() => renderer.destroy());
    renderer = null;
    ready = false;
    scene.dataset.oceanState = 'loading';
    if (typeof window.createJellyfishOcean !== 'function') {
      scene.dataset.oceanState = 'fallback';
      return;
    }
    let candidate;
    let failed = false;
    const fail = (error) => {
      if (token !== generation || disposed) return;
      if (error) console.warn('Ocean background unavailable:', error.message || error);
      failed = true;
      ready = false;
      scene.dataset.oceanState = contextLost ? 'context-lost' : 'fallback';
      if (candidate) safe(() => candidate.stop());
    };
    try {
      candidate = window.createJellyfishOcean(lifeCanvas, {
        assetBase,
        textureURLs: [scene.dataset.oceanMoon, scene.dataset.oceanGold, scene.dataset.oceanSilver].filter(Boolean),
        onError: fail,
      });
      renderer = candidate;
      candidate.stop();
      Promise.resolve(candidate.ready).then(() => {
        if (disposed || token !== generation) { safe(() => candidate.destroy()); return; }
        if (failed || contextLost) return;
        candidate.setTheme(true);
        candidate.resize(width, height, pixelRatio);
        ready = true;
        scene.dataset.oceanState = 'ready';
        sync();
      }).catch(fail);
    } catch { fail(); }
  };

  const initializeSeabed = () => {
    if (!seabedCanvas || typeof window.createOceanSeabed !== 'function') return;
    scene.dataset.seabedState = 'loading';
    let failed = false;
    const fail = (error) => {
      if (disposed) return;
      failed = true;
      seabedReady = false;
      scene.dataset.seabedState = 'fallback';
      if (seabed) safe(() => seabed.stop());
      if (error) console.warn('Seabed animation unavailable:', error.message || error);
    };
    try {
      seabed = window.createOceanSeabed(seabedCanvas, { bodyURL: scene.dataset.oceanCrab, onError: fail });
      seabed.stop();
      Promise.resolve(seabed.ready).then(() => {
        if (disposed) { safe(() => seabed.destroy()); return; }
        if (failed) return;
        seabed.setTheme(true);
        seabed.resize(width, height, pixelRatio);
        seabedReady = true;
        scene.dataset.seabedState = 'ready';
        sync();
      }).catch(fail);
    } catch (error) { fail(error); }
  };

  const initializeWhale = () => {
    if (!whaleCanvas || typeof window.createOceanWhale !== 'function') return;
    const token = ++whaleGeneration;
    whaleReady = false;
    if (whale) safe(() => whale.destroy());
    scene.dataset.whaleState = 'loading';
    let candidate;
    let failed = false;
    const fail = (error) => {
      if (disposed || token !== whaleGeneration) return;
      failed = true;
      whaleReady = false;
      scene.dataset.whaleState = 'fallback';
      if (candidate) safe(() => candidate.stop());
      if (error) console.warn('Whale animation unavailable:', error.message || error);
    };
    try {
      candidate = window.createOceanWhale(whaleCanvas, {
        atlasURL: scene.dataset.oceanWhaleAtlas,
        cheekURL: scene.dataset.oceanWhaleCheek,
        melonURL: scene.dataset.oceanWhaleMelon,
        onError: fail,
      });
      whale = candidate;
      candidate.stop();
      Promise.resolve(candidate.ready).then(() => {
        if (disposed || token !== whaleGeneration) { safe(() => candidate.destroy()); return; }
        if (failed) return;
        candidate.setTheme(true);
        candidate.resize(width, height, pixelRatio);
        whaleReady = true;
        scene.dataset.whaleState = 'ready';
        sync();
      }).catch(fail);
    } catch (error) { fail(error); }
  };
  whaleCanvas?.addEventListener('webglcontextrestored', () => { if (!disposed) initializeWhale(); });

  window.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  lifeCanvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    ready = false;
    scene.dataset.oceanState = 'context-lost';
    if (renderer) safe(() => renderer.stop());
  });
  lifeCanvas.addEventListener('webglcontextrestored', () => {
    if (disposed) return;
    contextLost = false;
    initialize();
  });
  window.addEventListener('pagehide', (event) => {
    suspended = true;
    sync();
    if (event.persisted) return;
    disposed = true;
    generation += 1;
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = null;
    water.destroy();
    if (seabed) safe(() => seabed.destroy());
    if (whale) safe(() => whale.destroy());
    whaleGeneration += 1;
    if (renderer) safe(() => renderer.destroy());
  });
  window.addEventListener('pageshow', () => {
    if (disposed) return;
    suspended = false;
    resize();
  });

  resize();
  initializeSeabed();
  initializeWhale();
  initialize();
})();
