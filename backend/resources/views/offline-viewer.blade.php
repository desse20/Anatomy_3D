<!DOCTYPE html>
<html lang="{{ $lang ?? 'fr' }}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $name }} — Anatomy 3D Offline</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; color: #e2e8f0; }
#top-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; background: #14143a; border-bottom: 1px solid #1e1e3a; flex-shrink: 0; }
#top-bar h1 { font-size: 14px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viewer { display: flex; height: calc(100vh - 44px); }

#hierarchy-panel { width: 280px; background: #0f0f2a; border-right: 1px solid #1e1e3a; overflow-y: auto; flex-shrink: 0; }
#hierarchy-panel .panel-header { padding: 14px 16px; border-bottom: 1px solid #1e1e3a; background: #14143a; }
#hierarchy-panel .panel-header h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
#hierarchy-root { padding: 8px; }
#hierarchy-root ul { list-style: none; padding-left: 16px; }
#hierarchy-root li { margin: 1px 0; }
.item-row { display: flex; align-items: center; gap: 6px; padding: 6px 10px; cursor: pointer; border-radius: 6px; font-size: 13px; transition: background 0.15s; }
.item-row:hover { background: rgba(14, 165, 233, 0.08); }
.item-row.selected { background: rgba(14, 165, 233, 0.2); color: #0ea5e9; }
.item-row.hidden { opacity: 0.45; font-style: italic; }
.eye-btn { background: none; border: none; cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 4px; flex-shrink: 0; line-height: 1; }
.eye-btn:hover { background: rgba(255,255,255,0.1); }
.caret { cursor: pointer; user-select: none; }
.caret::before { content: '\25B6'; display: inline-block; margin-right: 5px; font-size: 10px; transition: transform 0.2s; color: #64748b; }
.caret-down::before { transform: rotate(90deg); }
.nested { display: none; }
.nested.active { display: block; }

#canvas-container { flex: 1; position: relative; background: #0a0a0a; overflow: hidden; }

#label { position: fixed; display: none; background: rgba(0,0,0,0.85); color: #fff; padding: 5px 10px; border-radius: 6px; font-size: 12px; pointer-events: none; z-index: 1000; white-space: nowrap; }

#desc-panel { width: 320px; background: #0f0f2a; border-left: 1px solid #1e1e3a; overflow-y: auto; flex-shrink: 0; }
#desc-panel .panel-header { padding: 14px 16px; border-bottom: 1px solid #1e1e3a; background: #14143a; }
#desc-panel .panel-header h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
#desc-text { padding: 16px; font-size: 14px; line-height: 1.7; }
#desc-text strong { color: #0ea5e9; font-size: 15px; display: block; margin-bottom: 8px; }
#desc-text em { color: #64748b; }
.loading-msg { display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b; font-style: italic; font-size: 14px; }

@media (max-width: 900px) {
  .viewer { flex-direction: column; }
  #hierarchy-panel, #desc-panel { width: 100%; max-height: 35vh; }
}
</style>
</head>
<body>
<div id="top-bar"><h1>{{ $name }}</h1></div>
<div class="viewer">
  <div id="hierarchy-panel">
    <div class="panel-header"><h3>{{ $lang === 'fr' ? 'Hiérarchie Anatomique' : 'Anatomy Hierarchy' }}</h3></div>
    <div id="hierarchy-root"></div>
  </div>
  <div id="canvas-container"><div class="loading-msg">{{ $lang === 'fr' ? 'Chargement du modèle 3D...' : 'Loading 3D model...' }}</div></div>
  <div id="label"><span></span></div>
  <div id="desc-panel">
    <div class="panel-header"><h3>{{ $lang === 'fr' ? 'Description' : 'Description' }}</h3></div>
    <div id="desc-text">{{ $lang === 'fr' ? 'Cliquez sur un élément pour voir sa description.' : 'Click on an element to see its description.' }}</div>
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
const label = document.getElementById('label');
const descText = document.getElementById('desc-text');
const hierarchyRoot = document.getElementById('hierarchy-root');

let scene, camera, renderer, controls, model;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const meshes = new Map();
const anatomyData = [];

let selectedObject = null;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(3, 2, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  canvas.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
  mainLight.position.set(5, 10, 7);
  mainLight.castShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.PointLight(0x4466cc, 0.6);
  fillLight.position.set(-2, 1, 3);
  scene.add(fillLight);

  const backLight = new THREE.PointLight(0xffaa66, 0.5);
  backLight.position.set(0, 1, -2);
  scene.add(backLight);

  const grid = new THREE.GridHelper(4, 20, 0x88aaff, 0x335588);
  grid.position.y = -0.8;
  scene.add(grid);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.5, 0);
}

function base64ToArrayBuffer(b64) {
  var binary = atob(b64);
  var len = binary.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function loadModel() {
  return new Promise(function(resolve, reject) {
    var data = base64ToArrayBuffer(GLB_BASE64);
    var loader = new GLTFLoader();
    loader.parse(data, '', function(gltf) {
      resolve(gltf.scene);
    }, undefined, function(err) {
      reject(err);
    });
  });
}

function processModel(sceneNode) {
  sceneNode.traverse(function(child) {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0xECE2D0, roughness: 0.4, metalness: 0.1, emissive: 0x000000
      });
      child.castShadow = true;

      var info = anatomyData.find(function(d) { return d.three_js_name === child.name; });
      if (info) child.userData.info = info;
      meshes.set(child.name, child);
    }
  });

  var box = new THREE.Box3().setFromObject(sceneNode);
  var center = box.getCenter(new THREE.Vector3());
  sceneNode.position.sub(center);
  var size = box.getSize(new THREE.Vector3());
  var maxDim = Math.max(size.x, size.y, size.z);
  var scale = 1.6 / maxDim;
  sceneNode.scale.set(scale, scale, scale);

  scene.add(sceneNode);
  controls.target.set(0, 0.2, 0);
  controls.update();
}

