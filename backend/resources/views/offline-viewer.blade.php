<!DOCTYPE html>
<html lang="{{ $lang ?? 'fr' }}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $name }} — Anatomy 3D Offline</title>
<style>
:root {
  --dash-bg: rgb(1, 11, 37);
  --dash-sidebar-bg: rgb(1, 11, 37);
  --dash-border: rgba(255, 255, 255, 0.08);
  --dash-text-main: #f9fafb;
  --dash-text-muted: #9ca3af;
  --dash-accent-hover: rgba(255, 255, 255, 0.05);
  --dash-primary: #056CF2;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { height: 100vh; overflow: hidden; font-family: 'Manrope', 'Inter', sans-serif; background: var(--dash-bg); color: var(--dash-text-main); display: flex; flex-direction: column; }

#top-bar { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 20px; background: var(--dash-sidebar-bg); border-bottom: 2px solid var(--dash-border); }
#top-bar .title-group { display: flex; align-items: center; gap: 14px; }
#top-bar .back-btn { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--dash-border); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
#top-bar h1 { font-size: 14px; font-weight: 700; color: var(--dash-text-main); text-transform: uppercase; letter-spacing: 0.5px; }

.viewer { display: flex; flex: 1; min-height: 0; }

#hierarchy-panel { width: 280px; background: var(--dash-sidebar-bg); border-right: 1px solid var(--dash-border); display: flex; flex-direction: column; }
#hierarchy-panel .panel-header { padding: 15px; border-bottom: 1px solid var(--dash-border); background: var(--dash-accent-hover); }
#hierarchy-panel .panel-header h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--dash-text-main); }

.hierarchy-actions { padding: 10px; display: flex; gap: 6px; flex-wrap: wrap; background: var(--dash-bg); border-bottom: 1px solid var(--dash-border); }
.ha-btn { width: 34px; height: 34px; background: rgba(0,0,0,0.6); border: 1px solid var(--dash-border); border-radius: 8px; color: #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.ha-btn:hover { background: var(--dash-accent-hover); border-color: var(--dash-primary); color: #fff; }
.ha-btn:disabled { opacity: 0.2; }

#hierarchy-root { padding: 10px; flex: 1; overflow-y: auto; }
#hierarchy-root ul { list-style: none; padding-left: 20px; }
.item-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--dash-text-main); transition: all 0.2s; }
.item-row:hover { background: var(--dash-accent-hover); }
.item-row.selected { background: var(--dash-primary); color: #fff; }
.item-row.hidden { opacity: 0.5; font-style: italic; }

.eye-btn, .iso-btn { background: none; border: none; cursor: pointer; opacity: 0.7; color: #fff; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }
.eye-btn:hover { opacity: 1; }

.caret { cursor: pointer; user-select: none; margin-right: 5px; }
.caret::before { content: '▶'; font-size: 10px; transition: transform 0.2s; display: inline-block; color: #666; }
.caret-down::before { transform: rotate(90deg); }
.nested { display: none; }
.nested.active { display: block; }

#canvas-container { flex: 1; position: relative; background: #050505; }
.labels-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 5; transition: opacity 0.3s; }

.anatomy-label-pin { position: absolute; pointer-events: none; }
.label-text { position: absolute; background: #000; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; white-space: nowrap; border: 1.5px solid #fbbf24; box-shadow: 0 4px 15px rgba(0,0,0,0.8); text-transform: uppercase; letter-spacing: 1px; }

#description-panel { width: 320px; background: var(--dash-bg); border-left: 1px solid var(--dash-border); display: flex; flex-direction: column; }
#description-panel .panel-header { padding: 15px; border-bottom: 1px solid var(--dash-border); background: var(--dash-accent-hover); }
#description-panel .panel-header h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--dash-text-main); }
#desc-text { padding: 20px; font-size: 14px; line-height: 1.6; color: var(--dash-text-main); }
#desc-text strong { color: var(--dash-primary); font-size: 16px; display: block; margin-bottom: 10px; }

.dpad-controls { position: absolute; bottom: 24px; right: 24px; display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(3, 44px); gap: 4px; z-index: 10; pointer-events: none; }
.dpad-btn { width: 44px; height: 44px; background: rgba(10, 10, 20, 0.75); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: all; }
.dpad-btn:hover { background: rgba(14,165,233,0.45); border-color: rgba(14,165,233,0.6); }
.dpad-up { grid-column: 2; grid-row: 1; }
.dpad-left { grid-column: 1; grid-row: 2; }
.dpad-right { grid-column: 3; grid-row: 2; }
.dpad-down { grid-column: 2; grid-row: 3; }

.loading-msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--dash-bg); z-index: 100; color: #fbbf24; font-weight: 800; font-size: 18px; letter-spacing: 2px; }

@media (max-width: 1200px) { #hierarchy-panel { width: 230px; } #description-panel { width: 260px; } }
@media (max-width: 900px) { .viewer { flex-direction: column; } #hierarchy-panel, #description-panel { width: 100%; max-height: 200px; } }
</style>
</head>
<body>
<div id="top-bar">
  <div class="title-group">
    <div class="back-btn">←</div>
    <h1>{{ $name }} — Anatomy 3D</h1>
  </div>
  <div style="display:flex; gap:12px;">
    <button class="ha-btn" onclick="cycleBg()" title="Couleur de fond">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0 0 20z"></path></svg>
    </button>
    <button id="btn-toggle-labels" class="ha-btn" onclick="toggleLabels()" title="Étiquettes">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
    </button>
    <button class="ha-btn" onclick="captureScene()" title="Capturer">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
    </button>
  </div>
</div>
<div class="viewer">
  <div id="hierarchy-panel">
    <div class="panel-header"><h3>HIÉRARCHIE ANATOMIQUE</h3></div>
    <div class="hierarchy-actions">
      <button id="btn-isolate" class="ha-btn" onclick="isolateSelection()" disabled title="Isoler">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M3 12h3m12 0h3M12 3v3m0 12v3"></path></svg>
      </button>
      <button class="ha-btn" onclick="revealAll()" title="Réinitialiser">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
      </button>
    </div>
    <div id="hierarchy-root"></div>
  </div>
  <div id="canvas-container">
    <div class="loading-msg">CHARGEMENT EN COURS...</div>
    <div class="labels-overlay" id="labels-overlay"></div>
    <div class="dpad-controls">
      <button class="dpad-btn dpad-up" onclick="zoomIn()">+</button>
      <button class="dpad-btn dpad-left" onclick="rotateLeft()">←</button>
      <button class="dpad-btn dpad-right" onclick="rotateRight()">→</button>
      <button class="dpad-btn dpad-down" onclick="zoomOut()">−</button>
    </div>
  </div>
  <div id="description-panel">
    <div class="panel-header"><h3>Description</h3></div>
    <div id="desc-text">Cliquez sur un os pour voir sa description.</div>
  </div>
</div>

<script src="./three-bundle.js"></script>
<script src="./model.glb.js"></script>
<script>
const HIERARCHY_DATA = {!! $hierarchyJson !!};
</script>
<script>
const canvas = document.getElementById('canvas-container');
const loadingMsg = canvas.querySelector('.loading-msg');
const descText = document.getElementById('desc-text');
const hierarchyRoot = document.getElementById('hierarchy-root');
const labelsOverlay = document.getElementById('labels-overlay');

let scene, camera, renderer, controls, model;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const meshes = new Map();
const anatomyData = [];
let selectedObject = null;
let showLabels = true;

const ICONS = {
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  target: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M3 12h3m12 0h3M12 3v3m0 12v3"></path></svg>'
};

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(3, 2, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  canvas.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(5, 10, 7);
  mainLight.castShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.PointLight(0x4466cc, 0.5);
  fillLight.position.set(-2, 1, 3);
  scene.add(fillLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.5, 0);
}

function base64ToArrayBuffer(b64) {
  var binary = atob(b64);
  var len = binary.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function loadModel() {
  return new Promise(function(resolve, reject) {
    if (typeof GLB_BASE64 === 'undefined') return reject(new Error("Données 3D manquantes."));
    var data = base64ToArrayBuffer(GLB_BASE64);
    var loader = new GLTFLoader();
    loader.parse(data, '', function(gltf) { resolve(gltf.scene); }, undefined, reject);
  });
}

function processModel(sceneNode) {
  sceneNode.traverse(function(child) {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xECE2D0, roughness: 0.5, metalness: 0.1 });
      var info = anatomyData.find(function(d) { return d.three_js_name === child.name; });
      if (info) child.userData.info = info;
      meshes.set(child.name, child);
    }
  });

  var box = new THREE.Box3().setFromObject(sceneNode);
  var center = box.getCenter(new THREE.Vector3());
  sceneNode.position.sub(center);
  var s = 1.6 / Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
  sceneNode.scale.set(s, s, s);

  scene.add(sceneNode);
  controls.target.set(0, 0, 0);
  controls.update();
}

function buildHierarchy() {
  var roots = anatomyData.filter(function(d) { return !d.parent_id || d.parent_id === 0; });
  var ul = document.createElement('ul');
  hierarchyRoot.innerHTML = '';
  hierarchyRoot.appendChild(ul);
  roots.forEach(function(root) { renderTreeNode(root, ul, new Set()); });
}

function renderTreeNode(item, containerUl, ancestors) {
  var li = document.createElement('li');
  var row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.id = item.id;

  var mesh = meshes.get(item.three_js_name);

  var eyeBtn = document.createElement('button');
  eyeBtn.className = 'eye-btn';
  eyeBtn.innerHTML = (mesh && !mesh.visible) ? ICONS.eyeOff : ICONS.eye;
  row.appendChild(eyeBtn);

  var isoBtn = document.createElement('button');
  isoBtn.className = 'iso-btn';
  isoBtn.innerHTML = ICONS.target;
  row.appendChild(isoBtn);

  var span = document.createElement('span');
  span.textContent = item.name;
  var children = anatomyData.filter(function(c) { return c.parent_id === item.id && !ancestors.has(c.id); });
  if (children.length > 0) span.classList.add('caret');
  row.appendChild(span);

  if (children.length > 0) {
    var childUl = document.createElement('ul');
    childUl.className = 'nested';
    var newAnc = new Set(ancestors); newAnc.add(item.id);
    children.forEach(function(c) { renderTreeNode(c, childUl, newAnc); });
    li.appendChild(childUl);
    span.onclick = function(e) { e.stopPropagation(); childUl.classList.toggle('active'); span.classList.toggle('caret-down'); };
  }

  eyeBtn.onclick = function(e) {
    e.stopPropagation();
    var state = mesh ? !mesh.visible : !row.classList.contains('hidden');
    
    const applyVis = (itId, s) => {
      anatomyData.filter(d => d.id === itId).forEach(d => {
        const m = meshes.get(d.three_js_name);
        if (m) m.visible = s;
      });
    };
    applyVis(item.id, !state); // Toggle logic simplified
    syncUI();
  };

  isoBtn.onclick = function(e) {
    e.stopPropagation();
    const getAllIds = (it) => {
      let ids = [it.id];
      anatomyData.filter(c => c.parent_id === it.id).forEach(c => ids = ids.concat(getAllIds(c)));
      return ids;
    };
    const allowed = new Set(getAllIds(item));
    const anc = new Set();
    meshes.forEach(m => {
      if (m.userData.info && allowed.has(m.userData.info.id)) {
        let p = m.parent; while(p) { anc.add(p.uuid); p = p.parent; }
      }
    });

    meshes.forEach(m => {
      const mId = m.userData.info?.id;
      if (mId && allowed.has(mId)) m.visible = true;
      else if (anc.has(m.uuid)) m.visible = true;
      else m.visible = false;
    });
    syncUI();
  };

  row.onclick = function() {
    if (mesh) {
      deselect();
      selectedObject = mesh;
      mesh.material.emissive.setHex(0x335588);
      row.classList.add('selected');
      showDescription(item, mesh.name);
      document.getElementById('btn-isolate').disabled = false;
    } else {
      showDescription(item, item.name);
    }
  };

  li.prepend(row);
  containerUl.appendChild(li);
}

function syncUI() {
  document.querySelectorAll('.item-row').forEach(row => {
    const id = parseInt(row.dataset.id);
    const item = anatomyData.find(d => d.id === id);
    if (!item) return;
    const mesh = meshes.get(item.three_js_name);
    if (mesh) {
      row.classList.toggle('hidden', !mesh.visible);
      row.querySelector('.eye-btn').innerHTML = mesh.visible ? ICONS.eye : ICONS.eyeOff;
    }
  });
  syncLabels();
}

function isolateSelection() {
  if (!selectedObject || !model) return;
  const target = selectedObject;
  
  // 1. Collecter tous les ancêtres (pour garder le chemin visible)
  const ancestors = new Set();
  let p = target.parent;
  while (p) { ancestors.add(p.uuid); p = p.parent; }

  // 2. Collecter tous les descendants (pour garder la partie entière visible)
  const descendants = new Set();
  target.traverse(c => descendants.add(c.uuid));

  // 3. Traiter tout le modèle
  model.traverse(obj => {
    if (obj === target || ancestors.has(obj.uuid) || descendants.has(obj.uuid)) {
      obj.visible = true;
    } else {
      obj.visible = false;
    }
  });

  syncUI();
}

function revealAll() {
  meshes.forEach(m => { m.visible = true; });
  syncUI();
}

function showDescription(info, fallback) {
  descText.innerHTML = '<strong>' + (info?.name || fallback) + '</strong><p>' + (info?.description || 'No description.') + '</p>';
}

function deselect() {
  if (selectedObject) selectedObject.material.emissive.setHex(000000);
  selectedObject = null;
  document.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected'));
  document.getElementById('btn-isolate').disabled = true;
}

function cycleBg() {
  const colors = [0x010b25, 0x0a0a0a, 0x1a1a2e, 0x2d2d2d, 0xcccccc];
  const cur = scene.background.getHex();
  let idx = colors.indexOf(cur);
  if (idx === -1) idx = 0;
  const next = colors[(idx + 1) % colors.length];
  scene.background.setHex(next);
}

function zoomIn() { camera.position.multiplyScalar(0.9); controls.update(); }
function zoomOut() { camera.position.multiplyScalar(1.1); controls.update(); }
function rotateLeft() { controls.target.x -= 0.1; controls.update(); }
function rotateRight() {
  if (!camera || !controls) return;
  const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta -= 0.1;
  offset.setFromSpherical(spherical);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}

function toggleLabels() {
  showLabels = !showLabels;
  document.getElementById('btn-toggle-labels').classList.toggle('is-off', !showLabels);
  syncLabels();
}

function captureScene() {
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = renderer.domElement.width;
  finalCanvas.height = renderer.domElement.height;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) return;

  // 1. Scene 3D
  ctx.drawImage(renderer.domElement, 0, 0);

  // 2. Labels
  if (showLabels) {
    const pins = Array.from(labelsOverlay.querySelectorAll('.anatomy-label-pin'));
    const parentRect = canvas.getBoundingClientRect();
    
    pins.forEach(pin => {
      if (pin.style.display === 'none') return;
      const rect = pin.getBoundingClientRect();
      const x = (rect.left - parentRect.left) * (finalCanvas.width / parentRect.width);
      const y = (rect.top - parentRect.top) * (finalCanvas.height / parentRect.height);

      const txt = pin.querySelector('.label-text');
      const line = pin.querySelector('line');
      
      if (txt && line) {
        const offX = parseFloat(line.getAttribute('x2')) * (finalCanvas.width / parentRect.width);
        const offY = parseFloat(line.getAttribute('y2')) * (finalCanvas.height / parentRect.height);
        
        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x + offX, y + offY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#fbbf24';
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        const tx = x + offX;
        const ty = y + offY;
        const tw = txt.offsetWidth * (finalCanvas.width / parentRect.width);
        const th = txt.offsetHeight * (finalCanvas.height / parentRect.height);
        const isRight = offX >= 0;
        const drawX = isRight ? tx : tx - tw;
        const drawY = ty - th / 2;

        ctx.fillStyle = '#000';
        ctx.fillRect(drawX, drawY, tw, th);
        ctx.strokeStyle = '#fbbf24';
        ctx.strokeRect(drawX, drawY, tw, th);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt.textContent, drawX + tw / 2, drawY + th / 2);
      }
    });
  }

  const link = document.createElement('a');
  link.download = 'anatomy_capture.png';
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
}

