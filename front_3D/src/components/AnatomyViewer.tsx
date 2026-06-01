import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { apiCall } from '../services/api';
import '../styles/anatomy-viewer.css';

interface AnatomyItem {
  id: number;
  name: string;
  three_js_name: string;
  parent_id?: number | null;
  type: string;
  description?: string;
}

interface ExtendedMesh extends THREE.Mesh {
  userData: {
    info?: AnatomyItem;
    [key: string]: any;
  };
}

type NameToMeshMap = Map<string, ExtendedMesh>;

interface AnatomyViewerProps {
  assetId?: string | number;
  modelPath?: string;
  initialAnatomicalData?: AnatomyItem[];
  isOffline?: boolean;
}

const AnatomyViewer: React.FC<AnatomyViewerProps> = ({ 
  assetId,
  modelPath: initialModelPath,
  initialAnatomicalData,
  isOffline
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const descContainerRef = useRef<HTMLDivElement>(null);
  const hierarchyRootRef = useRef<HTMLDivElement>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Scene | null>(null);
  
  const [anatomicalData, setAnatomicalData] = useState<AnatomyItem[]>([]);
  const [lastSelectedObject, setLastSelectedObject] = useState<ExtendedMesh | null>(null);
  const [nameToMeshMap, setNameToMeshMap] = useState<NameToMeshMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raycaster and mouse for interaction
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Update description panel
  const updateDescriptionPanel = (itemInfo: AnatomyItem | null, fallbackName = '') => {
    if (!descContainerRef.current) return;
    
    if (itemInfo && itemInfo.description && itemInfo.description.trim()) {
      let cleanDesc = itemInfo.description.replace(/\\n/g, '\n').replace(/\\t/g, '').trim();
      if (!cleanDesc) cleanDesc = "Aucune description détaillée.";
      const title = itemInfo.name || fallbackName || "Élément";
      descContainerRef.current.innerHTML = `<strong>${title}</strong><br><br>${cleanDesc.replace(/\n/g, '<br>')}`;
    } else {
      let name = (itemInfo && itemInfo.name) ? itemInfo.name : (fallbackName || "Élément anatomique");
      descContainerRef.current.innerHTML = `<strong>${name}</strong><br><br><em>Description non disponible.</em>`;
    }
  };

  // Render tree node for hierarchy
  const renderTreeNode = (
    dataItem: AnatomyItem, 
    containerUl: HTMLUListElement, 
    ancestorsSet: Set<number> = new Set(),
    data: AnatomyItem[] = anatomicalData
  ) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.classList.add('item-row');
    
    const eyeBtn = document.createElement('button');
    eyeBtn.classList.add('eye-btn');
    
    const span = document.createElement('span');
    const name = dataItem.name;
    span.textContent = name;
    
    row.appendChild(eyeBtn);
    row.appendChild(span);
    li.appendChild(row);

    const mesh3D = nameToMeshMap.get(dataItem.three_js_name) || null;
    
    // Set initial eye button state based on mesh visibility
    if (mesh3D) {
      eyeBtn.innerHTML = mesh3D.visible ? '👁' : '🚫';
      row.classList.toggle('is-hidden', !mesh3D.visible);
    } else {
      eyeBtn.innerHTML = '👁'; // Default for items without mesh
    }
    
    const children = data.filter(item => {
      // Skip items with undefined id or parent_id
      if (!item.id || item.id === undefined) {
        console.warn(`Item avec ID undefined ignoré : ${item.name}`);
        return false;
      }
      if (item.parent_id !== dataItem.id) return false;
      if (ancestorsSet.has(item.id)) {
        console.warn(`Cycle évité : ${item.name} (id ${item.id})`);
        return false;
      }
      return true;
    });
    
    console.log(`Pour ${dataItem.name} (id: ${dataItem.id}): trouvé ${children.length} enfants`);

    eyeBtn.onclick = (e) => {
      e.stopPropagation();
      if (mesh3D) {
        mesh3D.visible = !mesh3D.visible;
        row.classList.toggle('is-hidden', !mesh3D.visible);
        eyeBtn.innerHTML = mesh3D.visible ? '👁' : '🚫';
        if (!mesh3D.visible && lastSelectedObject === mesh3D) {
          deselectCurrent();
          updateDescriptionPanel(null, "Élément masqué");
        }
      }
    };

    row.onclick = (e) => {
      e.stopPropagation();
      if (mesh3D && mesh3D.visible) {
        deselectCurrent();
        setLastSelectedObject(mesh3D);
        if (mesh3D.material instanceof THREE.MeshStandardMaterial) {
          mesh3D.material.emissive.setHex(0x112244);
        }
        row.classList.add('selected-item');
        updateDescriptionPanel(mesh3D.userData.info || dataItem, mesh3D.name);
      } else if (mesh3D && !mesh3D.visible) {
        updateDescriptionPanel(null, dataItem.name + " (masqué)");
        if (descContainerRef.current) {
          descContainerRef.current.innerHTML = `<strong>${dataItem.name}</strong><br><br><em>Cet élément est masqué.</em>`;
        }
      } else {
        updateDescriptionPanel(dataItem, dataItem.name);
      }
      if (children.length > 0) {
        const childUl = li.querySelector('ul');
        if (childUl) {
          childUl.classList.toggle('active');
          span.classList.toggle('caret-down');
        }
      }
    };

    if (children.length > 0) {
      const ul = document.createElement('ul');
      ul.classList.add('nested');
      span.classList.add('caret');
      const newAncestors = new Set(ancestorsSet);
      newAncestors.add(dataItem.id);
      children.forEach(child => renderTreeNode(child, ul, newAncestors, data));
      li.appendChild(ul);
    }
    containerUl.appendChild(li);
  };

  // Deselect current object
  const deselectCurrent = () => {
    if (lastSelectedObject) {
      if (lastSelectedObject.material instanceof THREE.MeshStandardMaterial) {
        lastSelectedObject.material.emissive.setHex(0x000000);
      }
      setLastSelectedObject(null);
    }
    document.querySelectorAll('.item-row').forEach(el => el.classList.remove('selected-item'));
  };

  // Initialize scene
  const initScene = () => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(3, 2, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambientLight);

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

    // Grid helper
    const gridHelper = new THREE.GridHelper(4, 20, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.8;
    scene.add(gridHelper);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;
  };

  // Load and process data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let cleanedData: AnatomyItem[] = [];
      let finalModelPath = initialModelPath || 'Squelette_complet.glb';

      if (initialAnatomicalData && initialAnatomicalData.length > 0) {
        // ── DONNÉES FOURNIES EN CACHE (mode hors-ligne) ──
        console.log("Utilisation des données en cache, Asset ID:", assetId);
        cleanedData = initialAnatomicalData;
      } else {
        // ── RÉCUPÉRATION DE TOUTE LA HIÉRARCHIE VIA L'API ──
        console.log("Chargement de l'atlas spécifié via l'API, Asset ID:", assetId);
        
        let endpoint = '/anatomy/all';
        if (assetId) endpoint = `/anatomy/all?asset_3d_id=${assetId}`;
        
        const rawData: AnatomyItem[] = await apiCall(endpoint);
        
        // Récupérer aussi l'URL du GLB si on a un assetId
        if (assetId && !initialModelPath) {
            try {
                const assetInfo = await apiCall(`models-manager/${assetId}`);
                if (assetInfo.url_glb) {
                    finalModelPath = assetInfo.url_glb;
                    // Si l'URL est relative (contient Assets_3D), on passe par notre route de secours
                    if (finalModelPath.includes('Assets_3D/')) {
                        const filename = finalModelPath.split('/').pop();
                        finalModelPath = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/models-manager/files/${filename}`;
                    }
                }
            } catch(e) {
                console.warn("Impossible de récupérer les infos de l'asset, utilisation du défaut");
            }
        }

        if (!Array.isArray(rawData)) {
            console.error("Format de données invalide reçu de l'API (attendu: Array):", rawData);
            throw new Error("L'API n'a pas renvoyé l'atlas complet.");
        }

        console.log(`Données API reçues : ${rawData.length} entrées`);
        cleanedData = rawData;
      }

      setAnatomicalData(cleanedData);

      // Load GLB model
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(finalModelPath, resolve, undefined, reject);
      });
      const model = gltf.scene;
      modelRef.current = model;
      console.log("Modèle GLB chargé");

      // Process meshes
      const newNameToMeshMap = new Map<string, ExtendedMesh>();
      let meshCount = 0;
      
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
          const extendedChild = child as ExtendedMesh;
          
          // Apply visible material
          extendedChild.material = new THREE.MeshStandardMaterial({
            color: 0xECE2D0,
            roughness: 0.4,
            metalness: 0.1,
            emissive: 0x000000
          });
          extendedChild.castShadow = true;
          
          const info = cleanedData.find(item => item.three_js_name === child.name);
          if (info) extendedChild.userData.info = info;
          newNameToMeshMap.set(child.name, extendedChild);
        }
      });
      
      console.log(`${meshCount} meshs traités, ${newNameToMeshMap.size} dans la Map`);
      setNameToMeshMap(newNameToMeshMap);

      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.6 / maxDim;
      model.scale.set(scale, scale, scale);
      
      if (sceneRef.current) {
        sceneRef.current.add(model);
      }
      console.log(`Échelle appliquée : ${scale.toFixed(2)}`);

      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.2, 0);
        controlsRef.current.update();
      }

      // Generate hierarchy menu
      if (hierarchyRootRef.current) {
        hierarchyRootRef.current.innerHTML = '';
        const roots = cleanedData.filter(item => !item.parent_id || item.parent_id === 0);
        console.log(`Trouvé ${roots.length} racines pour la hiérarchie`);
        if (roots.length === 0) console.warn("Aucune racine trouvée");
        if (hierarchyRootRef.current) {
          const ul = document.createElement('ul');
          hierarchyRootRef.current.appendChild(ul);
          roots.forEach(root => {
            console.log(`Rendu de la racine: ${root.name} (id: ${root.id})`);
            renderTreeNode(root, ul, new Set(), cleanedData);
          });
        }
      }

      if (descContainerRef.current) {
        descContainerRef.current.innerHTML = "Cliquez sur un os pour voir sa description.";
      }

    } catch (err: any) {
      console.error("ERREUR FATALE :", err);
      setError(err.message);
      if (descContainerRef.current) {
        descContainerRef.current.innerHTML = `<span style="color:#ff8888">Erreur : ${err.message}</span>`;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle window resize
  const handleResize = () => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    rendererRef.current.setSize(width, height);
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
  };

  // Handle mouse move
  const handleMouseMove = (event: MouseEvent) => {
    if (!modelRef.current || !rendererRef.current || !cameraRef.current || !labelRef.current) return;
    
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    labelRef.current.style.left = (event.clientX + 15) + 'px';
    labelRef.current.style.top = (event.clientY + 15) + 'px';
    
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
    
    if (intersects.length > 0) {
      const obj = intersects[0].object as ExtendedMesh;
      if (obj.visible) {
        labelRef.current.style.display = 'block';
        const info = obj.userData.info;
        const labelSpan = labelRef.current.querySelector('span');
        if (labelSpan) {
          labelSpan.textContent = info ? (info.name || obj.name) : obj.name;
        }
        document.body.style.cursor = 'pointer';
      } else {
        labelRef.current.style.display = 'none';
        document.body.style.cursor = 'default';
      }
    } else {
      labelRef.current.style.display = 'none';
      document.body.style.cursor = 'default';
    }
  };

  // Handle click
  const handleClick = (event: MouseEvent) => {
    if (!modelRef.current || !rendererRef.current || !cameraRef.current) return;
    
    if (event.target instanceof Element && (
      event.target.closest('#hierarchy-root') || 
      event.target.closest('#description-panel')
    )) return;
    
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
    
    if (intersects.length > 0) {
      const obj = intersects[0].object as ExtendedMesh;
      const info = obj.userData.info;
      
      if (info && obj.visible) {
        const rows = document.querySelectorAll('.item-row');
        let matchedRow: Element | null = null;
        
        for (const row of Array.from(rows)) {
          const spanElem = row.querySelector('span:last-child');
          if (spanElem && spanElem.textContent === info.name) {
            matchedRow = row;
            break;
          }
        }
        
        deselectCurrent();
        setLastSelectedObject(obj);
        if (obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.emissive.setHex(0x112244);
        }
        
        if (matchedRow) {
          matchedRow.classList.add('selected-item');
          matchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        updateDescriptionPanel(info, obj.name);
      } else if (obj.visible && !info) {
        updateDescriptionPanel(null, obj.name);
        if (descContainerRef.current) {
          descContainerRef.current.innerHTML = `<strong>${obj.name}</strong><br><br><em>Pas de description dans le JSON.</em>`;
        }
      }
    } else {
      deselectCurrent();
    }
  };

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    if (rendererRef.current && sceneRef.current && cameraRef.current && modelRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  useEffect(() => {
    initScene();
    animate();

    const container = containerRef.current;
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Load data once when component mounts
  useEffect(() => {
    // Use setTimeout to defer setState calls and avoid cascading renders
    setTimeout(() => {
      loadData();
    }, 0);
  }, []);

  return (
    <div className="anatomy-viewer">
      {/* Left Panel - Hierarchy */}
      <div className="hierarchy-panel">
        <div className="hierarchy-header">
          <h3>Hiérarchie Anatomique</h3>
        </div>
        <div 
          ref={hierarchyRootRef}
          id="hierarchy-root" 
        />
      </div>
      
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        id="canvas-container" 
      />
      
      {/* Hover Label */}
      <div 
        ref={labelRef}
        id="label" 
      >
        <span></span>
      </div>
      
      {/* Right Panel - Description */}
      <div 
        id="description-panel"
        className="description-panel"
      >
        <div className="description-header">
          <h3>Description</h3>
        </div>
        <div 
          ref={descContainerRef}
          id="desc-text" 
        >
          {isLoading ? 'Chargement...' : error ? `Erreur: ${error}` : 'Cliquez sur un os pour voir sa description.'}
        </div>
      </div>
    </div>
  );
};

export default AnatomyViewer;