function buildHierarchy() {
  var roots = anatomyData.filter(function(d) { return !d.parent_id || d.parent_id === 0; });
  var ul = document.createElement('ul');
  hierarchyRoot.appendChild(ul);
  roots.forEach(function(root) { renderTreeNode(root, ul, new Set()); });
}

function renderTreeNode(item, containerUl, ancestors) {
  var li = document.createElement('li');
  var row = document.createElement('div');
  row.className = 'item-row';

  var eyeBtn = document.createElement('button');
  eyeBtn.className = 'eye-btn';
  var mesh = meshes.get(item.three_js_name);
  eyeBtn.textContent = (mesh && mesh.visible !== false) ? '\u{1F441}' : '\uD83D\uDEAB';
  if (mesh && !mesh.visible) row.classList.add('hidden');
  row.appendChild(eyeBtn);

  var span = document.createElement('span');
  span.textContent = item.name;
  var children = anatomyData.filter(function(c) { return c.parent_id === item.id && !ancestors.has(c.id); });
  if (children.length > 0) span.classList.add('caret');
  row.appendChild(span);

  if (children.length > 0) {
    var childUl = document.createElement('ul');
    childUl.className = 'nested';
    var newAnc = new Set(ancestors);
    newAnc.add(item.id);
    children.forEach(function(c) { renderTreeNode(c, childUl, newAnc); });
    li.appendChild(childUl);
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      childUl.classList.toggle('active');
      span.classList.toggle('caret-down');
    });
  }

  eyeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (mesh) {
      mesh.visible = !mesh.visible;
      row.classList.toggle('hidden', !mesh.visible);
      eyeBtn.textContent = mesh.visible ? '\u{1F441}' : '\uD83D\uDEAB';
      if (!mesh.visible && selectedObject === mesh) { deselect(); }
    }
  });

  row.addEventListener('click', function() {
    if (mesh && mesh.visible) {
      deselect();
      selectedObject = mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissive.setHex(0x112244);
      row.classList.add('selected');
      showDescription(mesh.userData.info || item, mesh.name);
    } else if (mesh) {
      showDescription(null, item.name + ' (masqué)');
    } else {
      showDescription(item, item.name);
    }
    if (children.length > 0) {
      childUl.classList.toggle('active');
      span.classList.toggle('caret-down');
    }
  });

  li.prepend(row);
  containerUl.appendChild(li);
}

function showDescription(info, fallbackName) {
  if (info && info.description && info.description.trim()) {
    var clean = info.description.replace(/\\n/g, '\n').replace(/\\t/g, '').trim();
    descText.innerHTML = '<strong>' + (info.name || fallbackName) + '</strong><br><br>' + clean.replace(/\n/g, '<br>');
  } else {
    var name = (info && info.name) ? info.name : (fallbackName || 'Élément');
    descText.innerHTML = '<strong>' + name + '</strong><br><br><em>{{ $lang === 'fr' ? 'Description non disponible.' : 'Description not available.' }}</em>';
  }
}

function deselect() {
  if (selectedObject) {
    if (selectedObject.material instanceof THREE.MeshStandardMaterial) selectedObject.material.emissive.setHex(0x000000);
    selectedObject = null;
  }
  document.querySelectorAll('.item-row.selected').forEach(function(el) { el.classList.remove('selected'); });
}

canvas.addEventListener('pointermove', function(e) {
  if (!model) return;
  var rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  label.style.left = (e.clientX + 15) + 'px';
  label.style.top = (e.clientY + 15) + 'px';

  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObject(model, true);
  if (intersects.length > 0) {
    var obj = intersects[0].object;
    if (obj.visible) {
      label.style.display = 'block';
      label.querySelector('span').textContent = obj.userData.info ? obj.userData.info.name : obj.name;
      renderer.domElement.style.cursor = 'pointer';
    } else { label.style.display = 'none'; renderer.domElement.style.cursor = 'default'; }
  } else { label.style.display = 'none'; renderer.domElement.style.cursor = 'default'; }
});

canvas.addEventListener('click', function(e) {
  if (!model) return;
  if (e.target.closest('#hierarchy-panel') || e.target.closest('#desc-panel')) return;

  var rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObject(model, true);
  if (intersects.length > 0) {
    var obj = intersects[0].object;
    if (obj.visible && obj.userData.info) {
      var rows = document.querySelectorAll('.item-row');
      var matched = null;
      rows.forEach(function(r) { if (r.querySelector('span:last-child')?.textContent === obj.userData.info.name) matched = r; });
      deselect();
      selectedObject = obj;
      if (obj.material instanceof THREE.MeshStandardMaterial) obj.material.emissive.setHex(0x112244);
      if (matched) { matched.classList.add('selected'); matched.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      showDescription(obj.userData.info, obj.name);
    } else if (obj.visible) { showDescription(null, obj.name); }
  } else { deselect(); }
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function resize() {
  var w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function init() {
  initScene();
  animate();
  try {
    anatomyData.push.apply(anatomyData, HIERARCHY_DATA);
    model = null;
    loadModel().then(function(modelScene) {
      model = modelScene;
      processModel(modelScene);
      loadingMsg.remove();
      buildHierarchy();
    }).catch(function(err) {
      loadingMsg.textContent = 'Erreur: ' + err.message;
      console.error(err);
    });
  } catch (err) {
    loadingMsg.textContent = 'Erreur: ' + err.message;
    console.error(err);
  }
  window.addEventListener('resize', resize);
}

init();
</script>
</body>
</html>
