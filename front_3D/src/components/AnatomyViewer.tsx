import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { offlineCache } from '../services/offlineCache';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowLeft, Crosshair, EyeOff, Eye, Moon, Sun, Contrast, Camera, Save, X, Loader2, RefreshCcw, Palette, RotateCcw, RotateCw } from 'lucide-react';
import { apiCall } from '../services/api';
import Swal from 'sweetalert2';
import { getSwalTheme } from '../services/swalTheme';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/anatomy-viewer.css';


interface AnatomyItem { 
  id: number; 
  name: { en: string; fr: string } | string; 
  three_js_name: string; 
  parent_id?: number | null; 
  type: string; 
  description?: { en: string; fr: string } | string; 
}
interface ExtendedMesh extends THREE.Mesh { userData: { info?: AnatomyItem; [key: string]: any }; }
interface SceneSnapshot {
    camera: { pos: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } };
    scene: Array<{ name: string; three_js_name: string; visible: boolean; opacity: number }>;
}
interface SharedViewData { camera_position: { x: number; y: number; z: number }; camera_target: { x: number; y: number; z: number }; scene_state: Array<{ name: string; three_js_name: string; visible: boolean; opacity: number }>; background_color?: string; teacher_note?: string; }
interface Props { assetId?: string | number; modelPath?: string; initialAnatomicalData?: AnatomyItem[]; isOffline?: boolean; modelName?: string; viewId?: string; sharedViewData?: SharedViewData; readOnly?: boolean; onSelect?: (item: AnatomyItem | null) => void; }

