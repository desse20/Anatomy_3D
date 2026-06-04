import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { offlineCache } from '../services/offlineCache';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowLeft, Crosshair, EyeOff, Eye, Moon, Sun, Contrast, Camera, Save, X, Loader2, RefreshCcw, Palette } from 'lucide-react';
import { apiCall } from '../services/api';
import Swal from 'sweetalert2';
import { getSwalTheme } from '../services/swalTheme';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/anatomy-viewer.css';

interface AnatomyItem { id: number; name: string; three_js_name: string; parent_id?: number | null; type: string; description?: string; }
interface ExtendedMesh extends THREE.Mesh { userData: { info?: AnatomyItem; [key: string]: any }; }
interface SharedViewData { camera_position: { x: number; y: number; z: number }; camera_target: { x: number; y: number; z: number }; scene_state: Array<{ name: string; three_js_name: string; visible: boolean; opacity: number }>; background_color?: string; teacher_note?: string; }
interface Props { assetId?: string | number; modelPath?: string; initialAnatomicalData?: AnatomyItem[]; isOffline?: boolean; modelName?: string; viewId?: string; sharedViewData?: SharedViewData; readOnly?: boolean; onSelect?: (item: AnatomyItem | null) => void; }

const AnatomyViewer: React.FC<Props> = ({ assetId, modelPath: initialModelPath, initialAnatomicalData, isOffline, modelName, sharedViewData, readOnly, onSelect }) => {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => language === 'fr' ? fr : en;
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const hierarchyRef = useRef<HTMLDivElement>(null);
  const labelsOverlayRef = useRef<HTMLDivElement>(null);

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
  const [bgColor, setBgColor] = useState(localStorage.getItem('anatomy_bg') || '#0a0a0a');
  const [showLabels, setShowLabels] = useState(true);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const showLabelsRef = useRef(true);
  const onSelectRef = useRef(onSelect);
  const lastLogRef = useRef<Record<number, number>>({});

  const logUsage = async (item: AnatomyItem | null) => {
    if (!item || isOffline) return;
    const now = Date.now();
    const last = lastLogRef.current[item.id] || 0;
    if (now - last < 10000) return; // Anti-spam 10s
    lastLogRef.current[item.id] = now;
    try {
      await apiCall('anatomy/log', {
        method: 'POST',
        body: JSON.stringify({ object_id: item.id })
      });
    } catch (e) { console.warn("Analytics error:", e); }
  };

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const onClickRef = useRef<(e: MouseEvent) => void>(() => {});

  // ── helpers ──
  const ICONS = {
    eye: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21L3 3"></path><path d="M9 11a3 3 0 1 0 5.66 2"></path><path d="M17.59 17.59A11.05 11.05 0 0 0 23 12c0-7-4-8-11-8a11.05 11.05 0 0 0-5.41 1.41"></path><path d="M2.41 6.41A11.05 11.05 0 0 0 1 12c0 7 4 8 11 8a11.05 11.05 0 0 0 5.41-1.41"></path></svg>',
    target: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>'
  };

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
        if (row.dataset.id === String(info.id)) {
          const eye = row.querySelector('.eye-btn') as HTMLElement;
          if (eye) eye.innerHTML = m.visible ? ICONS.eye : ICONS.eyeOff;
          row.classList.toggle('is-hidden', !m.visible); break;
        }
      }
    });
  }

  function select(item: AnatomyItem | null, mesh?: ExtendedMesh | null) {
    if (selRef.current === mesh && mesh !== null) return;
    selRef.current = mesh || null;
    bump(n => n + 1);
    if (onSelectRef.current) onSelectRef.current(item);
    if (item) logUsage(item);
  }

  function deselect() {
    console.log('[AnatomyViewer] deselect called');
    if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
      selRef.current.material.emissive.setHex(0x000000);
    }
    select(null, null);
    document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
  }

  // ── tree ──
  function buildTree(data: AnatomyItem[], parent: HTMLDivElement) {
    const ul = document.createElement('ul');
    parent.appendChild(ul);

    let filteredData = data;
    if (readOnly && sharedViewData && !isOffline) {
      // On identifie tous les items visibles (meshes)
      const visibleNames = new Set(sharedViewData.scene_state.filter(s => s.visible).map(s => s.three_js_name));
      // On garde un item s'il est visible ou s'il a un descendant visible
      const isVisible = (it: AnatomyItem): boolean => {
        if (visibleNames.has(it.three_js_name)) return true;
        return data.some(c => c.parent_id === it.id && isVisible(c));
      };
      filteredData = data.filter(i => isVisible(i));
    }

    for (const root of filteredData.filter(i => !i.parent_id || i.parent_id === 0)) {
      addNode(root, ul, new Set(), filteredData);
    }
  }

  function addNode(item: AnatomyItem, ul: HTMLUListElement, seen: Set<number>, data: AnatomyItem[]) {
    const li = document.createElement('li');
    const row = document.createElement('div'); row.className = 'item-row';
    row.dataset.id = String(item.id);
    const iso = document.createElement('button'); iso.className = 'iso-btn'; iso.innerHTML = ICONS.target; iso.title = "Isoler ce groupe";
    const eye = document.createElement('button'); eye.className = 'eye-btn';
    const span = document.createElement('span'); span.textContent = item.name;
    row.appendChild(eye); row.appendChild(iso); row.appendChild(span); li.appendChild(row);

    const mesh = sceneRef.current?.getObjectByName(item.three_js_name) as ExtendedMesh | null ?? null;
    eye.innerHTML = mesh ? (mesh.visible ? ICONS.eye : ICONS.eyeOff) : ICONS.eye;
    if (mesh) row.classList.toggle('is-hidden', !mesh.visible);

    const children = data.filter(c => c.id && c.parent_id === item.id && !seen.has(c.id));

    eye.onclick = (e) => {
      e.stopPropagation();
      // On bascule la visibilité de TOUS les éléments ayant cet ID (ou enfants du groupe)
      let targetState = true;
      if (mesh) targetState = !mesh.visible;
      else {
        // Pour un groupe sans mesh direct, on regarde le premier enfant
        const firstRow = ul.querySelector(`.item-row[data-id="${item.id}"]`) as HTMLElement;
        targetState = !firstRow.classList.contains('is-hidden');
      }

      eachMesh(m => {
        if (m.userData.info?.id === item.id) {
          m.visible = targetState;
          if (!m.visible && selRef.current === m) deselect();
        }
      });
      syncEyes(); countHidden(); rebuildLabels();
    };

    iso.onclick = (e) => {
      e.stopPropagation();
      const getAllIds = (it: AnatomyItem): number[] => {
        let ids = [it.id];
        data.filter(c => c.parent_id === it.id).forEach(c => { ids = ids.concat(getAllIds(c)); });
        return ids;
      };
      const allowedIds = new Set(getAllIds(item));

      // On identifie tous les ancêtres de tous les meshes autorisés
      const ancestors = new Set<string>();
      eachMesh(m => {
        if (m.userData.info && allowedIds.has(m.userData.info.id)) {
          let p = m.parent; while (p) { ancestors.add(p.uuid); p = p.parent; }
        }
      });

      eachMesh(m => {
        const mId = m.userData.info?.id;
        if (mId && allowedIds.has(mId)) {
          m.visible = true;
          if (m.material instanceof THREE.MeshStandardMaterial) {
            m.material.transparent = false; m.material.opacity = 1; m.material.depthWrite = true;
          }
        } else if (ancestors.has(m.uuid)) {
          m.visible = true;
        } else {
          m.visible = false;
        }
      });
      syncEyes(); countHidden(); rebuildLabels();
      logUsage(item);
    };

    row.onclick = (e) => {
      e.stopPropagation();
      if (mesh) {
        if (selRef.current === mesh) return;
        if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
          selRef.current.material.emissive.setHex(0x000000);
        }
        select(mesh.userData.info || item, mesh);
        if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissive.setHex(0x224488);
        document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
        row.classList.add('selected-item');
        const info = mesh.userData.info;
        const itemDesc = info?.description || item.description;
        const itemName = info?.name || item.name;
        if (itemDesc) desc(itemDesc, itemName);
        else desc('<em>Description non disponible.</em>', itemName);
      } else {
        // No mesh found (group node)
        deselect();
        select(item, null);
        document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
        row.classList.add('selected-item');
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
    const t = selRef.current; 
    if (!t) return;
    
    // On identifie tous les ancêtres et descendants de l'objet sélectionné
    const ancestors = new Set<string>();
    let p = t.parent;
    while (p) { ancestors.add(p.uuid); p = p.parent; }

    const descendants = new Set<string>();
    t.traverse(c => descendants.add(c.uuid));
    
    console.log(`[isolate] Tool active for: ${t.name || 'unnamed'} (${t.userData.info?.name || 'no info'}). Descendants: ${descendants.size}`);
    
    const targetUuid = t.uuid;
    sceneRef.current?.traverse(obj => {
      // On ne touche pas à la scène elle-même ou aux lumières/caméras de base
      if (obj instanceof THREE.Scene || obj instanceof THREE.Light || obj instanceof THREE.Camera) return;

      const isTarget = obj.uuid === targetUuid;
      const isPart = ancestors.has(obj.uuid) || descendants.has(obj.uuid);

      if (isTarget || isPart) {
        obj.visible = true;
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.transparent = false; obj.material.opacity = 1; obj.material.depthWrite = true; obj.material.needsUpdate = true;
        }
      } else {
        // Pour les objets qui sont dans le modèle (pas les lumières externes)
        // On cache tout ce qui n'est pas le root, une lumière ou une caméra
        obj.visible = false;
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.transparent = true; obj.material.opacity = 0; obj.material.depthWrite = false; obj.material.needsUpdate = true;
        }
      }
    });

    syncEyes();
    countHidden();
    rebuildLabels();
    if (t.userData.info) logUsage(t.userData.info);
  }
  function hide() {
    const t = selRef.current; if (!t) return;
    t.visible = false; deselect(); desc('', 'Élément masqué'); syncEyes(); countHidden(); rebuildLabels();
    if (t.userData.info) logUsage(t.userData.info);
  }
  function show() {
    const t = selRef.current; if (!t) return;
    t.visible = true;
    let p = t.parent; while (p) { p.visible = true; p = p.parent; }
    if (t.material instanceof THREE.MeshStandardMaterial) t.material.emissive.setHex(0x224488);
    const info = t.userData.info;
    if (info?.description) desc(info.description, info.name);
    syncEyes(); countHidden(); rebuildLabels();
    if (info) logUsage(info);
  }
  function revealAll() {
    sceneRef.current?.traverse(c => {
      c.visible = true;
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material.emissive.setHex(0x000000); 
        c.material.opacity = 1; 
        c.material.transparent = false; 
        c.material.depthWrite = true; 
        c.material.needsUpdate = true;
      }
    });
    deselect(); desc('Cliquez sur un os pour voir sa description.');
    rebuildLabels(); // Rebuild labels on revealAll
    syncEyes(); setHiddenCount(0);
  }
  function fade() {
    const t = selRef.current; if (!t) return;
    const mat = t.material as any;
    if (mat) {
      mat.transparent = true; mat.opacity = 0.1; mat.depthWrite = false; mat.needsUpdate = true;
    }
  }
  function unfade() {
    const t = selRef.current; if (!t) return;
    const mat = t.material as any;
    if (mat) {
      mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true;
    }
  }
  function fadeOthers() {
    const t = selRef.current;
    if (!t) return;

    const ancestors = new Set<string>();
    let p = t.parent;
    while (p) { ancestors.add(p.uuid); p = p.parent; }
    
    eachMesh(m => {
      if (!(m.material instanceof THREE.MeshStandardMaterial)) return;
      if (m.uuid === t.uuid || ancestors.has(m.uuid)) {
        m.material.transparent = false; m.material.opacity = 1; m.material.depthWrite = true;
      } else {
        m.material.transparent = true; m.material.opacity = 0.05; m.material.depthWrite = false;
      }
      m.material.needsUpdate = true;
    });

    // Parents toujours visibles
    let p2 = t.parent;
    while (p2) { p2.visible = true; p2 = p2.parent; }

    syncEyes(); countHidden(); rebuildLabels();
    if (t.userData.info) logUsage(t.userData.info);
  }

  function zoom(d: number) {
    if (!cameraRef.current || !controlsRef.current) return;
    const dir = new THREE.Vector3(); cameraRef.current.getWorldDirection(dir);
    cameraRef.current.position.add(dir.multiplyScalar(d));
    controlsRef.current.update();
  }

  function toggleLabels() {
    const next = !showLabels;
    setShowLabels(next);
    showLabelsRef.current = next;
    // On force la synchronisation des étiquettes (création des divs)
    setTimeout(rebuildLabels, 0);
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
  
  function cycleBg() {
    const colors = ['#0a0a0a', '#1a1a2e', '#2d2d2d', '#444444', '#777777', '#cccccc'];
    const idx = colors.indexOf(bgColor);
    const next = colors[(idx + 1) % colors.length];
    setBgColor(next);
    localStorage.setItem('anatomy_bg', next);
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(next);
  }

  async function captureView() {
    if (!rendererRef.current || !containerRef.current) return;
    
    const canvas = rendererRef.current.domElement;
    const labelsOverlay = labelsOverlayRef.current;
    
    if (!labelsOverlay || labelsOverlay.children.length === 0) {
      // Pas de labels : capture simple
      const link = document.createElement('a');
      link.download = `vue-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      return;
    }

    // Avec labels : on doit composer l'image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Dessiner le modèle 3D
    ctx.drawImage(canvas, 0, 0);

    // 2. Dessiner chaque étiquette
    const pins = Array.from(labelsOverlay.querySelectorAll<HTMLElement>('.anatomy-label-pin'));
    
    pins.forEach(pin => {
      if (pin.style.display === 'none') return;
      
      const rect = pin.getBoundingClientRect();
      const parentRect = containerRef.current!.getBoundingClientRect();
      
      // Coordonnées relatives au conteneur, mises à l'échelle du canvas
      const x = (rect.left - parentRect.left) * (canvas.width / parentRect.width);
      const y = (rect.top - parentRect.top) * (canvas.height / parentRect.height);

      const txt = pin.querySelector('.label-text') as HTMLElement;
      const line = pin.querySelector('line') as SVGLineElement;
      
      if (txt && line) {
        const offX = parseFloat(line.getAttribute('x2') || '0') * (canvas.width / parentRect.width);
        const offY = parseFloat(line.getAttribute('y2') || '0') * (canvas.height / parentRect.height);
        
        // Dessin de la ligne
        ctx.beginPath();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2 * (canvas.width / parentRect.width);
        ctx.moveTo(x, y);
        ctx.lineTo(x + offX, y + offY);
        ctx.stroke();

        // Dessin du point d'ancrage
        ctx.beginPath();
        ctx.fillStyle = '#fbbf24';
        ctx.arc(x, y, 4 * (canvas.width / parentRect.width), 0, Math.PI * 2);
        ctx.fill();

        // Dessin du rectangle de texte
        const txtRect = txt.getBoundingClientRect();
        const tx = x + offX;
        const ty = y + offY;
        const tw = txtRect.width * (canvas.width / parentRect.width);
        const th = txtRect.height * (canvas.height / parentRect.height);
        
        // Ajuster l'alignement (comme le translate CSS)
        const isRight = offX >= 0;
        const drawX = isRight ? tx : tx - tw;
        const drawY = ty - th / 2;

        ctx.fillStyle = '#111';
        ctx.fillRect(drawX, drawY, tw, th);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, tw, th);

        // Dessin du texte
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${11 * (canvas.width / parentRect.width)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt.textContent || '', drawX + tw / 2, drawY + th / 2);
      }
    });

    const link = document.createElement('a');
    link.download = `vue-legende-${Date.now()}.png`;
    link.href = finalCanvas.toDataURL('image/png');
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
          background_color: bgColor,
          asset_3d_id: assetId,
          teacher_note: saveNote || null,
        }),
      });
      setShowSaveModal(false);
      setSaveNote('');
      Swal.fire({
        icon: 'success',
        title: t('Vue enregistrée !', 'View saved!'),
        text: t('La vue a été ajoutée avec succès à votre collection.', 'The view has been successfully added to your collection.'),
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          container: 'swal2-high-zindex'
        },
        ...getSwalTheme()
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }


  // ── Three.js ──
  function init() {
    if (!containerRef.current) return;
    const initialBg = sharedViewData?.background_color || bgColor;
    const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(initialBg); sceneRef.current = scene;
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

      let gltf;
      const assetIdStr = assetId ? String(assetId) : null;

      try {
        // On récupère les infos de l'asset pour la version
        let assetMeta: any = null;
        if (assetIdStr) {
          try { assetMeta = await apiCall(`models-manager/${assetIdStr}`); } catch {}
        }

        // 1. Tenter de récupérer depuis le cache IndexedDB (offlineCache)
        if (assetIdStr) {
          const [cachedAsset, cachedGlb] = await Promise.all([
            offlineCache.getAsset(assetIdStr),
            offlineCache.getGlb(assetIdStr)
          ]);
          
          // On n'utilise le cache que si la version correspond (ou si on est hors ligne)
          const versionMatch = !assetMeta || !cachedAsset || (assetMeta.version <= (cachedAsset.version || 0));

          if (cachedGlb && (versionMatch || isOffline)) {
            console.log(`[Cache DB] Chargement de l'asset ${assetIdStr} (v${cachedAsset?.version || '?'})`);
            const blob = new Blob([cachedGlb], { type: 'model/gltf-binary' });
            const blobUrl = URL.createObjectURL(blob);
            gltf = await new Promise<any>((res, rej) => 
              new GLTFLoader().load(blobUrl, (g) => { URL.revokeObjectURL(blobUrl); res(g); }, undefined, rej)
            );
          }
        }

        // 2. Si pas en cache ou version obsolète, télécharger et mettre à jour
        if (!gltf) {
          console.log(`[Network] Téléchargement de ${path}...`);
          const response = await fetch(path);
          if (!response.ok) throw new Error("Échec téléchargement");
          const arrayBuffer = await response.arrayBuffer();
          
          if (assetIdStr) {
            // Mise à jour asynchrone du cache
            const v = assetMeta?.version || 1;
            offlineCache.storeGlb(assetIdStr, arrayBuffer).catch(() => {});
            offlineCache.storeHierarchy(assetIdStr, data).catch(() => {});
            offlineCache.storeAsset({ 
              id: assetIdStr, 
              name: modelName || assetMeta?.name || 'Asset', 
              url_glb: path, 
              cached_at: Date.now(),
              version: v
            }).catch(() => {});
          }

          const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
          const blobUrl = URL.createObjectURL(blob);
          gltf = await new Promise<any>((res, rej) => 
            new GLTFLoader().load(blobUrl, (g) => { URL.revokeObjectURL(blobUrl); res(g); }, undefined, rej)
          );
        }
      } catch (err) {
        console.warn("[Cache] Échec complet, repli direct", err);
        gltf = await new Promise<any>((res, rej) => new GLTFLoader().load(path, res, undefined, rej));
      }
      const model = gltf.scene;
      let matchedCount = 0;
      let totalMeshes = 0;
      
      const clean = (s: string) => {
        if (!s) return '';
        return s.toLowerCase()
          .replace(/_bone$/, '')        // Hamate_bone -> Hamate
          .replace(/_bone_\d+$/, '')    // Hamate_bone_1 -> Hamate
          .replace(/cle$/, 'cule')       // Clavicle -> Clavicule
          .replace(/[\s\._-]/g, '')     // Enlever tout séparateur
          .replace(/\d+$/, '')          // Enlever les nombres finaux
          .trim();
      };
        
      const unmatchedNames: string[] = [];
      model.traverse((obj: THREE.Object3D) => {
        if (!(obj instanceof THREE.Mesh)) return;
        totalMeshes++;
        const m = obj as ExtendedMesh;
        m.material = new THREE.MeshStandardMaterial({ color: 0xECE2D0, roughness: 0.4, metalness: 0.1 });
        m.castShadow = true; m.receiveShadow = true;

        const targetName = clean(obj.name);
        // On essaye de matcher sur three_js_name d'abord, puis sur le nom simple
        let info = data.find(i => (i.three_js_name && clean(i.three_js_name) === targetName) || (i.name && clean(i.name) === targetName));
        
        if (info) {
          m.userData.info = info;
          matchedCount++;
        } else {
          unmatchedNames.push(obj.name);
        }
      });
      console.log(`[Load] Matched: ${matchedCount}/${totalMeshes} meshes.`);
      console.log(`[DEBUG] Noms GLTF non-reconnus (échantillon) :`, unmatchedNames.slice(0, 30));
      console.log(`[DEBUG] Noms attendus en DB (échantillon) :`, data.slice(0, 20).map(i => i.three_js_name || i.name));


      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3()); model.position.sub(center);
      const s = 1.6 / Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
      model.scale.set(s, s, s);

      // Nettoyer l'ancien modèle si présent pour éviter les doublons
      if (modelRef.current && sceneRef.current) sceneRef.current.remove(modelRef.current);
      modelRef.current = model;
      sceneRef.current?.add(model);
      
      // Application immédiate des états de la vue si présents
      if (sharedViewData && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.set(sharedViewData.camera_target.x, sharedViewData.camera_target.y, sharedViewData.camera_target.z);
        cameraRef.current.position.set(sharedViewData.camera_position.x, sharedViewData.camera_position.y, sharedViewData.camera_position.z);
        controlsRef.current.update();
        
        model.traverse((c: any) => {
          if (c instanceof THREE.Mesh) {
            const state = sharedViewData.scene_state.find(s => s.three_js_name === c.name);
            if (state) {
              c.visible = state.visible;
              if (c.material instanceof THREE.MeshStandardMaterial) c.material.opacity = state.opacity;
            }
          }
        });

        if (sharedViewData.background_color) {
          setBgColor(sharedViewData.background_color);
          if (sceneRef.current) sceneRef.current.background = new THREE.Color(sharedViewData.background_color);
        }

        syncEyes();
        countHidden();
        rebuildLabels();
      } else if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.2, 0); 
        controlsRef.current.update();
      }
      if (hierarchyRef.current) { hierarchyRef.current.innerHTML = ''; buildTree(data, hierarchyRef.current); }
      if (descRef.current) descRef.current.innerHTML = 'Cliquez sur un os pour voir sa description.';
      
      // Ensure labels are visible on first load
      setTimeout(rebuildLabels, 100);
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
    if (e.target instanceof Element && e.target.closest('.hierarchy-panel, #description-panel, .label-text, .anatomy-label-pin')) return;
    if (!modelRef.current || !rendererRef.current || !cameraRef.current) return;
    const r = rendererRef.current.domElement.getBoundingClientRect();
    mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const hits = raycaster.current.intersectObject(modelRef.current, true);
    if (hits.length) {
      const obj = hits[0].object as ExtendedMesh;
      const info = obj.userData.info;
      if (obj.visible) {
        if (selRef.current === obj) return;
        
        // Reset previous selection emissive without triggering onSelect(null)
        if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
          selRef.current.material.emissive.setHex(0x000000);
        }
        
        select(info || null, obj);
        if (obj.material instanceof THREE.MeshStandardMaterial) obj.material.emissive.setHex(0x224488);
        
        document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
        if (info) {
          for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
            const s = row.querySelector('span:last-child');
            if (s && s.textContent === info.name) { 
              row.classList.add('selected-item'); 
              row.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
              break;
            }
          }
          desc(info.description || '<em>Description non disponible.</em>', info.name);
        } else {
          desc('<em>Description non disponible pour cet élément.</em>', obj.name);
        }
      }
    } else deselect();
  }

  onClickRef.current = onClick;

  function loop() {
    requestAnimationFrame(loop);
    controlsRef.current?.update();
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      updateLabelsPositions();
    }
  }

  // Called only when visibility changes (hide/show/reveal/isolate) — NOT on selection
  function rebuildLabels() {
    if (!labelsOverlayRef.current) return;

    labelsOverlayRef.current.style.opacity = showLabelsRef.current ? '1' : '0';
    labelsOverlayRef.current.style.pointerEvents = 'none';
    labelsOverlayRef.current.style.transition = 'opacity 0.3s ease-in-out';

    labelsOverlayRef.current.innerHTML = '';
    
    if (!showLabelsRef.current) return;
    
    let visibleMeshes: ExtendedMesh[] = [];
    eachMesh(m => { if (m.visible && (m.userData.info || m === selRef.current)) visibleMeshes.push(m); });

    // Regrouper par ID anatomique pour éviter les doublons d'étiquettes
    // Cela permet d'afficher plus de parties différentes sans surcharger l'écran
    const uniqueMap = new Map<number | string, ExtendedMesh>();
    visibleMeshes.forEach(m => {
      const key = m.userData.info?.id || m.uuid;
      // On garde la première mesh trouvée pour cet ID, ou celle sélectionnée
      if (!uniqueMap.has(key) || m === selRef.current) {
        uniqueMap.set(key, m);
      }
    });

    const targetMeshes = Array.from(uniqueMap.values()).slice(0, 150);
    console.log(`[rebuildLabels] Parts: ${uniqueMap.size}, Meshes: ${visibleMeshes.length}, Showing: ${targetMeshes.length}`);

    if (targetMeshes.length > 0) {
      const frag = document.createDocumentFragment();
      targetMeshes.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'anatomy-label-pin';
        el.dataset.uuid = m.uuid;
        el.style.left = '-9999px';
        el.style.top = '-9999px';
        el.innerHTML = `
          <svg class="label-svg" width="150" height="150" viewBox="0 0 150 150" style="position:absolute; pointer-events:none; overflow:visible;">
            <line x1="0" y1="0" x2="0" y2="0" stroke="#fbbf24" stroke-width="1.5" />
            <circle cx="0" cy="0" r="3" fill="#fbbf24" />
          </svg>
        `;
        // Create clickable label text with DIRECT onclick handler
        const labelText = document.createElement('div');
        labelText.className = 'label-text';
        labelText.textContent = m.userData.info?.name || m.name;
        labelText.onclick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          console.log('[Label Click]', m.userData.info?.name);
          
          if (selRef.current === m) return;
          // Reset previous selection
          if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
            selRef.current.material.emissive.setHex(0x000000);
          }
          // Select the new mesh
          select(m.userData.info || null, m);
          if (m.material instanceof THREE.MeshStandardMaterial) m.material.emissive.setHex(0x224488);
          desc(m.userData.info?.description || '<em>Pas de description.</em>', m.userData.info?.name || m.name);
          
          // Sync hierarchy selection
          document.querySelectorAll('.item-row').forEach(r => r.classList.remove('selected-item'));
          const boneName = m.userData.info?.name || m.name;
          for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
            const s = row.querySelector('span:last-child');
            if (s && s.textContent === boneName) { 
              row.classList.add('selected-item'); 
              row.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
              break;
            }
          }
        };
        el.appendChild(labelText);
        frag.appendChild(el);
      });
      labelsOverlayRef.current.appendChild(frag);
      updateLabelsPositions();
    }
  }

  function updateLabelsPositions() {
    if (!labelsOverlayRef.current || !cameraRef.current || !containerRef.current) return;
    if (!showLabelsRef.current) return;
    const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
    
    const pins = Array.from(labelsOverlayRef.current.querySelectorAll<HTMLElement>('.anatomy-label-pin'));
    
    // On prépare les données des pins visibles
    const visibleData: any[] = [];
    pins.forEach(pin => {
      const uuid = pin.dataset.uuid;
      const mesh = sceneRef.current?.getObjectByProperty('uuid', uuid) as THREE.Mesh;
      if (!mesh || !mesh.visible) { pin.style.display = 'none'; return; }
      
      const pos = new THREE.Vector3();
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        mesh.geometry.boundingBox.getCenter(pos);
        mesh.localToWorld(pos);
      } else {
        mesh.getWorldPosition(pos);
      }
      
      pos.project(cameraRef.current!);
      if (pos.z > 1) { pin.style.display = 'none'; }
      else {
        const x = (pos.x * 0.5 + 0.5) * w;
        const y = (pos.y * -0.5 + 0.5) * h;
        visibleData.push({ pin, x, y, posX: pos.x });
      }
    });

    // Séparation Gauche / Droite équilibrée pour éviter l'encombrement d'un seul côté
    const sortedByX = [...visibleData].sort((a, b) => a.posX - b.posX);
    const mid = Math.ceil(sortedByX.length / 2);
    const leftSide = sortedByX.slice(0, mid).sort((a, b) => a.y - b.y);
    const rightSide = sortedByX.slice(mid).sort((a, b) => a.y - b.y);

    const arrange = (list: any[], edgeX: number, isRight: boolean) => {
      const total = list.length;
      if (total === 0) return;
      
      // Zone de sécurité verticale (évite le D-Pad en bas à droite et les bords)
      const marginTop = 60;
      const marginBottom = isRight ? 220 : 60; 
      const availableHeight = Math.max(h - marginTop - marginBottom, 100);
      const step = availableHeight / (total + 1);

      list.forEach((d, i) => {
        const targetY = marginTop + step * (i + 1);
        const targetX = edgeX;
        
        d.pin.style.display = 'block';
        d.pin.style.left = d.x + 'px';
        d.pin.style.top = d.y + 'px';

        const txt = d.pin.querySelector('.label-text') as HTMLElement;
        const line = d.pin.querySelector('line') as SVGLineElement;
        
        if (txt && line) {
          const offX = targetX - d.x;
          const offY = targetY - d.y;
          
          txt.style.left = offX + 'px';
          txt.style.top = offY + 'px';
          txt.style.transform = `translate(${isRight ? '0%' : '-100%'}, -50%)`;
          
          line.setAttribute('x2', String(offX));
          line.setAttribute('y2', String(offY));
        }
      });
    };

    arrange(leftSide, 150, false); // 150px du bord gauche
    arrange(rightSide, w - 150, true); // 150px du bord droit
  }

  useEffect(() => {
    init(); loop();
    const c = containerRef.current;
    const handler = (e: MouseEvent) => onClickRef.current(e);
    
    // Délégation pour les clics sur les étiquettes
    const labelClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const labelDiv = target.closest('.label-text') as HTMLElement;
      if (labelDiv && labelDiv.dataset.uuid) {
        e.stopPropagation();
        const mesh = sceneRef.current?.getObjectByProperty('uuid', labelDiv.dataset.uuid) as ExtendedMesh;
        if (mesh) {
          if (selRef.current === mesh) return;
          if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
            selRef.current.material.emissive.setHex(0x000000);
          }
          select(mesh.userData.info || null, mesh);
          if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissive.setHex(0x224488);
          desc(mesh.userData.info?.description || '<em>Pas de description.</em>', mesh.userData.info?.name || mesh.name);
          
          // Sync hierarchy selection
          document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
          const boneName = mesh.userData.info?.name || mesh.name;
          for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
            const s = row.querySelector('span:last-child');
            if (s && s.textContent === boneName) { 
              row.classList.add('selected-item'); 
              row.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
              break;
            }
          }
        }
      }
    };

    window.addEventListener('resize', onResize); 
    window.addEventListener('pointermove', onMove); 
    window.addEventListener('click', handler);
    c?.addEventListener('click', labelClickHandler);

    return () => {
      window.removeEventListener('resize', onResize); 
      window.removeEventListener('pointermove', onMove); 
      window.removeEventListener('click', handler);
      c?.removeEventListener('click', labelClickHandler);
      if (rendererRef.current && c) { c.removeChild(rendererRef.current.domElement); rendererRef.current.dispose(); }
    };
  }, []);

  useEffect(() => { setTimeout(load, 0); }, []);

  useEffect(() => {
    rebuildLabels();
  }, [showLabels]);

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
          {(!readOnly || isOffline) ? (
            <>
              <button className="ha-btn" onClick={isolate} disabled={!hasSel} title="Isoler la sélection"><Crosshair size={14} /></button>
              <button className="ha-btn" onClick={hide} disabled={!hasSel} title="Masquer l'élément"><EyeOff size={14} /></button>
              <button className="ha-btn" onClick={show} disabled={!hasSel} title="Réafficher l'élément"><Eye size={14} /></button>
              <button className="ha-btn" onClick={revealAll} title="Tout réafficher"><RefreshCcw size={14} /><span className="ha-badge">{hiddenCount || ''}</span></button>
              <button className="ha-btn" onClick={fade} disabled={!hasSel} title="Mode translucide (Fantôme)"><Moon size={14} /></button>
              <button className="ha-btn" onClick={unfade} disabled={!hasSel} title="Rendre opaque"><Sun size={14} /></button>
              <button className="ha-btn" onClick={fadeOthers} disabled={!hasSel} title="Isoler en transparence"><Contrast size={14} /></button>
            </>
          ) : (
            <div style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>
              MODE LECTURE SEULE
            </div>
          )}
          <button className="ha-btn" onClick={cycleBg} title="Changer la couleur de fond"><Palette size={14} /></button>
          <button className={`ha-btn ${showLabels ? 'active' : ''}`} onClick={toggleLabels} title="Afficher/Masquer les étiquettes">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </button>
          <button className="ha-btn" onClick={captureView} title="Capturer la vue"><Camera size={14} /></button>
          {!readOnly && <button className={`ha-btn ${showSaveModal ? 'active' : ''}`} onClick={() => setShowSaveModal(!showSaveModal)} title="Sauvegarder la vue 3D"><Save size={14} /></button>}
        </div>

        {showSaveModal && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                style={{ background: 'rgba(251, 191, 36, 0.05)', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', padding: '15px' }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={14} /> {t('Sauvegarder cette vue', 'Save this view')}
                    </div>
                    <textarea 
                        value={saveNote}
                        onChange={e => setSaveNote(e.target.value)}
                        placeholder={t('Note ou nom de la vue...', 'Note or view name...')}
                        rows={2}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="ha-btn" 
                            style={{ flex: 1, background: '#fbbf24', color: '#000', fontWeight: 700, borderRadius: '8px', height: '32px' }}
                            onClick={saveView}
                            disabled={saving}
                        >
                           {saving ? <Loader2 size={16} className="spin" /> : t('Enregistrer', 'Save')}
                        </button>
                        <button 
                            className="ha-btn" 
                            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                            onClick={() => setShowSaveModal(false)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
        <div ref={hierarchyRef} id="hierarchy-root" />
      </div>
      <div ref={containerRef} id="canvas-container">
        <div ref={labelsOverlayRef} className="labels-overlay" />
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

    </div>
  );
};

export default AnatomyViewer;
