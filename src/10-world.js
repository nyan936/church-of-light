/* ============================================================
   Church of the Light · Part 2 : sky / lights / church / interior
   ============================================================ */
(function () {
  'use strict';
  var T = THREE, VS = window.VS, C = VS.C;
  var NL = String.fromCharCode(10);

  /* ---------- key dimensions (metres) ---------- */
  var G = {
    WX: 3.10,    /* interior half width  */
    ZA: -9.00,   /* altar / cross wall, interior face */
    ZB: 9.00,    /* entrance wall, interior face */
    HY: 5.90,    /* interior height */
    TH: 0.45,    /* wall thickness */
    SW: 0.21,    /* half width of the slits */
    CTH: 0.24,   /* thickness of the four cross panels */
    CY: 2.60     /* height of the horizontal bar */
  };
  VS.G = G;
  var XO = G.WX + G.TH;

  /* ---------- module refs used by the mood engine ---------- */
  var sun, fill, hemi, skyMat, starsMat, cloudMat, groundMat, dustMat, dust;
  var crossGlowMats = [], shaftMats = [], innerLights = [], clouds = [], birds = [], shafts = [];
  var crossLightMat, outerLightMat, slotLightMat, nightGlowMat;

  /* ============================================================
     CONCRETE
     ============================================================ */
  function concMat(repU, repV, holes, base) {
    var tex = VS.texConcrete({ holes: holes, base: base });
    tex.repeat.set(repU, repV);
    return new T.MeshToonMaterial({ color: 0xffffff, gradientMap: VS.gradientMap, map: tex });
  }
  /* concrete box, tiled by its largest face */
  function cBox(parent, w, h, d, cx, by, cz, o) {
    o = o || {};
    var u = Math.max(w, d);
    var mat = concMat(Math.max(1, Math.round(u / 1.55)), Math.max(1, Math.round(h / 1.55)), o.holes, o.base);
    return VS.bx(parent, w, h, d, cx, by, cz, 0xffffff, {
      material: mat, thickness: o.thickness || 0.0016, ry: o.ry, rx: o.rx, rz: o.rz
    });
  }
  VS.cBox = cBox;
  VS.concMat = concMat;

  /* a slab: the wide faces tile by their own size, so the ceiling/roof reads flat */
  function slabMesh(parent, w, h, d, cx, by, cz, o) {
    o = o || {};
    var t = 1.55;
    var side = concMat(Math.max(1, Math.round(Math.max(w, d) / t)), Math.max(1, Math.round(h / t)), o.holes, o.base);
    var cap = concMat(Math.max(1, Math.round(w / t)), Math.max(1, Math.round(d / t)), o.holes, o.base);
    var geo = new T.BoxGeometry(w, h, d);
    var mesh = new T.Mesh(geo, [side, side, cap, cap, side, side]);
    mesh.position.set(cx, by + h / 2, cz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    var ol = new T.Mesh(geo, VS.outlineMat(o.thickness || 0.0018));
    ol.castShadow = false; ol.receiveShadow = false;
    mesh.add(ol);
    parent.add(mesh);
    return mesh;
  }
  VS.slabMesh = slabMesh;

  /* ============================================================
     SKY
     ============================================================ */
  function buildSky() {
    var g = new T.SphereGeometry(430, 40, 24);
    skyMat = new T.ShaderMaterial({
      uniforms: {
        uTop: { value: new T.Color(0x6ea6d8) },
        uMid: { value: new T.Color(0xcfe2ee) },
        uBottom: { value: new T.Color(0xf3e6d4) },
        uSunCol: { value: new T.Color(0xfff0cf) },
        uSunDir: { value: new T.Vector3(0, 1, -1) },
        uGlow: { value: 0.9 }
      },
      vertexShader: 'varying vec3 vPos;' + NL +
        'void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;',
        'uniform vec3 uSunCol; uniform vec3 uSunDir; uniform float uGlow;',
        'varying vec3 vPos;',
        'void main(){',
        '  vec3 d = normalize(vPos);',
        '  float h = clamp(d.y * 1.06 + 0.03, -1.0, 1.0);',
        '  vec3 col = mix(uMid, uTop, smoothstep(0.02, 0.78, h));',
        '  col = mix(uBottom, col, smoothstep(-0.18, 0.10, h));',
        '  float s = max(dot(d, normalize(uSunDir)), 0.0);',
        '  col += uSunCol * (pow(s, 7.0) * 0.30 + pow(s, 90.0) * 0.85) * uGlow;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join(NL),
      side: T.BackSide,
      depthWrite: false
    });
    var dome = new T.Mesh(g, skyMat);
    dome.frustumCulled = false;
    VS.scene.add(dome);

    /* stars */
    var N = 420, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var u = Math.random() * Math.PI * 2, v = Math.random() * 0.92 + 0.04;
      var r = 400;
      pos[i * 3] = Math.cos(u) * Math.cos(v) * r;
      pos[i * 3 + 1] = Math.sin(v) * r * 0.98 + 12;
      pos[i * 3 + 2] = Math.sin(u) * Math.cos(v) * r;
    }
    var sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.BufferAttribute(pos, 3));
    starsMat = new T.PointsMaterial({
      color: 0xffffff, size: 2.0, sizeAttenuation: false, transparent: true,
      opacity: 0, depthWrite: false, map: VS.texDot(), blending: T.AdditiveBlending, fog: false
    });
    var stars = new T.Points(sg, starsMat);
    stars.frustumCulled = false;
    VS.scene.add(stars);

    /* clouds */
    cloudMat = VS.toon(0xfdfcf8, { outline: false });
    for (var k = 0; k < 11; k++) {
      var cl = new T.Group();
      var puffs = 3 + Math.floor(Math.random() * 3);
      for (var p = 0; p < puffs; p++) {
        var s = VS.solid(cl, new T.IcosahedronGeometry(1, 1), 0xfdfcf8, { material: cloudMat, outline: false, cast: false, receive: false });
        s.position.set((p - puffs / 2) * 4.2 + Math.random() * 1.6, Math.random() * 1.5, Math.random() * 2.4);
        s.scale.set(4.5 + Math.random() * 3.4, 1.5 + Math.random() * 0.8, 3.2 + Math.random() * 2.2);
      }
      cl.position.set((Math.random() - 0.5) * 340, 52 + Math.random() * 44, -60 - Math.random() * 200);
      cl.userData.speed = 0.4 + Math.random() * 0.5;
      VS.scene.add(cl);
      clouds.push(cl);
    }

    /* distant hills */
    var hillCols = [C.hill, C.hill2];
    for (var hh = 0; hh < 9; hh++) {
      var hg = VS.solid(VS.scene, new T.IcosahedronGeometry(1, 2), hillCols[hh % 2], { outline: false, cast: false, receive: false });
      var ang = -0.4 + hh * 0.34 + Math.random() * 0.14;
      var dist = 210 + Math.random() * 90;
      hg.position.set(Math.sin(ang) * dist, -6 + Math.random() * 4, Math.cos(ang) * dist);
      hg.scale.set(60 + Math.random() * 60, 16 + Math.random() * 16, 44 + Math.random() * 40);
    }

    /* birds */
    for (var b = 0; b < 5; b++) {
      var bg = new T.Group();
      var bm = VS.toon(0x4a5260, { outline: false });
      var w1 = VS.solid(bg, new T.PlaneGeometry(1.1, 0.32), 0x4a5260, { material: bm, outline: false, cast: false, receive: false, side: T.DoubleSide });
      var w2 = VS.solid(bg, new T.PlaneGeometry(1.1, 0.32), 0x4a5260, { material: bm, outline: false, cast: false, receive: false, side: T.DoubleSide });
      w1.position.x = -0.55; w2.position.x = 0.55;
      bg.userData = { r: 70 + b * 26, y: 34 + Math.random() * 16, sp: 0.05 + Math.random() * 0.05, ph: Math.random() * 6.28, w1: w1, w2: w2 };
      VS.scene.add(bg);
      birds.push(bg);
    }
    VS.skyMat = skyMat; VS.starsMat = starsMat; VS.cloudMat = cloudMat;
  }

  /* ============================================================
     LIGHTS
     ============================================================ */
  function buildLights() {
    hemi = new T.HemisphereLight(0xdfeaf4, 0xc9b79a, 0.55);
    VS.scene.add(hemi);

    sun = new T.DirectionalLight(0xfff3dd, 2.1);
    sun.position.set(11.9, 41.1, -48.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    var sc = sun.shadow.camera;
    sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 22; sc.far = 112;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.028;
    sun.target.position.set(0, 2.6, -4.0);
    VS.scene.add(sun);
    VS.scene.add(sun.target);

    fill = new T.DirectionalLight(0xcfe0ee, 0.5);
    fill.position.set(-30, 21, 34);
    fill.target.position.set(0, 2.2, 2.0);
    fill.castShadow = true;
    fill.shadow.mapSize.set(2048, 2048);
    var fc = fill.shadow.camera;
    fc.left = -18; fc.right = 18; fc.top = 18; fc.bottom = -18; fc.near = 1; fc.far = 96;
    fill.shadow.bias = -0.0005;
    fill.shadow.normalBias = 0.03;
    VS.scene.add(fill);
    VS.scene.add(fill.target);

    /* interior bounce — the glow of the cross washing the concrete */
    var p1 = new T.PointLight(0xfff0d6, 3.0, 5.0, 1.6);
    p1.position.set(0, 3.0, -6.0);
    VS.scene.add(p1);
    innerLights.push({ light: p1, base: 3.0 });

    var p2 = new T.PointLight(0xe6ecf5, 1.6, 6.0, 1.6);
    p2.position.set(0.4, 4.4, 2.0);
    VS.scene.add(p2);
    innerLights.push({ light: p2, base: 1.6 });

    var p3 = new T.PointLight(0xfff2da, 2.2, 2.6, 1.6);
    p3.position.set(-1.9, 1.7, 11.0);
    VS.scene.add(p3);
    innerLights.push({ light: p3, base: 2.2 });

    VS.sun = sun; VS.fill = fill; VS.hemi = hemi;
    VS.clouds = clouds; VS.birds = birds;
    VS.interiorLights = innerLights;
  }

  /* ============================================================
     SITE
     ============================================================ */
  function tree(parent, x, z, sc, seed) {
    var g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(sc);
    var h = 4.6 + (seed % 3) * 0.7;
    VS.cyl(g, 0.16, 0.26, h, 0, 0, 0, C.trunk, { seg: 7 });
    var cols = [C.leaf1, C.leaf2, C.leaf3];
    var n = 5;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + seed;
      var r = 1.15 + (i % 2) * 0.5;
      var lf = VS.solid(g, new T.IcosahedronGeometry(1.25 + (i % 3) * 0.22, 0), cols[i % 3], {});
      lf.position.set(Math.cos(a) * r * 0.7, h - 0.35 + (i % 3) * 0.62, Math.sin(a) * r * 0.7);
      lf.scale.set(1, 0.82, 1);
    }
    VS.solid(g, new T.IcosahedronGeometry(1.5, 0), C.leaf2, {}).position.set(0, h + 0.6, 0);
    parent.add(g);
    return g;
  }

  function bush(parent, x, z, s, col) {
    var b = VS.solid(parent, new T.IcosahedronGeometry(0.7, 1), col || C.leaf3, {});
    b.position.set(x, 0.42 * s, z);
    b.scale.set(s, s * 0.8, s);
    return b;
  }

  function buildSite() {
    var ground = VS.plane(VS.scene, 520, 520, 0, -0.24, 0, C.grass, {
      outline: false, receive: true, cast: false, rx: -Math.PI / 2,
      material: new T.MeshToonMaterial({ color: 0xffffff, gradientMap: VS.gradientMap, map: VS.canvasTex(512, function (g, s) {
        g.fillStyle = '#e8f0dd'; g.fillRect(0, 0, s, s);
        for (var i = 0; i < 2600; i++) {
          var x = Math.random() * s, y = Math.random() * s;
          g.fillStyle = Math.random() < 0.5 ? 'rgba(150,186,124,0.34)' : 'rgba(240,248,226,0.34)';
          g.fillRect(x, y, 2 + Math.random() * 5, 1.4 + Math.random() * 3);
        }
      }) })
    });
    ground.material.map.repeat.set(38, 38);
    groundMat = ground.material;
    VS.groundMat = groundMat;

    /* concrete apron the church stands on */
    var apr = concMat(8, 20, false, '#e2ddd2');
    VS.plane(VS.scene, 13, 30, 0.4, -0.02, 1.4, 0xffffff, { material: apr, outline: false, cast: false, rx: -Math.PI / 2 });

    /* gravel approach court in front of the entrance */
    var gv = VS.canvasTex(256, function (g, s) {
      g.fillStyle = '#e7dfd0'; g.fillRect(0, 0, s, s);
      for (var i = 0; i < 1500; i++) {
        var v = (146 + Math.random() * 78) | 0;
        g.fillStyle = 'rgba(' + (v + 12) + ',' + v + ',' + (v - 16) + ',0.7)';
        g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, 6.2832); g.fill();
      }
    });
    gv.repeat.set(6, 8);
    VS.plane(VS.scene, 9.5, 12, -0.2, -0.005, 12.4, 0xffffff, {
      material: new T.MeshToonMaterial({ color: 0xffffff, gradientMap: VS.gradientMap, map: gv }),
      outline: false, cast: false, rx: -Math.PI / 2
    });

    /* stepping-stone path from the gate to the entrance slot */
    for (var i = 0; i < 7; i++) {
      var t = i / 6;
      VS.bx(VS.scene, 1.2, 0.06, 0.78, 1.55 - t * 1.5, -0.02, 16.6 - t * 5.1, C.gravel, { thickness: 0.0012 });
    }

    /* boundary wall + gate posts (south east) */
    cBox(VS.scene, 0.32, 1.7, 22, 7.6, -0.2, 2.0, { holes: true, thickness: 0.0014 });
    cBox(VS.scene, 0.32, 1.7, 12.5, 2.1, -0.2, 24.0, { holes: true, thickness: 0.0014, ry: 0.26 });
    cBox(VS.scene, 0.45, 2.2, 0.45, -3.4, -0.2, 24.6, { holes: true });
    cBox(VS.scene, 0.45, 2.2, 0.45, -1.1, -0.2, 23.9, { holes: true });

    /* planting */
    tree(VS.scene, -12.5, 6.5, 1.15, 1);
    tree(VS.scene, -9.0, 20.0, 0.95, 2);
    tree(VS.scene, 10.6, 16.5, 1.05, 3);
    tree(VS.scene, 12.4, -4.0, 1.25, 4);
    tree(VS.scene, -13.0, -6.0, 1.0, 5);
    tree(VS.scene, 8.4, -14.0, 1.1, 6);
    for (var b = 0; b < 16; b++) {
      var bx2 = -14 + Math.random() * 30, bz = -14 + Math.random() * 40;
      if (bx2 > -7 && bx2 < 9 && bz > -14 && bz < 20) continue;
      bush(VS.scene, bx2, bz, 0.7 + Math.random() * 0.8, [C.leaf1, C.leaf2, C.leaf3][b % 3]);
    }
    /* hedge along the west side of the court */
    for (var h = 0; h < 9; h++) bush(VS.scene, -9.6 - h * 0.05, 11.6 + h * 1.25, 0.78 + (h % 3) * 0.1, C.leaf3);
  }

  /* ============================================================
     CHURCH SHELL
     ============================================================ */
  function buildChurch() {
    var shell = new T.Group();
    VS.scene.add(shell);
    VS.shell = shell;

    var zLen = (G.ZB + G.TH) - (G.ZA - G.CTH);
    var zMid = ((G.ZB + G.TH) + (G.ZA - G.CTH)) / 2;

    /* side walls */
    cBox(shell, G.TH, G.HY, zLen, -(G.WX + G.TH / 2), 0, zMid, {});
    cBox(shell, G.TH, G.HY, zLen, (G.WX + G.TH / 2), 0, zMid, {});

    /* the four concrete panels that leave the cross of light */
    var xIn = G.SW, xOut = XO;
    var yA = G.CY - G.SW, yB = G.CY + G.SW;
    var pw = xOut - xIn, pcx = xIn + pw / 2;
    var zc = G.ZA - G.CTH / 2;
    var panels = [
      [pcx, 0, yA - 0, pw, yA],
      [-pcx, 0, yA - 0, pw, yA],
      [pcx, yB, G.HY - yB, pw, G.HY - yB],
      [-pcx, yB, G.HY - yB, pw, G.HY - yB]
    ];
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      cBox(shell, p[3], p[4], G.CTH, p[0], p[1], zc, {});
    }

    /* entrance wall with a doorway on the west side */
    var dz0 = -2.55, dz1 = -1.35, dh = 2.35;
    cBox(shell, dz0 - (-XO), G.HY, G.TH, (-XO + dz0) / 2, 0, G.ZB + G.TH / 2, {});
    cBox(shell, XO - dz1, G.HY, G.TH, (dz1 + XO) / 2, 0, G.ZB + G.TH / 2, {});
    cBox(shell, dz1 - dz0, G.HY - dh, G.TH, (dz0 + dz1) / 2, dh, G.ZB + G.TH / 2, {});

    /* roof slab — no overhang on the light wall, so nothing clips the beam */
    slabMesh(shell, 2 * XO + 0.3, 0.42, zLen + 0.21, 0, G.HY, zMid + 0.045, { thickness: 0.0018 });

    /* ---------- entrance vestibule (with its slot of light) ---------- */
    var vx0 = -XO, vx1 = -0.10, vz = 12.75, vh = 3.90;
    /* west wall */
    cBox(shell, G.TH, vh, vz - (G.ZB + G.TH), vx0 + G.TH / 2, 0, (G.ZB + G.TH + vz) / 2, {});
    /* east wall, opened by the door you actually walk in through */
    var ez0 = G.ZB + G.TH, ez1 = vz, ed0 = 10.15, ed1 = 11.15, edh = 2.15;
    cBox(shell, G.TH, vh, ed0 - ez0, vx1 - G.TH / 2, 0, (ez0 + ed0) / 2, {});
    cBox(shell, G.TH, vh, ez1 - ed1, vx1 - G.TH / 2, 0, (ed1 + ez1) / 2, {});
    cBox(shell, G.TH, vh - edh, ed1 - ed0, vx1 - G.TH / 2, edh, (ed0 + ed1) / 2, {});
    /* a concrete step outside the door, and the dark reveal of the jamb */
    cBox(shell, 0.62, 0.14, 1.35, vx1 + 0.22, -0.14, (ed0 + ed1) / 2, { holes: false });
    var jambMat = VS.toon(0x6b665c, { outline: false });
    VS.bx(shell, 0.05, edh, 0.05, vx1 - 0.02, 0.001, ed0 + 0.04, 0xffffff, { material: jambMat, outline: false, cast: false });
    VS.bx(shell, 0.05, edh, 0.05, vx1 - 0.02, 0.001, ed1 - 0.04, 0xffffff, { material: jambMat, outline: false, cast: false });
    /* south wall with the horizontal slit */
    var sy0 = 1.26, sy1 = 1.46, sx0 = -3.05, sx1 = -0.60;
    var zv = vz + G.TH / 2;
    cBox(shell, sx0 - vx0, sy0, G.TH, (vx0 + sx0) / 2, 0, zv, {});
    cBox(shell, vx1 - sx1, vh, G.TH, (sx1 + vx1) / 2, 0, zv, {});
    cBox(shell, sx1 - sx0, sy0, G.TH, (sx0 + sx1) / 2, 0, zv, {});
    cBox(shell, sx1 - sx0, vh - sy1, G.TH, (sx0 + sx1) / 2, sy1, zv, {});
    /* vestibule roof */
    slabMesh(shell, vx1 - vx0 + 0.24, 0.34, vz - (G.ZB + G.TH) + 0.24, (vx0 + vx1) / 2, vh, (G.ZB + G.TH + vz) / 2, {});

    /* ---------- the 15° free-standing wall ---------- */
    cBox(shell, 6.8, 4.30, 0.36, -6.30, 0, 14.90, { thickness: 0.0018, ry: 0.26 });
    /* the ground it stands on */
    cBox(shell, 8.0, 0.24, 1.5, -6.30, -0.24, 14.90, { ry: 0.26, holes: false });

    /* ---------- shadow gaps at the base of the interior ---------- */
    var gapMat = VS.toon(0x6f6a60, { outline: false });
    VS.bx(shell, 0.055, 0.075, zLen - 0.9, -G.WX + 0.01, 0.001, 0, 0xffffff, { material: gapMat, outline: false, cast: false });
    VS.bx(shell, 0.055, 0.075, zLen - 0.9, G.WX - 0.01, 0.001, 0, 0xffffff, { material: gapMat, outline: false, cast: false });
    VS.bx(shell, 2 * G.WX - 0.2, 0.075, 0.055, 0, 0.001, G.ZB - 0.01, 0xffffff, { material: gapMat, outline: false, cast: false });
  }

  /* ============================================================
     INTERIOR
     ============================================================ */
  function pew(parent, z) {
    var cx = 0.45, len = 2.46, x0 = cx - len / 2, x1 = cx + len / 2;
    var woodT = VS.texWood({ planks: 6 });
    woodT.repeat.set(1.4, 0.25);
    var seatMat = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: VS.gradientMap, map: woodT });
    /* seat */
    VS.bx(parent, len, 0.085, 0.46, cx, 0.43, z, 0xffffff, { material: seatMat });
    /* backrest */
    var back = VS.bx(parent, len, 0.52, 0.07, cx, 0.52, z + 0.24, C.wood, {});
    back.rotation.x = -0.10;
    /* book ledge behind */
    VS.bx(parent, len, 0.045, 0.14, cx, 0.80, z + 0.40, C.woodLt, {});
    /* solid end cheeks */
    VS.bx(parent, 0.06, 0.92, 0.50, x0 + 0.04, 0, z + 0.05, C.woodDk, {});
    VS.bx(parent, 0.06, 0.92, 0.50, x1 - 0.04, 0, z + 0.05, C.woodDk, {});
    /* front rail */
    VS.bx(parent, len - 0.1, 0.07, 0.06, cx, 0.30, z - 0.22, C.woodDk, {});
  }

  function figure(parent, x, z, ry, sitting, col) {
    var g = new T.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    var bodyH = sitting ? 0.62 : 0.86;
    var y0 = sitting ? 0.52 : 0.72;
    VS.bx(g, 0.42, bodyH, 0.26, 0, y0, 0, col || C.cloth3, {});
    VS.sph(g, 0.118, 0, y0 + bodyH + 0.13, 0, C.skin, { detail: 1 });
    VS.sph(g, 0.128, 0, y0 + bodyH + 0.15, 0, C.hair, { detail: 1, sy: 0.82 });
    if (sitting) {
      VS.bx(g, 0.40, 0.24, 0.44, 0, 0.30, 0.16, C.cloth2, {});
      VS.bx(g, 0.36, 0.30, 0.12, 0, 0, 0.34, C.cloth3, {});
    } else {
      VS.bx(g, 0.36, 0.78, 0.16, 0, 0, 0, C.cloth2, {});
    }
    parent.add(g);
    return g;
  }

  function buildInterior() {
    var g = new T.Group();
    VS.scene.add(g);
    VS.interior = g;
    var len = G.ZB - G.ZA, wid = G.WX * 2;

    /* oak floor */
    var ft = VS.texWood({ planks: 8 });
    ft.center.set(0.5, 0.5);
    ft.rotation = Math.PI / 2;
    ft.repeat.set(1.2, 1.1);
    var floor = VS.plane(g, wid, len, 0, 0.004, 0, 0xffffff, {
      material: new T.MeshToonMaterial({ color: 0xffffff, gradientMap: VS.gradientMap, map: ft }),
      rx: -Math.PI / 2, outline: false, cast: false
    });
    floor.receiveShadow = true;
    VS.floorMesh = floor;

    /* sanctuary platform */
    VS.bx(g, wid, 0.11, 2.10, 0, 0, G.ZA + 1.05, C.woodDk, {});
    VS.bx(g, wid, 0.06, 0.30, 0, 0.11, G.ZA + 2.10, C.woodLt, {});

    /* pews — a single block, aisle on the west */
    for (var i = 0; i < 8; i++) pew(g, -6.05 + i * 1.32);

    /* lectern + simple table */
    var lect = new T.Group();
    lect.position.set(0.95, 0.11, -7.35);
    VS.bx(lect, 0.62, 0.94, 0.42, 0, 0, 0, C.woodDk, {});
    var top = VS.bx(lect, 0.66, 0.06, 0.50, 0, 0.94, 0, C.woodLt, {});
    top.rotation.x = -0.24;
    VS.bx(lect, 0.30, 0.05, 0.22, 0, 1.02, 0.02, C.woodPale, {});
    g.add(lect);

    VS.bx(g, 1.15, 0.72, 0.52, -1.35, 0.11, -7.55, C.wood, {});

    /* stone font by the door */
    VS.cyl(g, 0.30, 0.36, 0.60, -2.25, 0, 7.62, C.stone, { seg: 18 });
    VS.cyl(g, 0.36, 0.34, 0.10, -2.25, 0.60, 7.62, C.stone, { seg: 18 });
    VS.cyl(g, 0.28, 0.28, 0.04, -2.25, 0.64, 7.62, 0x8fa3ad, { seg: 18, outline: false });

    /* one seated visitor, one standing */
    figure(g, 1.05, -3.15, Math.PI, true, C.cloth3);
    figure(g, -0.55, -1.85, Math.PI * 0.94, true, C.cloth2);
    figure(g, -1.85, -6.4, Math.PI * 0.72, false, 0x6f7b8c);

    /* a small wooden cross on the sanctuary wall? no — keep the cross of light alone */

    /* ceiling recess line */
    var gapMat = VS.toon(0x6f6a60, { outline: false });
    VS.bx(g, wid + 0.02, 0.05, 0.05, 0, G.HY - 0.05, G.ZA + 0.05, 0xffffff, { material: gapMat, outline: false, cast: false });
  }

  /* ============================================================
     LIGHT : slit glow, volumetric shafts, dust
     ============================================================ */
  function orientZ(mesh, dir) {
    var zA = dir.clone().normalize();
    var xA = new T.Vector3(0, 1, 0).cross(zA).normalize();
    var yA = new T.Vector3().crossVectors(zA, xA);
    mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xA, yA, zA));
  }
  /* The beam is a sheared prism: its aperture stays the vertical slit rectangle and it is
     swept along the sun direction.  Rotating a box instead would swing the 5.9 m cross-section
     out through the wall. */
  VS.placeShafts = function (dir) {
    for (var i = 0; i < shafts.length; i++) {
      var S = shafts[i];
      S.mat.set(
        1, 0, dir.x, S.o.x,
        0, 1, dir.y, S.o.y,
        0, 0, 1 + dir.z, S.o.z,
        0, 0, 0, 1
      );
      S.mesh.matrix.copy(S.mat);
      S.mesh.matrixWorldNeedsUpdate = true;
    }
  };

  function buildLight() {
    var lightG = new T.Group();
    VS.scene.add(lightG);
    /* the over-exposed world OUTSIDE the wall: seen only through the slits, from within,
       so the cross reads as an opening cut through 24 cm of concrete rather than a lit panel */
    outerLightMat = new T.MeshBasicMaterial({ color: 0xfffdf7, fog: false, side: T.FrontSide });
    var out = new T.Mesh(new T.PlaneGeometry(6.6, 6.6), outerLightMat);
    out.position.set(0, 2.95, G.ZA - 1.15);
    out.castShadow = false; out.receiveShadow = false;
    lightG.add(out);
    /* a second, dimmer sheet further out gives the opening a little depth */
    var out2Mat = new T.MeshBasicMaterial({ color: 0xfff6e4, fog: false, side: T.FrontSide, transparent: true, opacity: 0.85 });
    var out2 = new T.Mesh(new T.PlaneGeometry(11, 8), out2Mat);
    out2.position.set(0, 3.2, G.ZA - 3.6);
    out2.castShadow = false; out2.receiveShadow = false;
    lightG.add(out2);
    crossLightMat = outerLightMat;

    /* after dark the same opening glows outward — the building reads as a lantern */
    nightGlowMat = new T.MeshBasicMaterial({ color: 0xfff4de, fog: false, side: T.FrontSide, transparent: true, opacity: 0.12, depthWrite: false });
    var gn = new T.Mesh(new T.PlaneGeometry(1.6, 6.5), nightGlowMat);
    gn.position.set(0, G.HY / 2, G.ZA - G.CTH - 0.30);
    gn.rotation.y = Math.PI;
    gn.castShadow = false; gn.receiveShadow = false;
    lightG.add(gn);
    var gh2 = new T.Mesh(new T.PlaneGeometry(7.7, 1.6), nightGlowMat);
    gh2.position.set(0, G.CY, G.ZA - G.CTH - 0.30);
    gh2.rotation.y = Math.PI;
    gh2.castShadow = false; gh2.receiveShadow = false;
    lightG.add(gh2);
    VS.nightGlowMat = nightGlowMat;

    /* halo inside */
    var gt = VS.texGlow('rgba(255,253,246,0.95)', 'rgba(255,243,214,0.5)');
    function halo(w, h, x, y, z, op) {
      var m = new T.MeshBasicMaterial({ map: gt, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, color: 0xffffff });
      var mesh = new T.Mesh(new T.PlaneGeometry(w, h), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = false; mesh.receiveShadow = false;
      lightG.add(mesh);
      m.userData.base = op;
      crossGlowMats.push(m);
      return mesh;
    }
    halo(2.5, 7.5, 0, 2.95, G.ZA - 0.02, 0.42);
    halo(8.1, 2.5, 0, G.CY, G.ZA - 0.02, 0.42);
    /* spill outside, seen at dusk and after dark */
    var hs = halo(2.8, 8.0, 0, 2.95, G.ZA - G.CTH - 0.03, 0.12);
    var hs2 = halo(8.6, 2.8, 0, G.CY, G.ZA - G.CTH - 0.03, 0.12);
    hs.material.userData.outer = true; hs2.material.userData.outer = true;

    /* the slot of light at the entrance */
    slotLightMat = new T.MeshBasicMaterial({ color: 0xfffdf6, fog: false, side: T.DoubleSide });
    var sl = new T.Mesh(new T.PlaneGeometry(2.44, 0.19), slotLightMat);
    sl.position.set(-1.83, 1.36, 12.75 + G.TH / 2);
    lightG.add(sl);
    halo(3.6, 1.7, -1.83, 1.36, 12.7, 0.22);

    /* volumetric shafts — re-oriented to the sun each frame */
    function shaft(w, h, half, len, cx, cy, cz, op) {
      var m = VS.shaftMaterial(0xfff2d8, half[0], half[1], len);
      m.uniforms.uOpacity.value = op;
      m.userData.base = op;
      var geo = new T.BoxGeometry(w, h, len);
      geo.translate(0, 0, len / 2);
      var mesh = new T.Mesh(geo, m);
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      lightG.add(mesh);
      shaftMats.push(m);
      shafts.push({ mesh: mesh, o: new T.Vector3(cx, cy, cz), len: len, mat: new T.Matrix4() });
      return mesh;
    }
    shaft(G.SW * 2, G.HY, [G.SW * 2.6, G.HY / 2], 16, 0, G.HY / 2, G.ZA, 0.30);
    shaft(2 * XO, G.SW * 2, [XO, G.SW * 2.6], 14, 0, G.CY, G.ZA, 0.24);
    /* slot shaft in the vestibule */
    shaft(2.44, 0.20, [1.22, 0.16], 7, -1.83, 1.36, 12.75, 0.20);
    VS.placeShafts(new T.Vector3(-0.198, -0.643, 0.740).normalize());

    /* dust motes */
    var N = 900, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (2 * G.WX - 0.3);
      pos[i * 3 + 1] = 0.25 + Math.random() * (G.HY - 0.7);
      pos[i * 3 + 2] = G.ZA + 0.4 + Math.random() * (G.ZB - G.ZA - 0.8);
    }
    var dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(pos, 3));
    dustMat = new T.PointsMaterial({
      color: 0xfff1d2, size: 0.045, sizeAttenuation: true, transparent: true,
      opacity: 0.5, depthWrite: false, map: VS.texDot(), blending: T.AdditiveBlending
    });
    dust = new T.Points(dg, dustMat);
    dust.frustumCulled = false;
    lightG.add(dust);
    VS.dust = dust;

    VS.crossGlowMats = crossGlowMats;
    VS.shaftMats = shaftMats;
    VS.dustMat = dustMat;
    VS.crossLightMat = crossLightMat;
    VS.outerLightMat = outerLightMat;
    VS.slotLightMat = slotLightMat;
  }

  /* ============================================================
     BUILD ALL
     ============================================================ */
  VS.buildWorld = function () {
    buildSky();
    buildLights();
    buildSite();
    buildChurch();
    buildInterior();
    buildLight();
  };
  VS.buildSky = buildSky;
  VS.buildLights = buildLights;
  VS.buildSite = buildSite;
  VS.buildChurch = buildChurch;
  VS.buildInterior = buildInterior;
  VS.buildLight = buildLight;
})();