const AnatomyViewer: React.FC<Props> = ({ assetId, modelPath: initialModelPath, initialAnatomicalData, isOffline, modelName, sharedViewData, readOnly, onSelect }) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = (fr: string, en: string) => language === 'fr' ? fr : en;


  // Helper pour extraire le texte depuis l'objet multilingue
  const getLoc = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    const primary = val[language];
    if (primary && primary.trim() !== '') return primary;
    // Si la langue principale est vide, on tente l'autre langue
    const other = language === 'fr' ? val['en'] : val['fr'];
    if (other && other.trim() !== '') return other;
    return fallback;
  };

  const clean = (s: string) => {
    if (!s) return '';
    return s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprimer les accents (é -> e)
      .replace(/^os\s+/, '')         
      .replace(/\s+bone$/, '')      
      .replace(/_bone$/, '')        
      .replace(/_bonel$/, '')       
      .replace(/_bone_\d+$/, '')    
      .replace(/cle$/, 'cule')      
      .replace(/incisor/g, 'incisive')
      .replace(/upper/g, 'superieur')
      .replace(/medial/g, 'central') // "Medial incisor" -> "Incisive centrale"
      .replace(/[\s\._-]/g, '')     
      .replace(/\d+$/, '')          
      .replace(/\.[lr]$/i, '')      // Supprimer les suffixes .L / .R
      .replace(/^os/, '')           
      .replace(/bone$/, '')         
      .trim();
  };

  const getK = (s: string) => {
    const trans: Record<string, string> = {
      'first': 'premier', 'second': 'deuxieme', 'third': 'troisieme', 'fourth': 'quatrieme', 'fifth': 'cinquieme',
      '1': 'premier', '2': 'deuxieme', '3': 'troisieme', '4': 'quatrieme', '5': 'cinquieme',
      'i': 'premier', 'ii': 'deuxieme', 'iii': 'troisieme', 'iv': 'quatrieme', 'v': 'cinquieme',
      'phalanx': 'phalange', 'metacarpal': 'metacarpien', 'finger': 'doigt', 'middle': 'moyen', 'hand': 'main',
      'incisor': 'incisive', 'upper': 'superieur', 'lower': 'inferieur', 'medial': 'central', 'central': 'central', 'distal': 'distal', 'proximal': 'proximal',
      'superior': 'superieur', 'inferior': 'inferieur', 'lateral': 'lateral', 'premolar': 'premolaire', 'molar': 'molaire', 'canine': 'canine', 'vertebra': 'vertebre'
    };
    return (s||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/supero/g, 'superieur ').replace(/infero/g, 'inferieur ').replace(/latero/g, 'lateral ').replace(/medio/g, 'central ')
      .split(/[\s\._-]/)
      .map(v => {
          let t = trans[v] || v;
          if (t === 'medial') return 'central'; 
          return t;
      })
      .filter(v => (v.length > 2 || /\d/.test(v) || ['i','ii','iii','iv','v'].includes(v)) && v !== 'bone' && v !== 'os');
  };

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

  const [history, setHistory] = useState<SceneSnapshot[]>([]);
  const [future, setFuture] = useState<SceneSnapshot[]>([]);
  const anatomyDataRef = useRef<AnatomyItem[]>([]);
  
  // ── Selection: ref for imperative code, state for React re-renders ──
  const selRef = useRef<ExtendedMesh | null>(null);
  const [, bump] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [bgColor, setBgColor] = useState(() => {
    const saved = localStorage.getItem('anatomy_bg');
    if (saved) return saved;
    return theme === 'light' ? '#f3f4f6' : '#0a0a0a';
  });
  const [showLabels, setShowLabels] = useState(false);


  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const showLabelsRef = useRef(false);
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
    } catch (e) { /* Analytics error silenced */ }
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
  
  const syncHierarchy = (id: number | string) => {
    const targetId = String(id);
    document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
    for (const row of Array.from(document.querySelectorAll<HTMLElement>('.item-row'))) {
      if (row.dataset.id === targetId) {
        row.classList.add('selected-item');
        
        let parent = row.parentElement;
        while (parent && !parent.classList.contains('hierarchy-panel')) {
          if (parent.tagName === 'UL' && parent.classList.contains('nested')) {
            parent.classList.add('active');
            const li = parent.parentElement;
            if (li && li.tagName === 'LI') {
              const caret = li.querySelector('.caret');
              if (caret) caret.classList.add('caret-down');
            }
          }
          parent = parent.parentElement;
        }
        
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  };

  const loadDescriptionLazily = (item: AnatomyItem | null | undefined, itemName: string) => {
    if (!item) {
        desc(`<em>${t('Pas de description.', 'No description available.')}</em>`, itemName);
        return;
    }
    if (!item.description || (typeof item.description === 'object' && !item.description[language === 'fr' ? 'fr' : 'en'])) {
        desc(`<div class="loading-desc"><span class="spin">⏳</span> ${t('Chargement des détails...', 'Loading details...')}</div>`, itemName);
        apiCall(`anatomy/show/${item.id}`).then((res: any) => {
            if (res.description) item.description = res.description;
            const localizedDesc = getLoc(res.description);
            desc(localizedDesc || `<em>${t('Pas de description.', 'No description available.')}</em>`, itemName);
        }).catch(() => {
          desc(`<em>${t('Erreur de chargement.', 'Loading error.')}</em>`, itemName);
        });
    } else {
        const localizedDesc = getLoc(item.description);
        desc(localizedDesc || `<em>${t('Pas de description.', 'No description available.')}</em>`, itemName);
    }
  };

  function eachMesh(fn: (m: ExtendedMesh) => void) {
    sceneRef.current?.traverse(c => { if (c instanceof THREE.Mesh) fn(c as ExtendedMesh); });
  }

  function countHidden() {
    let n = 0; eachMesh(m => { if (!m.visible) n++; }); setHiddenCount(n);
  }

  const takeSnapshot = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const sceneState: any[] = [];
    eachMesh(m => {
      sceneState.push({ name: m.name, three_js_name: m.name, visible: m.visible, opacity: m.material instanceof THREE.Material ? m.material.opacity : 1 });
    });

    const snap: SceneSnapshot = {
        camera: {
            pos: { x: cameraRef.current.position.x, y: cameraRef.current.position.y, z: cameraRef.current.position.z },
            target: { x: controlsRef.current.target.x, y: controlsRef.current.target.y, z: controlsRef.current.target.z }
        },
        scene: sceneState
    };

    setHistory(prev => [...prev.slice(-19), snap]); // Keep last 20
    setFuture([]);
  };

  const applySnapshot = (snap: SceneSnapshot) => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return;
    
    // Camera
    cameraRef.current.position.set(snap.camera.pos.x, snap.camera.pos.y, snap.camera.pos.z);
    controlsRef.current.target.set(snap.camera.target.x, snap.camera.target.y, snap.camera.target.z);
    controlsRef.current.update();

    // Scene
    const map = new Map(snap.scene.map(s => [s.name, s]));
    eachMesh(m => {
        const s = map.get(m.name);
        if (s) {
            m.visible = s.visible;
            if (m.material instanceof THREE.Material) {
                m.material.opacity = s.opacity;
                m.material.transparent = s.opacity < 1;
            }
        }
    });
    countHidden();
    syncEyes();
    bump(v => v + 1);
  };

  const undo = () => {
    if (history.length === 0) return;
    
    // Save current to future
    const currentSnap: SceneSnapshot = {
        camera: {
            pos: { x: cameraRef.current!.position.x, y: cameraRef.current!.position.y, z: cameraRef.current!.position.z },
            target: { x: controlsRef.current!.target.x, y: controlsRef.current!.target.y, z: controlsRef.current!.target.z }
        },
        scene: []
    };
    eachMesh(m => { currentSnap.scene.push({ name: m.name, three_js_name: m.name, visible: m.visible, opacity: (m.material instanceof THREE.Material ? (m.material as any).opacity : 1) }); });

    const prev = history[history.length - 1];
    setFuture(f => [currentSnap, ...f]);
    setHistory(h => h.slice(0, -1));
    applySnapshot(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    
    const currentSnap: SceneSnapshot = {
        camera: {
            pos: { x: cameraRef.current!.position.x, y: cameraRef.current!.position.y, z: cameraRef.current!.position.z },
            target: { x: controlsRef.current!.target.x, y: controlsRef.current!.target.y, z: controlsRef.current!.target.z }
        },
        scene: []
    };
    eachMesh(m => { currentSnap.scene.push({ name: m.name, three_js_name: m.name, visible: m.visible, opacity: (m.material instanceof THREE.Material ? (m.material as any).opacity : 1) }); });

    setHistory(h => [...h, currentSnap]);
    setFuture(f => f.slice(1));
    applySnapshot(next);
  };

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
    const span = document.createElement('span'); span.textContent = getLoc(item.name);
    row.appendChild(eye); row.appendChild(iso); row.appendChild(span); li.appendChild(row);

    const mesh = sceneRef.current?.getObjectByName(item.three_js_name) as ExtendedMesh | null ?? null;
    eye.innerHTML = mesh ? (mesh.visible ? ICONS.eye : ICONS.eyeOff) : ICONS.eye;
    if (mesh) row.classList.toggle('is-hidden', !mesh.visible);

    const children = data.filter(c => c.id && c.parent_id === item.id && !seen.has(c.id));

    eye.onclick = (e) => {
      e.stopPropagation();
      takeSnapshot();
      const getAllIds = (it: AnatomyItem): number[] => {
        let ids = [it.id];
        data.filter(c => c.parent_id === it.id).forEach(c => { ids = ids.concat(getAllIds(c)); });
        return ids;
      };
      const targetIds = new Set(getAllIds(item));

      // On bascule la visibilité de TOUS les éléments ayant ces IDs
      let targetState = true;
      if (mesh) targetState = !mesh.visible;
      else {
        const firstRow = ul.querySelector(`.item-row[data-id="${item.id}"]`) as HTMLElement;
        targetState = !firstRow.classList.contains('is-hidden');
      }

      eachMesh(m => {
        if (m.userData.info && targetIds.has(m.userData.info.id)) {
          m.visible = targetState;
          if (!m.visible && selRef.current === m) deselect();
        }
      });
      syncEyes(); countHidden(); rebuildLabels();
    };

    iso.onclick = (e) => {
      e.stopPropagation();
      takeSnapshot();
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
        const itemName = getLoc(info?.name || item.name);
        loadDescriptionLazily(info || item, itemName);
      } else {
        // No mesh found (group node)
        deselect();
        select(item, null);
        document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
        row.classList.add('selected-item');
        const itemName = getLoc(item.name);
        loadDescriptionLazily(item, itemName);
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
    const selected = selRef.current; 
    if (!selected) return;
    
    // On identifie tous les ancêtres et descendants de l'objet sélectionné
    const ancestors = new Set<string>();
    let p = selected.parent;
    while (p) { ancestors.add(p.uuid); p = p.parent; }

    const descendants = new Set<string>();
    selected.traverse(c => descendants.add(c.uuid));
    
    
    const targetUuid = selected.uuid;
    sceneRef.current?.traverse(obj => {
      if (obj instanceof THREE.Scene || obj instanceof THREE.Light || obj instanceof THREE.Camera) return;

      const isTarget = obj.uuid === targetUuid;
      const isPart = ancestors.has(obj.uuid) || descendants.has(obj.uuid);

      if (isTarget || isPart) {
        obj.visible = true;
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.transparent = false; obj.material.opacity = 1; obj.material.depthWrite = true; obj.material.needsUpdate = true;
        }
      } else {
        obj.visible = false;
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.transparent = true; obj.material.opacity = 0; obj.material.depthWrite = false; obj.material.needsUpdate = true;
        }
      }
    });

    syncEyes();
    countHidden();
    rebuildLabels();
    if (selected.userData.info) logUsage(selected.userData.info);
  }
  function hide() {
    const selected = selRef.current; if (!selected) return;
    selected.visible = false; deselect(); desc('', 'Élément masqué'); syncEyes(); countHidden(); rebuildLabels();
    if (selected.userData.info) logUsage(selected.userData.info);
  }
  function show() {
    const selected = selRef.current; if (!selected) return;
    selected.visible = true;
    let p = selected.parent; while (p) { p.visible = true; p = p.parent; }
    if (selected.material instanceof THREE.MeshStandardMaterial) selected.material.emissive.setHex(0x224488);
    const info = selected.userData.info;
    const localizedDesc = getLoc(info?.description);
    const itemName = getLoc(info?.name || selected.name);
    if (localizedDesc) desc(localizedDesc, itemName);
    else desc(`<em>${t('Pas de description.', 'No description available.')}</em>`, itemName);
    syncEyes(); countHidden(); rebuildLabels();
    if (info) logUsage(info);
  }
  function revealAll() {
    sceneRef.current?.traverse(c => {
      const lowerName = c.name.toLowerCase();
      // On ne réaffiche pas les objets système/texte masqués au chargement
      if (lowerName.includes('skeletal') || lowerName.includes('system') || lowerName.includes('scene')) {
        return;
      }
      
      c.visible = true;
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material.emissive.setHex(0x000000); 
        c.material.opacity = 1; 
        c.material.transparent = false; 
        c.material.depthWrite = true; 
        c.material.needsUpdate = true;
      }
    });
    deselect(); desc(t('Cliquez sur un os pour voir sa description.', 'Click on a bone to see its description.'));
    rebuildLabels(); // Rebuild labels on revealAll
    syncEyes(); setHiddenCount(0);
  }
  function fade() {
    const selected = selRef.current; if (!selected) return;
    const mat = selected.material as any;
    if (mat) {
      mat.transparent = true; mat.opacity = 0.1; mat.depthWrite = false; mat.needsUpdate = true;
    }
  }
  function unfade() {
    const selected = selRef.current; if (!selected) return;
    const mat = selected.material as any;
    if (mat) {
      mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true;
    }
  }
  function fadeOthers() {
    const selected = selRef.current;
    if (!selected) return;

    const ancestors = new Set<string>();
    let p = selected.parent;
    while (p) { ancestors.add(p.uuid); p = p.parent; }
    
    eachMesh(m => {
      if (!(m.material instanceof THREE.MeshStandardMaterial)) return;
      if (m.uuid === selected.uuid || ancestors.has(m.uuid)) {
        m.material.transparent = false; m.material.opacity = 1; m.material.depthWrite = true;
      } else {
        m.material.transparent = true; m.material.opacity = 0.05; m.material.depthWrite = false;
      }
      m.material.needsUpdate = true;
    });

    // Parents toujours visibles
    let p2 = selected.parent;
    while (p2) { p2.visible = true; p2 = p2.parent; }

    syncEyes(); countHidden(); rebuildLabels();
    if (selected.userData.info) logUsage(selected.userData.info);
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
    const colors = theme === 'light' 
      ? ['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#1a1a2e', '#0a0a0a']
      : ['#0a0a0a', '#1a1a2e', '#2d2d2d', '#444444', '#777777', '#cccccc'];
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
    const gridColor = theme === 'light' ? 0xcccccc : 0x88aaff;
    const gridColorCenter = theme === 'light' ? 0x999999 : 0x335588;
    const grid = new THREE.GridHelper(4, 20, gridColor, gridColorCenter); 
    grid.position.y = -0.8; 
    if (theme === 'light') (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

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
      const assetIdStr = assetId ? String(assetId) : null;

      // 1. Récupérer les métadonnées de l'asset
      let assetMeta: any = null;
      if (assetIdStr && !isOffline) {
        try { 
          assetMeta = await apiCall(`models-manager/${assetIdStr}`); 
          // Mettre à jour le chemin avec l'URL officielle de la DB si présente
          if (assetMeta?.url_glb) {
            path = assetMeta.url_glb;
            if (path.includes('Assets_3D/')) {
              path = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/models-manager/files/${path.split('/').pop()}`;
            }
          }
        } catch (e) { 
          /* Error silenced */
        }
      }

      const remoteVersion = assetMeta?.version || assetMeta?.version_cache || 0;
      let cachedAsset: any = null;
      let cachedHierarchyData: any = null;
      let cachedGlb: ArrayBuffer | undefined = undefined;

      if (assetIdStr) {
        [cachedAsset, cachedHierarchyData, cachedGlb] = await Promise.all([
          offlineCache.getAsset(assetIdStr),
          offlineCache.getHierarchy(assetIdStr),
          offlineCache.getGlb(assetIdStr)
        ]);
      }

      const localVersion = cachedAsset?.version || 0;
      const hasLocalData = !!(cachedGlb && cachedHierarchyData);
      const isUpToDate = assetIdStr && hasLocalData && (isOffline || !assetMeta || localVersion >= remoteVersion);


      // 2. Charger la hiérarchie
      if (initialAnatomicalData?.length) {
        data = initialAnatomicalData;
      } else if (assetIdStr) {
        try {
          if (!isOffline) {
             const lastSync = cachedAsset?.hierarchy_updated_at;
             const ep = `/anatomy/all?asset_3d_id=${assetIdStr}${lastSync ? `&since=${lastSync}` : ''}`;
             
             const updates: AnatomyItem[] = await apiCall(ep);
             
             if (lastSync && cachedHierarchyData) {
               const existing = [...(cachedHierarchyData as any[])];
               updates.forEach(upd => {
                 const idx = existing.findIndex(o => o.id === upd.id);
                 if (idx >= 0) existing[idx] = upd;
                 else existing.push(upd);
               });
               data = existing as AnatomyItem[];
             } else {
               data = updates;
             }
             
             // Mettre à jour le cache de hiérarchie et les métadonnées
             offlineCache.storeHierarchy(assetIdStr, data).catch(() => {});
             
             const latestSyncTime = data.reduce((max, obj: any) => {
               if (!obj.updated_at) return max;
               return obj.updated_at > max ? obj.updated_at : max;
             }, lastSync || '1970-01-01 00:00:00');
             
             offlineCache.storeAsset({
               ...cachedAsset,
               id: assetIdStr,
               name: modelName || assetMeta?.name || cachedAsset?.name || 'Asset',
               url_glb: path,
               cached_at: Date.now(),
               version: remoteVersion || localVersion || 1,
               hierarchy_updated_at: latestSyncTime
             }).catch(() => {});
          } else {
             throw new Error("Offline mode");
          }
        } catch (e) {
          if (cachedHierarchyData) {
            data = cachedHierarchyData as AnatomyItem[];
          } else {
            throw new Error(t("Modèle non disponible.", "Model not available."));
          }
        }
      }

      // 3. Charger le binaire GLB
      let gltf;
      if (isUpToDate && cachedGlb) {
        const blob = new Blob([cachedGlb], { type: 'model/gltf-binary' });
        const blobUrl = URL.createObjectURL(blob);
        gltf = await new Promise<any>((res, rej) => 
          new GLTFLoader().load(blobUrl, (g) => { URL.revokeObjectURL(blobUrl); res(g); }, undefined, rej)
        );
      } else {
        // Téléchargement si nécessaire
        const response = await fetch(path);
        if (!response.ok) throw new Error(t("Échec du téléchargement du modèle.", "Failed to download model."));
        const arrayBuffer = await response.arrayBuffer();
        
        if (assetIdStr) {
          offlineCache.storeGlb(assetIdStr, arrayBuffer).catch(() => {});
          offlineCache.storeAsset({ 
            ...cachedAsset,
            id: assetIdStr, 
            name: modelName || assetMeta?.name || cachedAsset?.name || 'Asset', 
            url_glb: path, 
            cached_at: Date.now(),
            version: remoteVersion || localVersion || 1
          }).catch(() => {});
        }

        const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
        const blobUrl = URL.createObjectURL(blob);
        gltf = await new Promise<any>((res, rej) => 
          new GLTFLoader().load(blobUrl, (g) => { URL.revokeObjectURL(blobUrl); res(g); }, undefined, rej)
        );
      }

      const model = gltf.scene;
      let totalMeshes = 0;
      

        
      const unmatchedNames: string[] = [];
      
      // OPTIMISATION: Pré-calculer les index une seule fois
      const indexedData = data.map(item => ({
        item,
        cleanNames: [
          item.three_js_name ? clean(item.three_js_name) : '',
          typeof item.name === 'string' ? clean(item.name) : clean((item.name as any)?.fr || ''),
          typeof item.name === 'object' ? clean((item.name as any)?.en || '') : ''
        ].filter(Boolean),
        keywords: Array.from(new Set([
          ...getK(item.three_js_name || ''),
          ...getK(typeof item.name === 'string' ? item.name : (item.name as any)?.fr || ''),
          ...getK(typeof item.name === 'object' ? (item.name as any)?.en || '' : '')
        ]))
      }));

      model.traverse((obj: THREE.Object3D) => {
        if (!(obj instanceof THREE.Mesh)) return;
        totalMeshes++;
        const m = obj as ExtendedMesh;
        m.material = new THREE.MeshStandardMaterial({ color: 0xECE2D0, roughness: 0.4, metalness: 0.1 });
        m.castShadow = true; m.receiveShadow = true;

        const targetName = obj.name;
        const targetClean = clean(targetName);
        const targetK = getK(targetName);
        
        // 1. Recherche rapide (Match exact)
        let found = indexedData.find(idx => idx.cleanNames.includes(targetClean));
        
        // 2. Recherche par mots-clés (Fallback n-1)
        if (!found && targetK.length > 0) {
          found = indexedData.find(idx => {
            const matches = targetK.filter(tk => idx.keywords.some(ck => ck.includes(tk) || tk.includes(ck)));
            return matches.length >= Math.max(1, targetK.length - 1);
          });
        }

        if (found) {
          m.userData.info = found.item;
          m.visible = true;
        } else {
          const l = obj.name.toLowerCase();
          // On cache agressivement ce qui n'est pas matché et qui ressemble à de la déco Blender
          if (l.includes('skeletal') || l.includes('system') || l.includes('text') || l.includes('plane') || l.includes('scene') || l.includes('logo') || l.includes('empty') || l.includes('camera')) {
            m.visible = false;
          } else {
            m.visible = true; 
          }
          unmatchedNames.push(obj.name);
        }
      });
      anatomyDataRef.current = data;


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
      
      syncEyes();
      countHidden();
      
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
        const name = (getLoc(obj.userData.info?.name) || obj.name || '').toLowerCase();
        if (name.includes('skeletal system') || name.includes('scene') || name.includes('root') || name === 'object_0') {
          labelRef.current.style.display = 'none';
          document.body.style.cursor = 'default';
          return;
        }
        labelRef.current.style.display = 'block';
        const s = labelRef.current.querySelector('span');
        if (s) s.textContent = getLoc(obj.userData.info?.name) || obj.name;
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
      let info = obj.userData.info;

      // Nouveaux logs demandés par l'utilisateur
      const modelName = obj.name;
      const dbMatch = info ? (getLoc(info.name) || info.three_js_name) : 'Aucun match';
      console.log(`[AnatomyClick] Model: "${modelName}" | DB Match: "${dbMatch}"`);
      
      if (!info) {
        const targetK = getK(modelName);
        console.log(`[DebugMatch] Target: "${modelName}" -> Keywords: ${targetK.join(', ')}`);
        const sim = anatomyDataRef.current.filter(i => {
           const names = [i.three_js_name, typeof i.name === 'string' ? i.name : (i.name as any)?.fr, (i.name as any)?.en].filter(Boolean);
           return names.some(cand => {
             const candK = getK(cand!);
             const matches = targetK.filter(tk => candK.some(ck => ck.includes(tk) || tk.includes(ck)));
             return matches.length >= Math.max(1, targetK.length - 1);
           });
        }).map(i => getLoc(i.name)).slice(0, 3);
        if (sim.length > 0) console.log(`   Similitudes trouvées en base : ${sim.join(', ')}`);
      }
      if (obj.visible) {
        if (selRef.current === obj) return;
        
        // Reset previous selection emissive
        if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
          selRef.current.material.emissive.setHex(0x000000);
        }
        
        select(info || null, obj);
        if (obj.material instanceof THREE.MeshStandardMaterial) obj.material.emissive.setHex(0x224488);
        
        document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
        
        if (info) {
          // Sync hierarchy selection
          syncHierarchy(info.id);

          const itemName = getLoc(info.name);
          loadDescriptionLazily(info, itemName);
        } else {
          desc(`<em>${t('Pas de description.', 'No description available.')}</em>`, obj.name);
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
    
    const visibleMeshes: ExtendedMesh[] = [];
    eachMesh(m => { if (m.visible && m.userData.info) visibleMeshes.push(m); });

    if (visibleMeshes.length === 0) return;

    // 1. Construire le parentMap
    const parentMap = new Map<number, number>();
    anatomyDataRef.current.forEach(item => { if (item.parent_id) parentMap.set(item.id, item.parent_id); });

    const getAncestors = (id: number) => {
      const path = [id];
      let curr = parentMap.get(id);
      while (curr) { path.push(curr); curr = parentMap.get(curr); }
      return path.reverse(); // [1, ..., parent, id]
    };

    // 2. Trouver l'ancêtre commun le plus proche (LCA) de tous les objets visibles
    // On exclut l'ID 1 du calcul pour éviter que le titre reste bloqué sur "Squelette humain"
    // si un petit morceau du buste ou une mesh de fond est encore visible.
    const relevantIds = visibleMeshes.map(m => m.userData.info.id).filter(id => id !== 1);
    
    let currentRootId = 1;
    if (relevantIds.length > 0) {
      let commonPath: number[] = getAncestors(relevantIds[0]);
      for (let i = 1; i < relevantIds.length; i++) {
        const path = getAncestors(relevantIds[i]);
        let j = 0;
        while (j < commonPath.length && j < path.length && commonPath[j] === path[j]) { j++; }
        commonPath = commonPath.slice(0, j);
      }
      currentRootId = commonPath[commonPath.length - 1] || 1;
    }

    // Afficher le titre du contexte (le parent commun actuel)
    const rootItem = anatomyDataRef.current.find(it => it.id === currentRootId);
    if (rootItem) {
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'anatomy-root-title-wrapper';
      
      const titleEl = document.createElement('div');
      titleEl.className = 'anatomy-root-title';
      titleEl.innerHTML = `<span>${t('Vue :', 'View:')} </span>${getLoc(rootItem.name)}`;
      
      titleWrapper.appendChild(titleEl);
      labelsOverlayRef.current.appendChild(titleWrapper);
    }

    // 3. Identifier les cibles : les enfants directs du LCA qui sont visibles dans une branche
    const targetMeshes: { mesh: ExtendedMesh; labelName: string }[] = [];
    const processedGroups = new Set<number>();

    // Liste d'exclusion pour les noms
    const isExcluded = (name: string) => {
      const n = name.toLowerCase();
      return n.includes('skeletal system') || n.includes('système squelettique') || n.includes('squelette humain') || n.includes('root') || n.includes('scene');
    };

    visibleMeshes.forEach(m => {
      const info = m.userData.info;
      if (info.id === 1) return; // Jamais d'étiquette pour la racine globale

      let p = info.id;
      let topUnderRoot = p;

      while (p && p !== currentRootId) {
        const parentId = parentMap.get(p);
        if (parentId === currentRootId) {
          topUnderRoot = p;
          break;
        }
        p = parentId || 0;
      }

      if (topUnderRoot && topUnderRoot !== currentRootId && !processedGroups.has(topUnderRoot)) {
        const groupItem = anatomyDataRef.current.find(it => it.id === topUnderRoot);
        const name = groupItem ? getLoc(groupItem.name) : (getLoc(m.userData.info?.name) || m.name);
        
        if (!isExcluded(name)) {
          // On clone m pour l'affichage mais on change son nom pour le label
          targetMeshes.push({ mesh: m, labelName: name });
          processedGroups.add(topUnderRoot);
        }
      }
    });

    // S'assurer que l'élément sélectionné a son étiquette si visible (et pas la racine ou le groupe déjà affiché)
    if (selRef.current && selRef.current.visible && selRef.current.userData.info && selRef.current.userData.info.id !== currentRootId) {
        const selId = selRef.current.userData.info.id;
        if (!processedGroups.has(selId)) {
            targetMeshes.push({ mesh: selRef.current, labelName: getLoc(selRef.current.userData.info.name) });
        }
    }

    if (targetMeshes.length > 0) {
      const frag = document.createDocumentFragment();
      // On limite à 15 étiquettes max
      targetMeshes.slice(0, 15).forEach((item) => {
        const m = item.mesh;
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
        const labelText = document.createElement('div');
        labelText.className = 'label-text';
        labelText.textContent = item.labelName;
        labelText.onclick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          /* Label click log removed */
          
          if (selRef.current === m) return;
          // Reset previous selection
          if (selRef.current && selRef.current.material instanceof THREE.MeshStandardMaterial) {
            selRef.current.material.emissive.setHex(0x000000);
          }
          // Select the new mesh
          select(m.userData.info || null, m);
          if (m.material instanceof THREE.MeshStandardMaterial) m.material.emissive.setHex(0x224488);
          const itemName = getLoc(m.userData.info?.name) || m.name;
          loadDescriptionLazily(m.userData.info, itemName);

          // Sync hierarchy selection
          if (m.userData.info?.id) syncHierarchy(m.userData.info.id);
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

    // Séparation Gauche / Droite selon la position réelle de l'organe à l'écran
    const leftSide = visibleData.filter(d => d.posX <= 0).sort((a, b) => a.y - b.y);
    const rightSide = visibleData.filter(d => d.posX > 0).sort((a, b) => a.y - b.y);

    const arrange = (list: any[], edgeX: number, isRight: boolean) => {
      const total = list.length;
      if (total === 0) return;
      
      const isMobile = window.innerWidth < 768;
      const marginTop = isMobile ? 40 : 80;
      const marginBottom = isRight ? (isMobile ? 140 : 220) : (isMobile ? 40 : 80); 
      const availableHeight = Math.max(h - marginTop - marginBottom, 100);
      
      // Calculer le step, mais imposer un minimum pour éviter les chevauchements
      const minStep = isMobile ? 22 : 28;
      let step = availableHeight / (total + 1);
      
      // Si trop de labels, on en masque certains pour garder la lisibilité
      let displayList = list;
      if (step < minStep) {
        step = minStep;
        const maxPossible = Math.floor(availableHeight / minStep);
        displayList = list.slice(0, maxPossible);
        // Cacher les autres
        list.slice(maxPossible).forEach(d => d.pin.style.display = 'none');
      }

      displayList.forEach((d, i) => {
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
          
          // Aligner les textes pour qu'ils s'étendent vers l'intérieur (évite les coupures aux bords)
          txt.style.transform = `translate(${isRight ? '-100%' : '0%'}, -50%)`;
          
          // Ajuster la ligne pour qu'elle s'arrête au bord du texte le plus proche du modèle
          const tw = txt.offsetWidth;
          const lineEndX = isRight ? (offX - tw - 4) : (offX + tw + 4);
          
          line.setAttribute('x2', String(lineEndX));
          line.setAttribute('y2', String(offY));
        }
      });
    };

    const hEdge = window.innerWidth < 768 ? 10 : 60;
    arrange(leftSide, hEdge, false); // Bord gauche
    arrange(rightSide, w - hEdge, true); // Bord droit
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
          const itemName = getLoc(mesh.userData.info?.name) || mesh.name;
          loadDescriptionLazily(mesh.userData.info, itemName);

          // Sync hierarchy selection
          if (mesh.userData.info?.id) syncHierarchy(mesh.userData.info.id);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, future]); // Re-bind when stacks change to have fresh refs if needed, or use functional refs

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
              <button className="ha-btn" onClick={() => { takeSnapshot(); isolate(); }} disabled={!hasSel} title="Isoler la sélection"><Crosshair size={14} /></button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); hide(); }} disabled={!hasSel} title="Masquer l'élément"><EyeOff size={14} /></button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); show(); }} disabled={!hasSel} title="Réafficher l'élément"><Eye size={14} /></button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); revealAll(); }} title="Tout réafficher">
                <RefreshCcw size={14} />
                {hiddenCount > 0 && <span className="ha-badge">{hiddenCount}</span>}
              </button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); fade(); }} disabled={!hasSel} title="Mode translucide (Fantôme)"><Moon size={14} /></button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); unfade(); }} disabled={!hasSel} title="Rendre opaque"><Sun size={14} /></button>
              <button className="ha-btn" onClick={() => { takeSnapshot(); fadeOthers(); }} disabled={!hasSel} title="Isoler en transparence"><Contrast size={14} /></button>
            </>
          ) : (
            <div style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>
              MODE LECTURE SEULE
            </div>
          )}
          <div style={{ width: '1px', height: '24px', background: 'var(--dash-border)', margin: '0 4px' }} />
          <button className="ha-btn" onClick={undo} disabled={history.length === 0} title={t("Annuler (Ctrl+Z)", "Undo (Ctrl+Z)")}><RotateCcw size={14} /></button>
          <button className="ha-btn" onClick={redo} disabled={future.length === 0} title={t("Rétablir (Ctrl+Y)", "Redo (Ctrl+Y)")}><RotateCw size={14} /></button>
          <div style={{ width: '1px', height: '24px', background: 'var(--dash-border)', margin: '0 4px' }} />
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
        <style>{`
          .anatomy-root-title-wrapper {
            position: absolute;
            top: 20px;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            pointer-events: none;
            z-index: 1000;
          }
          .anatomy-root-title {
            background: #000;
            border: 1px solid #fbbf24;
            color: #fbbf24;
            padding: 6px 20px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: 0.5px;
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .anatomy-root-title span {
            color: #fff;
            opacity: 0.6;
            font-weight: 500;
            font-size: 12px;
          }
        `}</style>
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
