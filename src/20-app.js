/* ============================================================
   Church of the Light · Part 3 : moods / camera / UI / boot
   ============================================================ */
(function () {
  'use strict';
  var T = THREE, VS = window.VS, C = VS.C;

  /* ---------- sun position helper (elevation / azimuth in degrees) ---------- */
  function sunPos(el, az) {
    var e = el * Math.PI / 180, a = az * Math.PI / 180;
    var r = 62;
    return [
      Math.sin(a) * Math.cos(e) * r,
      Math.sin(e) * r + 2.6,
      -Math.cos(a) * Math.cos(e) * r - 4.0
    ];
  }

  /* ============================================================
     MOODS
     ============================================================ */
  VS.MOODS = {
    dawn: {
      label: '晨曦',
      sun: { color: 0xffe6c2, intensity: 1.12, pos: sunPos(30, -14) },
      fill: { color: 0xcbdcee, intensity: 0.50 },
      hemi: { sky: 0xe4eef8, ground: 0xc9b79a, intensity: 0.18 },
      sky: { top: 0x74a8d8, mid: 0xd6e5ef, bottom: 0xf7e6d1, glow: 0.85, sunCol: 0xffeccb },
      fog: { color: 0xdfe9ee, near: 70, far: 330 },
      outline: 0x39404c, ground: 0x9cc47e, cloud: 0xfdfaf3,
      stars: 0, interior: 0.95, halo: 0.95, beam: 1.0, dust: 0.5,
      cross: 0xfffdf6, moon: 0
    },
    noon: {
      label: '正午',
      sun: { color: 0xfff8e6, intensity: 1.24, pos: sunPos(44, 8) },
      fill: { color: 0xd7e5f2, intensity: 0.56 },
      hemi: { sky: 0xe8f1f8, ground: 0xcbb99b, intensity: 0.19 },
      sky: { top: 0x5a9cd6, mid: 0xcbe4f4, bottom: 0xeff2ee, glow: 0.7, sunCol: 0xfff6dd },
      fog: { color: 0xe4eef2, near: 80, far: 350 },
      outline: 0x343a44, ground: 0xa4c986, cloud: 0xffffff,
      stars: 0, interior: 0.8, halo: 0.9, beam: 0.9, dust: 0.42,
      cross: 0xfffefa, moon: 0
    },
    dusk: {
      label: '黄昏',
      sun: { color: 0xffbe80, intensity: 1.16, pos: sunPos(14, 20) },
      fill: { color: 0xa8b8d0, intensity: 0.42 },
      hemi: { sky: 0xdcc8bb, ground: 0xb59a7a, intensity: 0.17 },
      sky: { top: 0x5c6d9c, mid: 0xd9a98c, bottom: 0xf6cb9d, glow: 1.25, sunCol: 0xffc98c },
      fog: { color: 0xe3c8ae, near: 55, far: 300 },
      outline: 0x4a4046, ground: 0x93b27b, cloud: 0xf6dcc4,
      stars: 0.12, interior: 1.15, halo: 1.15, beam: 1.5, dust: 0.62,
      cross: 0xfff7e6, moon: 0
    },
    night: {
      label: '月夜',
      sun: { color: 0xbcd2f2, intensity: 0.56, pos: sunPos(40, -8) },
      fill: { color: 0x5d76a0, intensity: 0.24 },
      hemi: { sky: 0x37496d, ground: 0x2c313d, intensity: 0.20 },
      sky: { top: 0x16223c, mid: 0x35496c, bottom: 0x6b7c94, glow: 0.55, sunCol: 0xd8e6ff },
      fog: { color: 0x2c3a52, near: 60, far: 300 },
      outline: 0x222838, ground: 0x6d8a63, cloud: 0xa7b5c8,
      stars: 1, interior: 1.5, halo: 1.5, beam: 0.75, dust: 0.75,
      cross: 0xf4f8ff, moon: 1
    }
  };

  function snapshot(m) {
    return {
      sunColor: new T.Color(m.sun.color), sunInt: m.sun.intensity, sunPos: new T.Vector3().fromArray(m.sun.pos),
      fillColor: new T.Color(m.fill.color), fillInt: m.fill.intensity,
      hemiSky: new T.Color(m.hemi.sky), hemiGround: new T.Color(m.hemi.ground), hemiInt: m.hemi.intensity,
      skyTop: new T.Color(m.sky.top), skyMid: new T.Color(m.sky.mid), skyBottom: new T.Color(m.sky.bottom),
      glow: m.sky.glow, sunCol: new T.Color(m.sky.sunCol),
      fogColor: new T.Color(m.fog.color), fogNear: m.fog.near, fogFar: m.fog.far,
      outline: new T.Color(m.outline), ground: new T.Color(m.ground), cloud: new T.Color(m.cloud),
      cross: new T.Color(m.cross),
      stars: m.stars, interior: m.interior, halo: m.halo, beam: m.beam, dust: m.dust, moon: m.moon
    };
  }
  function cloneSnap(s) {
    var o = {};
    for (var k in s) { var v = s[k]; o[k] = (v && v.isColor) ? v.clone() : (v && v.isVector3) ? v.clone() : v; }
    return o;
  }
  var moodCur, moodTgt, moodName = 'dawn';
  var sunBase = new T.Vector3(12, 41, -48);

  VS.initMood = function (name) {
    moodName = name || 'dawn';
    moodCur = snapshot(VS.MOODS[moodName]);
    moodTgt = cloneSnap(moodCur);
    VS.scene.fog = new T.Fog(moodCur.fogColor.clone(), moodCur.fogNear, moodCur.fogFar);
    applyMoodFrame();
  };
  VS.setMood = function (name) {
    if (!VS.MOODS[name]) return;
    moodName = name;
    moodTgt = snapshot(VS.MOODS[name]);
  };
  VS.moodName = function () { return moodName; };
  VS.snapMood = function () { moodCur = cloneSnap(moodTgt); applyMoodFrame(); };

  function lerpSnap(cur, tgt, k) {
    for (var key in tgt) {
      var t = tgt[key], c = cur[key];
      if (t && t.isColor) c.lerp(t, k);
      else if (t && t.isVector3) c.lerp(t, k);
      else cur[key] = c + (t - c) * k;
    }
  }

  function applyMoodFrame() {
    var s = moodCur, i;
    var sun = VS.sun, fill = VS.fill, hemi = VS.hemi;
    if (!sun) return;
    sun.color.copy(s.sunColor); sun.intensity = s.sunInt;
    sun.position.copy(s.sunPos);
    sun.target.position.set(0, 2.6, -4.0);
    if (VS.placeShafts) VS.placeShafts(new T.Vector3().subVectors(sun.target.position, sun.position).normalize());
    fill.color.copy(s.fillColor); fill.intensity = s.fillInt;
    hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemiInt;

    var sm = VS.skyMat || (VS.scene.children[0] && VS.scene.children[0].material);
    if (sm && sm.uniforms) {
      sm.uniforms.uTop.value.copy(s.skyTop);
      sm.uniforms.uMid.value.copy(s.skyMid);
      sm.uniforms.uBottom.value.copy(s.skyBottom);
      sm.uniforms.uGlow.value = s.glow;
      sm.uniforms.uSunCol.value.copy(s.sunCol);
      sm.uniforms.uSunDir.value.copy(s.sunPos).sub(new T.Vector3(0, 2.6, -4)).normalize();
    }
    if (VS.scene.fog) {
      VS.scene.fog.color.copy(s.fogColor);
      VS.scene.fog.near = s.fogNear; VS.scene.fog.far = s.fogFar;
    }
    if (VS.starsMat) VS.starsMat.opacity = s.stars;
    if (VS.groundMat) VS.groundMat.color.copy(s.ground);
    if (VS.cloudMat) VS.cloudMat.color.copy(s.cloud);
    VS.setOutlineColor(s.outline.getHex());

    if (VS.crossLightMat) VS.crossLightMat.color.copy(s.cross);
    if (VS.outerLightMat) VS.outerLightMat.color.copy(s.cross);
    if (VS.slotLightMat) VS.slotLightMat.color.copy(s.cross).lerp(new T.Color(0xffffff), 0.4);

    var gm = VS.crossGlowMats || [];
    for (i = 0; i < gm.length; i++) {
      var isOuter = gm[i].userData.outer;
      gm[i].opacity = gm[i].userData.base * (isOuter ? (0.10 + s.moon * 1.25) : s.halo);
    }
    var sm2 = VS.shaftMats || [];
    for (i = 0; i < sm2.length; i++) {
      sm2[i].uniforms.uOpacity.value = sm2[i].userData.base * s.beam;
      sm2[i].uniforms.uColor.value.copy(s.sunColor).lerp(new T.Color(0xffffff), 0.35);
    }
    if (VS.dustMat) VS.dustMat.opacity = s.dust;
    if (VS.nightGlowMat) VS.nightGlowMat.opacity = 0.02 + s.moon * 0.95;
    var il = VS.interiorLights || [];
    for (i = 0; i < il.length; i++) il[i].light.intensity = il[i].base * s.interior;
  }
  VS.updateMood = function (dt) {
    var k = 1 - Math.exp(-dt * 2.6);
    lerpSnap(moodCur, moodTgt, k);
    applyMoodFrame();
  };

  /* ============================================================
     CAMERA RIG
     ============================================================ */
  var rig = {
    theta: 0.42, phi: 1.28, radius: 32,
    tTheta: 0.42, tPhi: 1.28, tRadius: 32,
    target: new T.Vector3(-1.6, 2.8, 8.5), tTarget: new T.Vector3(-1.6, 2.8, 8.5),
    autoRotate: true, dragging: false
  };
  VS.rig = rig;

  VS.VIEWS = {
    hero:    { theta: 0.42, phi: 1.28, radius: 32, target: [-1.6, 2.8, 8.5], label: '总览' },
    entry:   { theta: 0.66, phi: 1.41, radius: 11.0, target: [-1.0, 1.5, 11.3], label: '入口' },
    north:   { theta: 3.06, phi: 1.31, radius: 26, target: [0, 2.9, -4.0], label: '北立面' },
    nave:    { theta: -0.204, phi: 1.659, radius: 15.36, target: [0.5, 2.9, -8.8], label: '中殿' },
    pew:     { theta: -0.151, phi: 1.600, radius: 12.4, target: [0.35, 1.95, -8.8], label: '长凳' },
    cross:   { theta: 0.0, phi: 1.575, radius: 14.2, target: [0, 2.55, -8.4], label: '光之十字' },
    close:   { theta: 0.07, phi: 1.522, radius: 8.6, target: [0, 2.55, -9.0], label: '近观' }
  };
  VS.flyTo = function (key) {
    var v = VS.VIEWS[key]; if (!v) return;
    rig.tTheta = v.theta; rig.tPhi = v.phi; rig.tRadius = v.radius;
    rig.tTarget.set(v.target[0], v.target[1], v.target[2]);
  };
  VS.cutTo = function (key) {
    VS.flyTo(key);
    rig.theta = rig.tTheta; rig.phi = rig.tPhi; rig.radius = rig.tRadius;
    rig.target.copy(rig.tTarget);
    updateCamera(1);
  };

  function updateCamera(dt) {
    var k = 1 - Math.exp(-dt * 2.6);
    rig.theta += (rig.tTheta - rig.theta) * k;
    rig.phi += (rig.tPhi - rig.phi) * k;
    rig.radius += (rig.tRadius - rig.radius) * k;
    rig.target.lerp(rig.tTarget, k);
    if (rig.autoRotate && !rig.dragging) {
      var sp = 0.05 * dt * (1 + (1 - Math.min(1, Math.abs(rig.radius - rig.tRadius) / 30)) * 0.5);
      if (rig.tRadius > 15) { rig.theta += sp; rig.tTheta += sp; }
    }
    rig.phi = Math.max(0.05, Math.min(1.70, rig.phi));
    rig.tPhi = Math.max(0.05, Math.min(1.70, rig.tPhi));
    var r = Math.max(1.2, rig.radius);
    var sp2 = Math.sin(rig.phi);
    var cam = VS.camera;
    cam.position.set(
      rig.target.x + r * sp2 * Math.sin(rig.theta),
      rig.target.y + r * Math.cos(rig.phi),
      rig.target.z + r * sp2 * Math.cos(rig.theta)
    );
    if (cam.position.y < 0.25) cam.position.y = 0.25;
    cam.lookAt(rig.target);
  }
  VS.updateCamera = updateCamera;

  VS.bindControls = function (canvas) {
    var last = null;
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      last = { x: e.clientX, y: e.clientY, btn: e.button };
      rig.dragging = true;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!last) return;
      var dx = e.clientX - last.x, dy = e.clientY - last.y;
      last.x = e.clientX; last.y = e.clientY;
      if (last.btn === 2 || e.shiftKey) {
        var right = new T.Vector3().subVectors(VS.camera.position, rig.target).cross(new T.Vector3(0, 1, 0)).normalize();
        var scale = rig.radius * 0.0016;
        var move = new T.Vector3().addScaledVector(right, -dx * scale).addScaledVector(new T.Vector3(0, 1, 0), dy * scale);
        rig.tTarget.add(move); rig.target.add(move);
      } else {
        rig.tTheta -= dx * 0.0062; rig.theta -= dx * 0.0062;
        rig.tPhi -= dy * 0.0050; rig.phi -= dy * 0.0050;
      }
    });
    function end() { last = null; rig.dragging = false; }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = Math.exp(e.deltaY * 0.0011);
      rig.tRadius = Math.max(2.4, Math.min(140, rig.tRadius * f));
      rig.tTarget.y += (0) ;
    }, { passive: false });
    var pinch = null;
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinch) rig.tRadius = Math.max(2.4, Math.min(140, rig.tRadius * (pinch / d)));
        pinch = d;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', function () { pinch = null; });
  };

  /* ============================================================
     ANNOTATIONS
     ============================================================ */
  var ANNOTS = [
    { zh: '光之十字', jp: '光の十字 · The Cross of Light', p: [0, 3.2, -9.0], off: [220, -110] },
    { zh: '四片独立的墙', jp: '四枚の壁 · four free panels', p: [-2.2, 4.3, -8.9], off: [-250, -70] },
    { zh: '清水混凝土', jp: '打放しコンクリート', p: [3.08, 3.0, -3.5], off: [240, 40] },
    { zh: '木质长凳', jp: '木の椅子 · pews', p: [1.6, 0.95, -0.6], off: [-215, 105] },
    { zh: '十五度自由墙', jp: '15度の壁 · the free wall', p: [-8.3, 4.3, 14.4], off: [-205, -125] },
    { zh: '光之狭缝', jp: '光のスリット · the slot', p: [-1.83, 1.36, 12.7], off: [220, 88] },
    { zh: '入口', jp: 'エントランス · the door', p: [-0.33, 1.10, 10.65], off: [235, -60] }
  ];
  var annotEls = [], annotOn = false;

  VS.buildAnnotations = function () {
    var layer = document.getElementById('annotLayer');
    var svg = document.getElementById('annotLines');
    ANNOTS.forEach(function (a) {
      var d = document.createElement('div');
      d.className = 'annot';
      d.innerHTML = '<span class="dot"></span><div class="txt"><b>' + a.zh + '</b><i>' + a.jp + '</i></div>';
      layer.appendChild(d);
      var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('stroke', 'rgba(46,52,66,0.72)');
      ln.setAttribute('stroke-width', '1.4');
      ln.setAttribute('stroke-dasharray', '1 5');
      ln.setAttribute('stroke-linecap', 'round');
      svg.appendChild(ln);
      annotEls.push({ def: a, el: d, line: ln });
    });
  };
  VS.setAnnotations = function (on) {
    annotOn = on;
    document.getElementById('annotLayer').style.opacity = on ? '1' : '0';
    document.getElementById('annotLines').style.opacity = on ? '1' : '0';
  };
  var v3 = new T.Vector3();
  var vRay = new T.Vector3(), vDir = new T.Vector3();
  var ray = new T.Raycaster();
  ray.far = 400;
  function occluded(p) {
    var occ = [VS.shell, VS.interior];
    var have = false;
    for (var i = 0; i < occ.length; i++) if (occ[i]) have = true;
    if (!have) return false;
    vRay.set(p[0], p[1], p[2]);
    vDir.subVectors(vRay, VS.camera.position);
    var dist = vDir.length();
    if (dist < 1.2) return false;
    ray.set(VS.camera.position, vDir.normalize());
    ray.far = dist - 0.35;
    var hits = ray.intersectObjects(occ, true);
    return hits.length > 0;
  }
  function updateAnnotations() {
    if (!annotOn) return;
    var w = window.innerWidth, h = window.innerHeight;
    for (var i = 0; i < annotEls.length; i++) {
      var A = annotEls[i];
      v3.set(A.def.p[0], A.def.p[1], A.def.p[2]).project(VS.camera);
      var sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
      var behind = v3.z > 1 || occluded(A.def.p);
      var lx = Math.max(96, Math.min(w - 96, sx + A.def.off[0]));
      var ly = Math.max(64, Math.min(h - 64, sy + A.def.off[1]));
      A.el.style.transform = 'translate(' + lx + 'px,' + ly + 'px)';
      A.el.style.opacity = behind ? '0' : '1';
      A.line.setAttribute('x1', sx); A.line.setAttribute('y1', sy);
      A.line.setAttribute('x2', lx + (A.def.off[0] > 0 ? -28 : 28)); A.line.setAttribute('y2', ly);
      A.line.style.opacity = behind ? '0' : '1';
    }
  }

  /* ============================================================
     UI
     ============================================================ */
  VS.bindUI = function () {
    document.querySelectorAll('.mood-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        VS.setMood(b.getAttribute('data-mood'));
        document.querySelectorAll('.mood-btn').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        VS.flyTo(b.getAttribute('data-view'));
        document.querySelectorAll('.view-btn').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    var tr = document.getElementById('tglRotate');
    tr.addEventListener('click', function () {
      rig.autoRotate = !rig.autoRotate;
      tr.classList.toggle('on', rig.autoRotate);
    });
    var ta = document.getElementById('tglAnnot');
    ta.addEventListener('click', function () {
      var on = !ta.classList.contains('on');
      ta.classList.toggle('on', on);
      VS.setAnnotations(on);
    });
    var panel = document.getElementById('panel');
    var tp = document.getElementById('tglPanel');
    tp.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      tp.classList.toggle('on', open);
    });
    document.getElementById('panelClose').addEventListener('click', function () {
      panel.classList.remove('open'); tp.classList.remove('on');
    });
    document.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'r') tr.click();
      else if (k === 'a') ta.click();
      else if (k === 'i') tp.click();
      else if (k === '1') document.querySelector('[data-mood="dawn"]').click();
      else if (k === '2') document.querySelector('[data-mood="noon"]').click();
      else if (k === '3') document.querySelector('[data-mood="dusk"]').click();
      else if (k === '4') document.querySelector('[data-mood="night"]').click();
    });
  };

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  var elapsed = 0, firstFrame = true;
  VS.start = function () {
    var dustPos = VS.dust ? VS.dust.geometry.attributes.position : null;
    var dustSeed = [];
    if (dustPos) for (var i = 0; i < dustPos.count; i++) dustSeed.push(Math.random() * 6.2832);

    function frame() {
      requestAnimationFrame(frame);
      var dt = Math.min(VS.clock.getDelta(), 0.06);
      elapsed += dt;
      VS.updateMood(dt);
      updateCamera(dt);

      for (var c = 0; c < VS.clouds.length; c++) {
        var cl = VS.clouds[c];
        cl.position.x += cl.userData.speed * dt * 2.0;
        if (cl.position.x > 210) cl.position.x = -210;
      }
      for (var b = 0; b < VS.birds.length; b++) {
        var bd = VS.birds[b].userData, a = elapsed * bd.sp * 6.28 + bd.ph;
        VS.birds[b].position.set(Math.cos(a) * bd.r, bd.y + Math.sin(elapsed * 0.7 + bd.ph) * 1.6, Math.sin(a) * bd.r);
        VS.birds[b].rotation.y = -a;
        var flap = Math.sin(elapsed * 7 + bd.ph) * 0.55;
        bd.w1.rotation.z = flap; bd.w2.rotation.z = -flap;
      }
      if (dustPos) {
        var arr = dustPos.array;
        for (var p = 0; p < dustPos.count; p++) {
          arr[p * 3] += Math.sin(elapsed * 0.32 + dustSeed[p]) * 0.0016;
          arr[p * 3 + 1] += 0.0075 * dt * (0.4 + (p % 7) * 0.16);
          arr[p * 3 + 2] += Math.cos(elapsed * 0.24 + dustSeed[p]) * 0.0018;
          if (arr[p * 3 + 1] > 5.75) arr[p * 3 + 1] = 0.3;
        }
        dustPos.needsUpdate = true;
      }

      VS.renderer.render(VS.scene, VS.camera);
      updateAnnotations();

      if (firstFrame) {
        firstFrame = false;
        var ld = document.getElementById('loader');
        if (ld) { ld.classList.add('gone'); setTimeout(function () { ld.style.display = 'none'; }, 900); }
      }
    }
    frame();
  };

  window.addEventListener('resize', function () {
    if (!VS.camera || !VS.renderer) return;
    VS.camera.aspect = window.innerWidth / window.innerHeight;
    VS.camera.updateProjectionMatrix();
    VS.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ============================================================
     BOOT
     ============================================================ */
  VS.boot = function () {
   try {
    var canvas = document.getElementById('stage');
    VS.initCore(canvas);
    VS.buildWorld();
    VS.initMood('dawn');
    VS.buildAnnotations();
    VS.bindControls(canvas);
    VS.bindUI();
    VS.setAnnotations(false);
    VS.flyTo('hero');
    var qs = new URLSearchParams(window.location.search);
    var qv = qs.get('view'); if (qv && VS.VIEWS[qv]) VS.flyTo(qv);
    var qm = qs.get('mood'); if (qm && VS.MOODS[qm]) {
      VS.setMood(qm);
      document.querySelectorAll('.mood-btn').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-mood') === qm);
      });
    }
    var qvb = qs.get('view');
    if (qvb) document.querySelectorAll('.view-btn').forEach(function (x) {
      x.classList.toggle('on', x.getAttribute('data-view') === qvb);
    });
    if (qs.get('annot') === '1') { VS.setAnnotations(true); document.getElementById('tglAnnot').classList.add('on'); }
    if (qs.get('nohud') === '1') {
      ['#titlebar', '#moods', '#views', '#tools', '#hint', '#panel'].forEach(function (sel) {
        var el = document.querySelector(sel); if (el) el.style.display = 'none';
      });
    }
    if (VS.STILL) {
      rig.theta = rig.tTheta; rig.phi = rig.tPhi; rig.radius = rig.tRadius;
      rig.target.copy(rig.tTarget);
      VS.snapMood();
      updateCamera(1);
      ['#titlebar', '#moods', '#views', '#tools', '#hint'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; }
      });
      VS.renderer.render(VS.scene, VS.camera);
      updateAnnotations();
      try {
        var gl = VS.renderer.getContext();
        var hh = VS.renderer.domElement.height, ww = VS.renderer.domElement.width;
        var px = new Uint8Array(4), out = [];
        var probes = [[0.5, 0.5], [0.5, 0.25], [0.2, 0.5], [0.78, 0.72], [0.5, 0.86]];
        for (var pi = 0; pi < probes.length; pi++) {
          gl.readPixels(Math.floor(ww * probes[pi][0]), Math.floor(hh * probes[pi][1]), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          out.push(px[0] + '.' + px[1] + '.' + px[2]);
        }
        document.documentElement.setAttribute('data-px', out.join('|'));
        document.documentElement.setAttribute('data-size', ww + 'x' + hh);
      } catch (e2) { document.documentElement.setAttribute('data-px', 'ERR ' + e2.message); }
      var ld0 = document.getElementById('loader'); if (ld0) ld0.style.display = 'none';
      document.documentElement.setAttribute('data-boot', 'ok');
      return;
    }
    VS.start();
    document.documentElement.setAttribute('data-boot', 'ok');
   } catch (err) {
    document.documentElement.setAttribute('data-boot', 'fail');
    var eb = document.getElementById('errbox');
    if (eb) { eb.style.cssText = 'position:fixed;z-index:99;left:12px;top:12px;max-width:92%;background:#fff;color:#b00;font:12px/1.5 monospace;padding:10px 12px;border:1px solid #b00;white-space:pre-wrap;'; eb.textContent += String(err && err.stack || err) + '\n'; }
   }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', VS.boot);
  else VS.boot();
})();
