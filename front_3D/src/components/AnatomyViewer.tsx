import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowLeft, Crosshair, EyeOff, Eye, Moon, Sun, Contrast, Camera, Save, X, Loader2 } from 'lucide-react';
import { apiCall } from '../services/api';
import '../styles/anatomy-viewer.css';

interface AnatomyItem { id: number; name: string; three_js_name: string; parent_id?: number | null; type: string; description?: string; }
interface ExtendedMesh extends THREE.Mesh { userData: { info?: AnatomyItem; [key: string]: any }; }
interface SharedViewData { camera_position: { x: number; y: number; z: number }; camera_target: { x: number; y: number; z: number }; scene_state: Array<{ name: string; three_js_name: string; visible: boolean; opacity: number }>; teacher_note?: string; }
interface Props { assetId?: string | number; modelPath?: string; initialAnatomicalData?: AnatomyItem[]; isOffline?: boolean; modelName?: string; viewId?: string; sharedViewData?: SharedViewData; readOnly?: boolean; }

const AnatomyViewer: React.FC<Props> = ({ assetId, modelPath: initialModelPath, initialAnatomicalData, isOffline, modelName, sharedViewData, readOnly }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const hierarchyRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  // ── Selection: ref for imperative code, state for React re-renders ──
  const selRef = useRef<ExtendedMesh | null>(null);
  const [, bump] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const onClickRef = useRef<(e: MouseEvent) => void>(() => {});

  // ── helpers ──
  function desc(text: string, name = '') {
    if (!descRef.current) return;
    if (name) descRef.current.innerHTML = `<strong>${name}</strong><br><br>${text.replace(/\n/g, '<br>')}`;
    else descRef.current.innerHTML = text;
  }

  function eachMesh(fn: (m: ExtendedMesh) => void) {
    sceneRef.current?.traverse(c => { if (c instanceof THREE.Mesh) fn(c as ExtendedMesh); });
  }

  function countHidden() {
    let n = 0; eachMesh(m => { if (!m.visible) n++; }); setHiddenCount(n);
  }

  function syncEyes() {
    eachMesh(m => {
      const info = m.userData.info; if (!info) return;
      for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
        const s = row.querySelector('span:last-child');
        if (s && s.textContent === info.name) {
          const eye = row.querySelector('.eye-btn') as HTMLElement;
          if (eye) eye.innerHTML = m.visible ? '👁' : '🚫';
          row.classList.toggle('is-hidden', !m.visible); break;
        }
      }
    });
  }

  function select(mesh: ExtendedMesh | null) {
    selRef.current = mesh;
    bump(n => n + 1);
  }

  function deselect() {
    if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
      selRef.current.material.emissive.setHex(0x000000);
    }
    select(null);
    document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
  }

  // ── tree ──
  function buildTree(data: AnatomyItem[], parent: HTMLDivElement) {
    const ul = document.createElement('ul');
    parent.appendChild(ul);
    for (const root of data.filter(i => !i.parent_id || i.parent_id === 0)) addNode(root, ul, new Set(), data);
  }

  function addNode(item: AnatomyItem, ul: HTMLUListElement, seen: Set<number>, data: AnatomyItem[]) {
    const li = document.createElement('li');
    const row = document.createElement('div'); row.className = 'item-row';
    const eye = document.createElement('button'); eye.className = 'eye-btn';
    const span = document.createElement('span'); span.textContent = item.name;
    row.appendChild(eye); row.appendChild(span); li.appendChild(row);

    const mesh = sceneRef.current?.getObjectByName(item.three_js_name) as ExtendedMesh | null ?? null;
    eye.innerHTML = mesh ? (mesh.visible ? '👁' : '🚫') : '👁';
    if (mesh) row.classList.toggle('is-hidden', !mesh.visible);

    const children = data.filter(c => c.id && c.parent_id === item.id && !seen.has(c.id));

    eye.onclick = (e) => {
      e.stopPropagation(); if (!mesh) return;
      mesh.visible = !mesh.visible;
      eye.innerHTML = mesh.visible ? '👁' : '🚫'; row.classList.toggle('is-hidden', !mesh.visible);
      if (!mesh.visible && selRef.current === mesh) deselect();
      countHidden();
    };

    row.onclick = (e) => {
      e.stopPropagation();
      if (mesh) {
        deselect(); select(mesh);
        if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissive.setHex(0x224488);
        row.classList.add('selected-item');
        const info = mesh.userData.info;
        const itemDesc = info?.description || item.description;
        const itemName = info?.name || item.name;
        if (itemDesc) desc(itemDesc, itemName);
        else desc('<em>Description non disponible.</em>', itemName);
      } else {
        // No mesh found (group node) — show description from the item data directly
        if (item.description) desc(item.description, item.name);
        else desc('<em>Description non disponible.</em>', item.name);
      }
      if (children.length) {
        const c = li.querySelector('ul');
        if (c) { c.classList.toggle('active'); span.classList.toggle('caret-down'); }
      }
    };

    if (children.length) {
      const n = document.createElement('ul'); n.className = 'nested';
      span.className = 'caret'; const ns = new Set(seen); ns.add(item.id);
      for (const child of children) addNode(child, n, ns, data);
      li.appendChild(n);
    }
    ul.appendChild(li);
  }

  // ── Actions ──
  function isolate() {
    const t = selRef.current; if (!t) return;
    eachMesh(m => {
      if (m === t) {
        m.visible = true;
        if (m.material instanceof THREE.MeshStandardMaterial) {
          m.material.transparent = false; m.material.opacity = 1; m.material.depthWrite = true; m.material.needsUpdate = true;
        }
      } else {
        m.visible = false;
        if (m.material instanceof THREE.MeshStandardMaterial) {
          m.material.transparent = true; m.material.opacity = 0; m.material.depthWrite = false; m.material.needsUpdate = true;
        }
      }
    });
  }
  function hide() {
    const t = selRef.current; if (!t) return;
    t.visible = false; deselect(); desc('', 'Élément masqué'); syncEyes(); countHidden();
  }
  function show() {
    const t = selRef.current; if (!t) return;
    t.visible = true;
    if (t.material instanceof THREE.MeshStandardMaterial) t.material.emissive.setHex(0x224488);
    const info = t.userData.info;
    if (info?.description) desc(info.description, info.name);
    syncEyes(); countHidden();
  }
  function revealAll() {
    eachMesh(m => {
      m.visible = true;
      if (m.material instanceof THREE.MeshStandardMaterial) {
        m.material.emissive.setHex(0x000000); m.material.opacity = 1; m.material.transparent = false; m.material.depthWrite = true; m.material.needsUpdate = true;
      }
    });
    deselect(); desc('Cliquez sur un os pour voir sa description.');
    syncEyes(); setHiddenCount(0);
  }
  function fade() {
    const t = selRef.current; if (!t || !(t.material instanceof THREE.MeshStandardMaterial)) return;
    t.material.transparent = true; t.material.opacity = 0.1; t.material.depthWrite = false; t.material.needsUpdate = true;
  }
  function unfade() {
    const t = selRef.current; if (!t || !(t.material instanceof THREE.MeshStandardMaterial)) return;
    t.material.transparent = false; t.material.opacity = 1; t.material.depthWrite = true; t.material.needsUpdate = true;
  }
  function fadeOthers() {
    const t = selRef.current;
    eachMesh(m => {
      if (!(m.material instanceof THREE.MeshStandardMaterial)) return;
      if (m === t) { m.material.transparent = false; m.material.opacity = 1; m.material.depthWrite = true; }
      else { m.material.transparent = true; m.material.opacity = 0.05; m.material.depthWrite = false; }
      m.material.needsUpdate = true;
    });
  }

  function zoom(d: number) {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3(); cameraRef.current.getWorldDirection(dir);
    cameraRef.current.position.add(dir.multiplyScalar(d));
    controlsRef.current.update();
  }

  function rotateOrbit(angle: number) {
    if (!cameraRef.current || !controlsRef.current) return;
    const offset = new THREE.Vector3().copy(cameraRef.current.position).sub(controlsRef.current.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta -= angle;
    offset.setFromSpherical(spherical);
    cameraRef.current.position.copy(controlsRef.current.target).add(offset);
    cameraRef.current.lookAt(controlsRef.current.target);
    controlsRef.current.update();
  }

  function captureView() {
    if (!rendererRef.current) return;
    const link = document.createElement('a');
    link.download = `vue-${Date.now()}.png`;
    link.href = rendererRef.current.domElement.toDataURL('image/png');
    link.click();
  }

  function captureSceneState(): Record<string, any>[] {
    const state: Record<string, any>[] = [];
    eachMesh(m => {
      const info = m.userData.info;
      state.push({
        name: info?.name || m.name,
        three_js_name: m.name,
        visible: m.visible,
        opacity: m.material instanceof THREE.MeshStandardMaterial ? m.material.opacity : 1,
      });
    });
    return state;
  }

  async function saveView() {
    if (!cameraRef.current || !controlsRef.current) return;
    setSaving(true);
    try {
      const camera_position = {
        x: cameraRef.current.position.x,
        y: cameraRef.current.position.y,
        z: cameraRef.current.position.z,
      };
      const camera_target = {
        x: controlsRef.current.target.x,
        y: controlsRef.current.target.y,
        z: controlsRef.current.target.z,
      };
      const scene_state = captureSceneState();
      await apiCall('labs/shared-views', {
        method: 'POST',
        body: JSON.stringify({
          camera_position,
          camera_target,
          scene_state,
          asset_3d_id: assetId,
          teacher_note: saveNote || null,
        }),
      });
      setShowSaveModal(false);
      setSaveNote('');
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function openSaveModal() {
    if (readOnly) return;
    setSaveNote('');
    setShowSaveModal(true);
  }

  // ── Three.js ──
  function init() {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0a0a); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(3, 2, 4); cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    containerRef.current.appendChild(renderer.domElement); rendererRef.current = renderer;
    const ambient = new THREE.AmbientLight(0x404060, 0.8); scene.add(ambient);
    const main = new THREE.DirectionalLight(0xfff5e0, 1.5); main.position.set(5, 10, 7); main.castShadow = true; scene.add(main);
    const fill = new THREE.PointLight(0x4466cc, 0.6); fill.position.set(-2, 1, 3); scene.add(fill);
    const back = new THREE.PointLight(0xffaa66, 0.5); back.position.set(0, 1, -2); scene.add(back);
    const grid = new THREE.GridHelper(4, 20, 0x88aaff, 0x335588); grid.position.y = -0.8; scene.add(grid);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 0.3; controls.maxDistance = 20;
    controls.zoomSpeed = 1.2; controls.target.set(0, 0.5, 0); controlsRef.current = controls;
  }

  async function load() {
    try {
      setLoading(true); setError(null);
      let data: AnatomyItem[] = [];
      let path = initialModelPath || 'Squelette_complet.glb';
      if (initialAnatomicalData?.length) data = initialAnatomicalData;
      else {
        const ep = assetId ? `/anatomy/all?asset_3d_id=${assetId}` : '/anatomy/all';
        const raw: AnatomyItem[] = await apiCall(ep);
        if (assetId && !initialModelPath) {
          try {
            const a = await apiCall(`models-manager/${assetId}`);
            if (a.url_glb) {
              path = a.url_glb;
              if (path.includes('Assets_3D/')) path = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/models-manager/files/${path.split('/').pop()}`;
            }
          } catch {}
        }
        if (!Array.isArray(raw)) throw new Error('Format API invalide');
        data = raw;
      }

      const gltf = await new Promise<any>((res, rej) => new GLTFLoader().load(path, res, undefined, rej));
      const model = gltf.scene; modelRef.current = model;
      model.traverse((c: THREE.Object3D) => {
        if (!(c instanceof THREE.Mesh)) return;
        const m = c as ExtendedMesh;
        m.material = new THREE.MeshStandardMaterial({ color: 0xECE2D0, roughness: 0.4, metalness: 0.1 });
        m.castShadow = true; m.receiveShadow = true;
        // 1) Correspondance exacte
        let info = data.find(i => i.three_js_name === c.name);
        // 2) Fallback : insensible à la casse
        if (!info) info = data.find(i => i.three_js_name?.toLowerCase() === c.name?.toLowerCase());
        // 3) Fallback : sans suffixe Blender (.001, .002, ...)
        if (!info) {
          const baseName = c.name.replace(/\.\d+$/, '');
          info = data.find(i => i.three_js_name === baseName || i.three_js_name?.toLowerCase() === baseName.toLowerCase());
        }
        if (info) {
          m.userData.info = info;
        } else {
          console.warn('[AnatomyViewer] Mesh sans correspondance BDD :', c.name);
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3()); model.position.sub(center);
      const s = 1.6 / Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
      model.scale.set(s, s, s);
      sceneRef.current?.add(model);
      if (controlsRef.current) { controlsRef.current.target.set(0, 0.2, 0); controlsRef.current.update(); }
      if (hierarchyRef.current) { hierarchyRef.current.innerHTML = ''; buildTree(data, hierarchyRef.current); }
      if (descRef.current) descRef.current.innerHTML = 'Cliquez sur un os pour voir sa description.';
    } catch (e: any) {
      console.error(e); setError(e.message);
      if (descRef.current) descRef.current.innerHTML = `<span style="color:#ff8888">Erreur : ${e.message}</span>`;
    } finally { setLoading(false); }
  }

  // ── Events ──
  function onResize() {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
    rendererRef.current.setSize(w, h); cameraRef.current.aspect = w / h; cameraRef.current.updateProjectionMatrix();
  }

  function onMove(e: MouseEvent) {
    if (!modelRef.current || !rendererRef.current || !cameraRef.current || !labelRef.current) return;
    const r = rendererRef.current.domElement.getBoundingClientRect();
    mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    labelRef.current.style.left = (e.clientX + 15) + 'px'; labelRef.current.style.top = (e.clientY + 15) + 'px';
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const hits = raycaster.current.intersectObject(modelRef.current, true);
    if (hits.length) {
      const obj = hits[0].object as ExtendedMesh;
      if (obj.visible) {
        labelRef.current.style.display = 'block';
        const s = labelRef.current.querySelector('span');
        if (s) s.textContent = obj.userData.info?.name || obj.name;
        document.body.style.cursor = 'pointer'; return;
      }
    }
    labelRef.current.style.display = 'none'; document.body.style.cursor = 'default';
  }

  function onClick(e: MouseEvent) {
    if (e.target instanceof Element && e.target.closest('.hierarchy-panel, #description-panel')) return;
    if (!modelRef.current || !rendererRef.current || !cameraRef.current) return;
    const r = rendererRef.current.domElement.getBoundingClientRect();
    mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const hits = raycaster.current.intersectObject(modelRef.current, true);
    if (hits.length) {
      const obj = hits[0].object as ExtendedMesh;
      const info = obj.userData.info;
      if (info && obj.visible) {
        deselect(); select(obj);
        if (obj.material instanceof THREE.MeshStandardMaterial) obj.material.emissive.setHex(0x224488);
        for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
          const s = row.querySelector('span:last-child');
          if (s && s.textContent === info.name) { row.classList.add('selected-item'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); break; }
        }
        desc(info.description || '<em>Description non disponible.</em>', info.name);
      } else if (obj.visible) desc('', obj.name);
    } else deselect();
  }

  onClickRef.current = onClick;

  function loop() {
    requestAnimationFrame(loop);
    controlsRef.current?.update();
    if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
  }

  useEffect(() => {
    init(); loop();
    const c = containerRef.current;
    const handler = (e: MouseEvent) => onClickRef.current(e);
    window.addEventListener('resize', onResize); window.addEventListener('pointermove', onMove); window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onMove); window.removeEventListener('click', handler);
      if (rendererRef.current && c) { c.removeChild(rendererRef.current.domElement); rendererRef.current.dispose(); }
    };
  }, []);

  useEffect(() => { setTimeout(load, 0); }, []);

  useEffect(() => {
    if (!sharedViewData || !controlsRef.current || !cameraRef.current) return;
    controlsRef.current.target.set(sharedViewData.camera_target.x, sharedViewData.camera_target.y, sharedViewData.camera_target.z);
    cameraRef.current.position.set(sharedViewData.camera_position.x, sharedViewData.camera_position.y, sharedViewData.camera_position.z);
    controlsRef.current.update();
    eachMesh(m => {
      const state = sharedViewData.scene_state.find(s => s.three_js_name === m.name);
      if (state) {
        m.visible = state.visible;
        if (m.material instanceof THREE.MeshStandardMaterial) m.material.opacity = state.opacity;
      }
    });
    syncEyes();
    countHidden();
  }, [sharedViewData]);

  // ── Render ──
  const hasSel = !!selRef.current;

  return (
    <div className="anatomy-viewer">
      <div className="hierarchy-panel">
        <div className="hierarchy-header">
          <button className="back-arrow" onClick={() => navigate('/atlas')}><ArrowLeft size={20} /></button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <h3>Hiérarchie Anatomique</h3>
            {modelName && <span className="model-name-label">{modelName}</span>}
          </div>
        </div>
        <div className="hierarchy-actions">
          <button className="ha-btn" onClick={isolate} disabled={!hasSel} title="Isoler"><Crosshair size={14} /></button>
          <button className="ha-btn" onClick={hide} disabled={!hasSel} title="Masquer"><EyeOff size={14} /></button>
          <button className="ha-btn" onClick={show} disabled={!hasSel} title="Afficher"><Eye size={14} /></button>
          <button className="ha-btn" onClick={revealAll} title="Tout afficher"><Eye size={14} /><span className="ha-badge">{hiddenCount || ''}</span></button>
          <button className="ha-btn" onClick={fade} disabled={!hasSel} title="Fondu"><Moon size={14} /></button>
          <button className="ha-btn" onClick={unfade} disabled={!hasSel} title="Restaurer"><Sun size={14} /></button>
          <button className="ha-btn" onClick={fadeOthers} disabled={!hasSel} title="Fondu autres"><Contrast size={14} /></button>
          <button className="ha-btn" onClick={captureView} title="Capturer la vue"><Camera size={14} /></button>
          {!readOnly && <button className="ha-btn" onClick={openSaveModal} title="Sauvegarder la vue 3D"><Save size={14} /></button>}
        </div>
        <div ref={hierarchyRef} id="hierarchy-root" />
      </div>
      <div ref={containerRef} id="canvas-container">
        <div className="dpad-controls">
          <button className="zoom-btn dpad-up"    onClick={() => zoom(0.3)}          title="Zoom avant">+</button>
          <button className="zoom-btn dpad-left"  onClick={() => rotateOrbit(0.6)}   title="Rotation gauche">←</button>
          <button className="zoom-btn dpad-right" onClick={() => rotateOrbit(-0.6)}  title="Rotation droite">→</button>
          <button className="zoom-btn dpad-down"  onClick={() => zoom(-0.3)}         title="Zoom arrière">−</button>
        </div>
      </div>
      <div ref={labelRef} id="label"><span></span></div>
      <div id="description-panel" className="description-panel">
        <div className="description-header"><h3>Description</h3></div>
        <div ref={descRef} id="desc-text">{loading ? 'Chargement...' : error ? `Erreur: ${error}` : 'Cliquez sur un os pour voir sa description.'}</div>
      </div>

      {showSaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--dash-bg, #1a1a2e)', width: '100%', maxWidth: '420px',
            borderRadius: '20px', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--dash-border, #2a2a4a)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} color="#fbbf24" />
                Sauvegarder la vue 3D
              </h3>
              <button onClick={() => setShowSaveModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted, #888)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--dash-text-muted, #aaa)' }}>
                Note / Nom de la vue
              </label>
              <textarea
                value={saveNote}
                onChange={e => setSaveNote(e.target.value)}
                placeholder="Ex: Vue antérieure du crâne"
                rows={3}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid var(--dash-border, #2a2a4a)',
                  background: 'var(--dash-bg, #1a1a2e)', color: 'var(--dash-text, #eee)',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '14px'
                }}
              />
            </div>
            <div style={{
              padding: '16px 24px',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex', gap: '12px', justifyContent: 'flex-end'
            }}>
              <button onClick={() => setShowSaveModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: '1px solid var(--dash-border, #2a2a4a)',
                  background: 'transparent', color: 'var(--dash-text, #eee)',
                  fontWeight: 600, cursor: 'pointer'
                }}>
                Annuler
              </button>
              <button onClick={saveView} disabled={saving}
                style={{
                  padding: '10px 24px', borderRadius: '10px',
                  border: 'none', background: saving ? '#888' : '#fbbf24',
                  color: saving ? '#555' : '#fff',
                  fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                {saving && <Loader2 size={16} className="spin" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnatomyViewer;
