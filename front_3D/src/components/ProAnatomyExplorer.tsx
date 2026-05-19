import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ProAnatomyObject, AnatomyDatabase } from '../types/anatomy';
import '../styles/pro-anatomy.css';

const ProAnatomyExplorer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [db, setDb] = useState<AnatomyDatabase | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);
  const dbRef = useRef<AnatomyDatabase>([]);

  const disposeThree = useCallback(() => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
            rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
    }
  }, []);

  const hierarchy = useMemo(() => {
    if (!db) return [];
    const roots: any[] = [];
    const map = new Map();
    db.forEach(item => map.set(item.id, { ...item, children: [] }));
    db.forEach(item => {
        if (item.parent_id && map.has(item.parent_id)) map.get(item.parent_id).children.push(map.get(item.id));
        else roots.push(map.get(item.id));
    });
    return roots;
  }, [db]);

  useEffect(() => {
    if (!containerRef.current) return;
    disposeThree();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 1, 9); // Recul studio
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0); // Regarder le centre
    controlsRef.current = controls;

    // Éclairage Ultra-Visible
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const l1 = new THREE.DirectionalLight(0xffffff, 2); // Puissance augmentée
    l1.position.set(2, 8, 10);
    scene.add(l1);
    const l2 = new THREE.DirectionalLight(0x00d2ff, 1);
    l2.position.set(-5, 0, 5);
    scene.add(l2);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const load = async () => {
        try {
            const dbRes = await fetch('/anatomy_database.json').then(r => r.json());
            const data = dbRes.data || dbRes;
            setDb(data);
            dbRef.current = data;

            const gltf = await new GLTFLoader().loadAsync('/Squelette_complet.glb');
            const model = gltf.scene;
            
            // CENTRAGE PAR PIVOT (Indestructible)
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const pivot = new THREE.Group();
            model.position.set(-center.x, -center.y, -center.z); // Compenser l'offset interne
            pivot.add(model);
            scene.add(pivot);
            pivotRef.current = pivot;

            const scale = 5.5 / Math.max(size.x, size.y, size.z);
            pivot.scale.set(scale, scale, scale);

            model.traverse(o => {
                if (o instanceof THREE.Mesh) {
                    o.material = new THREE.MeshStandardMaterial({ 
                        color: 0xECE2D0, 
                        roughness: 0.5,
                        emissive: new THREE.Color(0x000000)
                    });
                }
            });
            setIsLoading(false);
        } catch (e) { console.error(e); }
    };
    load();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const interact = (e: MouseEvent, click: boolean) => {
        if (!containerRef.current || !cameraRef.current || !pivotRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);
        const hits = raycaster.intersectObject(pivotRef.current, true);
        if (hits.length > 0) {
            const mesh = hits[0].object as THREE.Mesh;
            const obj = dbRef.current.find(d => d.three_js_name === mesh.name);
            if (click) {
                if (obj) setSelectedId(obj.id);
                pivotRef.current.traverse((c: any) => {
                    if (c.material && c.material.emissive) {
                        c.material.emissive.setHex(c === mesh ? 0x00d2ff : 0x000000);
                        c.material.emissiveIntensity = c === mesh ? 2 : 0;
                    }
                });
            } else if (tooltipRef.current) {
                document.body.style.cursor = 'pointer';
                tooltipRef.current.style.display = 'block';
                tooltipRef.current.style.left = (e.clientX + 15) + 'px';
                tooltipRef.current.style.top = (e.clientY + 15) + 'px';
                tooltipRef.current.textContent = obj ? obj.name : mesh.name;
            }
        } else if (!click) {
            document.body.style.cursor = 'auto';
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        }
    };

    const onMove = (e: MouseEvent) => interact(e, false);
    const onClick = (e: MouseEvent) => interact(e, true);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);

    return () => {
        disposeThree();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('click', onClick);
    };
  }, [disposeThree]);

  const renderNode = (n: any) => {
    const isEx = expandedNodes.has(n.id);
    const hasCh = n.children && n.children.length > 0;
    return (
      <div key={n.id} className="tree-item">
        <div className={`tree-row ${selectedId === n.id ? 'selected' : ''}`} onClick={() => setSelectedId(n.id)}>
          {hasCh && <span className={`toggle-icon ${isEx ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); const next = new Set(expandedNodes); if (next.has(n.id)) next.delete(n.id); else next.add(n.id); setExpandedNodes(next); }}>▶</span>}
          {!hasCh && <span className="toggle-placeholder"></span>}
          <span className="node-name">{n.name}</span>
        </div>
        {isEx && hasCh && <div className="tree-children">{n.children.slice(0, 40).map((c: any) => renderNode(c))}</div>}
      </div>
    );
  };

  const selObj = useMemo(() => db?.find(o => o.id === selectedId), [db, selectedId]);

  return (
    <div className="pro-anatomy-container">
      <div id="anatomy-tooltip" ref={tooltipRef} className="anatomy-tooltip" style={{display: 'none'}}></div>
      <aside className="anatomy-sidebar">
        <div className="sidebar-header"><h3>Atlas Squelettique</h3></div>
        <div className="tree-container">{hierarchy.slice(0, 100).map(r => renderNode(r))}</div>
      </aside>
      <main ref={containerRef} className="viewport-container" style={{background: 'radial-gradient(circle at center, #1e293b 0%, #05070a 100%)'}}>
        {isLoading && <div className="loading" style={{color: 'white'}}>PREPARATION...</div>}
      </main>
      <aside className="anatomy-sidebar anatomy-sidebar-right">
        <div className="sidebar-header"><h3>Infos Wikipedia</h3></div>
        <div className="info-content">
          {selObj ? (
            <div className="fade-in">
              <h1 className="info-title">{selObj.name}</h1>
              <p className="info-desc" style={{lineHeight: '1.6', fontSize: '0.95rem'}}>{selObj.description}</p>
            </div>
          ) : <div className="empty-info"><p>Cliquez pour explorer.</p></div>}
        </div>
      </aside>
    </div>
  );
};

export default ProAnatomyExplorer;