function syncLabels() {
  labelsOverlay.style.opacity = showLabels ? '1' : '0';
  labelsOverlay.style.pointerEvents = 'none';
  labelsOverlay.innerHTML = '';
  if (!showLabels) return;

  let visible = [];
  meshes.forEach(m => { if (m.visible && m.userData.info) visible.push(m); });
  if (visible.length > 0 && visible.length < 20) {
    visible.forEach(m => {
      const el = document.createElement('div');
      el.className = 'anatomy-label-pin';
      el.dataset.uuid = m.uuid;
      el.innerHTML = `
        <svg width="150" height="150" style="position:absolute;pointer-events:none;overflow:visible;">
          <line x1="0" y1="0" x2="0" y2="0" stroke="#fbbf24" stroke-width="1.5" />
          <circle cx="0" cy="0" r="3" fill="#fbbf24" />
        </svg>
        <div class="label-text" style="pointer-events:auto; cursor:pointer;" data-uuid="${m.uuid}">${m.userData.info.name}</div>
      `;
      labelsOverlay.appendChild(el);
    });
  }
}

function updateLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const pins = Array.from(labelsOverlay.querySelectorAll('.anatomy-label-pin'));
  const visibleData = [];
  
  pins.forEach(pin => {
    const mesh = scene.getObjectByProperty('uuid', pin.dataset.uuid);
    if (!mesh || !mesh.visible) { pin.style.display = 'none'; return; }
    const pos = new THREE.Vector3();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(pos);
    mesh.localToWorld(pos);
    pos.project(camera);
    if (pos.z > 1) { pin.style.display = 'none'; }
    else {
      const x = (pos.x * 0.5 + 0.5) * w;
      const y = (pos.y * -0.5 + 0.5) * h;
      visibleData.push({ pin, x, y, posX: pos.x });
    }
  });

  const arrange = (list, edgeX, isRight) => {
    const step = h / (list.length + 1);
    list.sort((a,b) => a.y - b.y).forEach((d, i) => {
      const targetY = step * (i + 1);
      d.pin.style.display = 'block';
      d.pin.style.left = d.x + 'px'; d.pin.style.top = d.y + 'px';
      const txt = d.pin.querySelector('.label-text');
      const line = d.pin.querySelector('line');
      const offX = edgeX - d.x; const offY = targetY - d.y;
      txt.style.left = offX + 'px'; txt.style.top = offY + 'px';
      txt.style.transform = `translate(${isRight ? '0%' : '-100%'}, -50%)`;
      line.setAttribute('x2', offX); line.setAttribute('y2', offY);
    });
  };

  arrange(visibleData.filter(d => d.posX <= 0), 100, false);
  arrange(visibleData.filter(d => d.posX > 0), w - 100, true);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
}

