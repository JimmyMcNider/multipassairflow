import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function StreamlineViewer({ filterKey, width = 400, height = 300 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameId = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load GLB streamlines
    const loader = new GLTFLoader();
    const modelPath = `/cfd-data/${filterKey}/streamlines.glb`;
    
    loader.load(
      modelPath,
      (gltf) => {
        const streamlines = gltf.scene;
        
        // Apply material to streamlines
        streamlines.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshLambertMaterial({
              color: filterKey.startsWith('ViSTAT') ? 0x00ff00 : 0x0066cc,
              transparent: true,
              opacity: 0.8
            });
            child.castShadow = true;
          }
        });

        // Scale and position the model
        streamlines.scale.setScalar(0.01); // Adjust based on your model scale
        streamlines.position.set(0, 0, 0);
        scene.add(streamlines);
      },
      (progress) => {
        console.log('Loading progress:', progress);
      },
      (error) => {
        console.error('Error loading GLB:', error);
        // Fallback: create simple geometry
        createFallbackStreamlines(scene, filterKey);
      }
    );

    // Mouse controls
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      targetRotationX = mouseY * 0.5;
      targetRotationY = mouseX * 0.5;
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      frameId.current = requestAnimationFrame(animate);

      // Smooth camera rotation
      camera.position.x += (targetRotationY * 5 - camera.position.x) * 0.05;
      camera.position.y += (targetRotationX * 5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [filterKey, width, height]);

  // Fallback streamlines if GLB doesn't load
  const createFallbackStreamlines = (scene, filterKey) => {
    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(-1, 0.5, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, -0.5, 0),
        new THREE.Vector3(2, 0, 0)
      ]),
      20,
      0.05,
      8,
      false
    );

    const material = new THREE.MeshLambertMaterial({
      color: filterKey.startsWith('ViSTAT') ? 0x00ff00 : 0x0066cc,
      transparent: true,
      opacity: 0.8
    });

    const streamline = new THREE.Mesh(geometry, material);
    scene.add(streamline);

    // Add multiple streamlines
    for (let i = 0; i < 5; i++) {
      const clonedStreamline = streamline.clone();
      clonedStreamline.position.y = (i - 2) * 0.3;
      clonedStreamline.position.z = (i - 2) * 0.2;
      scene.add(clonedStreamline);
    }
  };

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden'
      }} 
    />
  );
}