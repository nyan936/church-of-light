/* ============================================================
   光之教堂 · Church of the Light
   安藤忠雄 Tadao Ando — Ibaraki, Osaka, 1989
   Refined-cartoon 3D scene · Part 1 : core / materials / textures
   ============================================================ */
(function () {
  'use strict';
  var T = THREE;

  /* ---------- palette ---------- */
  var C = {
    ink:        0x343a43,
    inkSoft:    0x565d68,
    concrete:   0xd7d2c7,
    concreteUp: 0xe6e1d7,
    concreteDn: 0xbeb7a9,
    concreteIn: 0xdfd9cd,
    stone:      0xaba598,
    wood:       0xc09a64,
    woodDk:     0x8f6a3d,
    woodLt:     0xd6b184,
    woodPale:   0xe4caa4,
    glow:       0xfff8ec,
    glowWarm:   0xffdca6,
    gravel:     0xe6ded0,
    grass:      0x9cc47e,
    grassDk:    0x7aa662,
    earth:      0xb08f66,
    trunk:      0x8a6a4c,
    leaf1:      0x7cb46a,
    leaf2:      0x9dd086,
    leaf3:      0x639e58,
    hill:       0xb6c6a6,
    hill2:      0x9aae8c,
    cloud:      0xffffff,
    cloth1:     0xdfe3ea,
    cloth2:     0x8093ab,
    cloth3:     0x5d6b7d,
    skin:       0xf0c8a4,
    hair:       0x3b3038,
    paper:      0xf7f3ea
  };

  /* ---------- module state ---------- */
  var VS = window.VS = {};
  VS.C = C;
  VS.T = T;

  var renderer, scene, camera, clock;
  var outlineMats = [], emissiveMats = [], glassMats = [];
  var gradientMap;

  /* ============================================================
     RENDERER / SCENE
     ============================================================ */
  VS.initCore = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.NoToneMapping;
    VS.STILL = /[?&]still=1/.test(window.location.search);
    if (VS.STILL) renderer.setPixelRatio(1);
    VS.renderer = renderer;

    scene = new T.Scene();
    VS.scene = scene;

    camera = new T.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.08, 900);
    VS.camera = camera;

    clock = new T.Clock();
    VS.clock = clock;

    gradientMap = makeGradientMap();
    VS.gradientMap = gradientMap;
    return { renderer: renderer, scene: scene, camera: camera };
  };

  function makeGradientMap() {
    var data = new Uint8Array([104, 152, 200, 232, 255]);
    var tex = new T.DataTexture(data, data.length, 1, T.RedFormat);
    tex.minFilter = T.NearestFilter;
    tex.magFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  /* ============================================================
     MATERIALS  —  flat toon shading + inverted-hull ink outline
     ============================================================ */
  VS.toon = function (color, o) {
    o = o || {};
    var m = new T.MeshToonMaterial({ color: new T.Color(color), gradientMap: gradientMap });
    if (o.emissive) { m.emissive = new T.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity === undefined ? 0.6 : o.emissiveIntensity; }
    if (o.opacity !== undefined) { m.transparent = true; m.opacity = o.opacity; }
    if (o.side !== undefined) m.side = o.side;
    if (o.map) m.map = o.map;
    return m;
  };

  var OUTLINE_VS = [
    'uniform float uThick;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vec3 n = normalize(normalMatrix * normal);',
    '  mv.xyz += n * uThick * max(0.0, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join(String.fromCharCode(10));

  var OUTLINE_FS = [
    'uniform vec3 uColor;',
    'void main() { gl_FragColor = vec4(uColor, 1.0); }'
  ].join(String.fromCharCode(10));

  var outlineColor = new T.Color(C.ink);
  VS.outlineColor = outlineColor;
  VS.setOutlineColor = function (hex) {
    outlineColor.set(hex);
    for (var i = 0; i < outlineMats.length; i++) outlineMats[i].uniforms.uColor.value.copy(outlineColor);
  };

  function outlineMat(thick) {
    return new T.ShaderMaterial({
      uniforms: { uThick: { value: thick }, uColor: { value: outlineColor.clone() } },
      vertexShader: OUTLINE_VS,
      fragmentShader: OUTLINE_FS,
      side: T.BackSide
    });
  }
  VS.outlineMat = outlineMat;

  /* generic solid with an inverted-hull ink outline */
  VS.solid = function (parent, geo, color, o) {
    o = o || {};
    var mat = o.material || VS.toon(color, o);
    var mesh = new T.Mesh(geo, mat);
    mesh.castShadow = o.cast !== false;
    mesh.receiveShadow = o.receive !== false;
    if (o.outline !== false) {
      var ol = new T.Mesh(geo, outlineMat(o.thickness || 0.0016));
      ol.castShadow = false; ol.receiveShadow = false;
      mesh.add(ol);
      outlineMats.push(ol.material);
    }
    parent.add(mesh);
    return mesh;
  };

  /* box placed by its bottom face (w,h,d in metres; cx,by,cz) */
  VS.bx = function (parent, w, h, d, cx, by, cz, color, o) {
    o = o || {};
    var m = VS.solid(parent, new T.BoxGeometry(w, h, d), color, o);
    m.position.set(cx, by + h / 2, cz);
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    if (o.rx) m.rotation.x = o.rx;
    return m;
  };

  VS.cyl = function (parent, rt, rb, h, cx, by, cz, color, o) {
    o = o || {};
    var m = VS.solid(parent, new T.CylinderGeometry(rt, rb, h, o.seg || 24, 1, !!o.open, o.thetaStart, o.thetaLen), color, o);
    m.position.set(cx, by + h / 2, cz);
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    if (o.rx) m.rotation.x = o.rx;
    return m;
  };

  VS.sph = function (parent, r, cx, cy, cz, color, o) {
    o = o || {};
    var m = VS.solid(parent, new T.IcosahedronGeometry(r, o.detail === undefined ? 1 : o.detail), color, o);
    m.position.set(cx, cy, cz);
    if (o.sy) m.scale.y = o.sy;
    return m;
  };

  VS.plane = function (parent, w, h, cx, cy, cz, color, o) {
    o = o || {};
    var m = VS.solid(parent, new T.PlaneGeometry(w, h), color, o);
    m.position.set(cx, cy, cz);
    if (o.rx) m.rotation.x = o.rx;
    if (o.ry) m.rotation.y = o.ry;
    if (o.rz) m.rotation.z = o.rz;
    return m;
  };

  /* ============================================================
     PROCEDURAL TEXTURES  (canvas, no external assets)
     ============================================================ */
  function canvasTex(size, draw) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    draw(g, size);
    var tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
  VS.canvasTex = canvasTex;

  /* as-cast concrete : mottling + formwork panel joints + tie holes */
  VS.texConcrete = function (o) {
    o = o || {};
    var base = o.base || '#ded9cf';
    return canvasTex(512, function (g, s) {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      var i, x, y, r, a;
      for (i = 0; i < 900; i++) {
        x = Math.random() * s; y = Math.random() * s; r = 3 + Math.random() * 12;
        a = 0.004 + Math.random() * 0.009;
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(122,118,106,' + a + ')';
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
      /* faint clouds of tone */
      for (i = 0; i < 20; i++) {
        x = Math.random() * s; y = Math.random() * s; r = 55 + Math.random() * 130;
        var grd = g.createRadialGradient(x, y, 0, x, y, r);
        var dark = Math.random() < 0.5;
        grd.addColorStop(0, dark ? 'rgba(118,114,102,0.013)' : 'rgba(255,255,255,0.015)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
      /* formwork joints : 2 x 2 panels per tile */
      if (o.joints !== false) {
        for (i = 0; i <= 2; i++) {
          var p = i * s / 2 + 0.5;
          g.strokeStyle = 'rgba(146,141,128,0.5)'; g.lineWidth = 2.0;
          g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.stroke();
          g.beginPath(); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(p + 1.6, 0); g.lineTo(p + 1.6, s); g.stroke();
          g.beginPath(); g.moveTo(0, p + 1.6); g.lineTo(s, p + 1.6); g.stroke();
        }
      }
      /* tie holes (cone plugs) */
      if (o.holes) {
        for (var ix = 0; ix < 2; ix++) for (var iy = 0; iy < 2; iy++) {
          var hx = ix * s / 2 + s / 4, hy = iy * s / 2 + s / 4;
          var rg = g.createRadialGradient(hx, hy, 1, hx, hy, 11);
          rg.addColorStop(0, 'rgba(96,92,82,0.95)');
          rg.addColorStop(0.45, 'rgba(138,133,120,0.55)');
          rg.addColorStop(0.75, 'rgba(255,255,255,0.35)');
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.beginPath(); g.arc(hx, hy, 11, 0, 6.2832); g.fill();
        }
      }
    });
  };

  /* timber boards : floor planks running along V */
  VS.texWood = function (o) {
    o = o || {};
    var planks = o.planks || 7;
    return canvasTex(512, function (g, s) {
      g.fillStyle = o.base || '#cba472';
      g.fillRect(0, 0, s, s);
      var pw = s / planks, i, j;
      for (i = 0; i < planks; i++) {
        var y0 = i * pw;
        var tone = 0.86 + Math.random() * 0.26;
        g.fillStyle = 'rgba(' + Math.floor(186 * tone) + ',' + Math.floor(148 * tone) + ',' + Math.floor(98 * tone) + ',0.75)';
        g.fillRect(0, y0, s, pw - 1);
        /* grain */
        for (j = 0; j < 26; j++) {
          var gy = y0 + Math.random() * pw;
          g.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '120,88,52' : '236,210,168') + ',' + (0.05 + Math.random() * 0.14) + ')';
          g.lineWidth = 0.7 + Math.random() * 1.5;
          g.beginPath(); g.moveTo(0, gy);
          for (var x = 0; x <= s; x += 32) g.lineTo(x, gy + Math.sin(x * 0.012 + i) * 2.4 + (Math.random() - 0.5) * 2.2);
          g.stroke();
        }
        /* butt joints */
        var bx = Math.random() * s;
        g.strokeStyle = 'rgba(112,80,46,0.5)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(bx, y0); g.lineTo(bx, y0 + pw); g.stroke();
        /* seam */
        g.fillStyle = 'rgba(104,74,42,0.62)';
        g.fillRect(0, y0 + pw - 2.2, s, 2.2);
      }
    });
  };

  /* soft radial glow sprite */
  VS.texGlow = function (inner, mid) {
    return canvasTex(256, function (g, s) {
      var rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, inner || 'rgba(255,252,240,1)');
      rg.addColorStop(0.28, mid || 'rgba(255,244,214,0.55)');
      rg.addColorStop(0.62, 'rgba(255,236,196,0.16)');
      rg.addColorStop(1, 'rgba(255,232,190,0)');
      g.fillStyle = rg; g.fillRect(0, 0, s, s);
    });
  };

  /* tiny soft dot for dust motes */
  VS.texDot = function () {
    return canvasTex(64, function (g, s) {
      var rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, 'rgba(255,250,236,1)');
      rg.addColorStop(0.35, 'rgba(255,246,224,0.5)');
      rg.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = rg; g.fillRect(0, 0, s, s);
    });
  };

  /* ============================================================
     VOLUMETRIC SHAFT SHADER
     a box whose local +Z runs from the slit into the room
     ============================================================ */
  VS.shaftMaterial = function (color, halfW, halfH, len) {
    return new T.ShaderMaterial({
      uniforms: {
        uColor: { value: new T.Color(color) },
        uOpacity: { value: 0.16 },
        uHalf: { value: new T.Vector2(halfW, halfH) },
        uLen: { value: len }
      },
      vertexShader: [
        'varying vec3 vPos;',
        'void main() {',
        '  vPos = position;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join(String.fromCharCode(10)),
      fragmentShader: [
        'uniform vec3 uColor;',
        'uniform float uOpacity;',
        'uniform vec2 uHalf;',
        'uniform float uLen;',
        'varying vec3 vPos;',
        'void main() {',
        '  float t = clamp(vPos.z / uLen, 0.0, 1.0);',
        '  float along = pow(1.0 - t, 1.7) * smoothstep(0.0, 0.06, t);',
        '  float ex = 1.0 - clamp(abs(vPos.x) / uHalf.x, 0.0, 1.0);',
        '  float ey = 1.0 - clamp(abs(vPos.y) / uHalf.y, 0.0, 1.0);',
        '  float e = pow(ex, 0.55) * pow(ey, 0.55);',
        '  float a = uOpacity * along * (0.28 + 0.72 * e);',
        '  if (a < 0.002) discard;',
        '  gl_FragColor = vec4(uColor, a);',
        '}'
      ].join(String.fromCharCode(10)),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide
    });
  };
})();