canvas.addEventListener('pointermove', function(e) {
  if (!model) return;
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
});

canvas.addEventListener('click', function(e) {
  if (!model || e.target.closest('.ha-btn') || e.target.closest('.dpad-btn')) return;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(model, true);
  if (hits.length > 0 && hits[0].object.visible) {
    const obj = hits[0].object;
    deselect();
    selectedObject = obj;
    obj.material.emissive.setHex(0x335588);
    const row = document.querySelector(`.item-row[data-id="${obj.userData.info?.id}"]`);
    if (row) {
      row.classList.add('selected');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showDescription(obj.userData.info, obj.name);
    document.getElementById('btn-isolate').disabled = false;
  } else {
    deselect();
  }
});

function resize() {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}

function init() {
  initScene();
  anatomyData.push.apply(anatomyData, HIERARCHY_DATA);
  loadModel().then(function(s) {
    model = s; processModel(s);
    if (loadingMsg) loadingMsg.remove();
    buildHierarchy();
    animate();
  }).catch(function(err) {
    if (loadingMsg) loadingMsg.textContent = 'Erreur: ' + err.message;
  });
  window.addEventListener('resize', resize);
  labelsOverlay.addEventListener('click', function(e) {
    const target = e.target.closest('.label-text');
    if (target && target.dataset.uuid) {
      const obj = scene.getObjectByProperty('uuid', target.dataset.uuid);
      if (obj) {
        deselect();
        selectedObject = obj;
        obj.material.emissive.setHex(0x335588);
        const row = document.querySelector(`.item-row[data-id="${obj.userData.info?.id}"]`);
        if (row) {
          row.classList.add('selected');
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showDescription(obj.userData.info, obj.name);
        document.getElementById('btn-isolate').disabled = false;
      }
    }
  });
}

init();
</script>
</body>
</html>
