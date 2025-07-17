import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { cfdLoader } from '../utils/cfdLoader.js';

export default function CFDStreamlineAnimation({ 
  filterKey, 
  params, 
  scenario,
  width = 400,
  height = 300 
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameId = useRef(null);
  const [velocityData, setVelocityData] = useState(null);
  const [streamlineGeometry, setStreamlineGeometry] = useState(null);
  const [animationParticles, setAnimationParticles] = useState([]);

  // Load CFD data and streamlines
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await cfdLoader.loadVelocityField(filterKey);
        setVelocityData(data);
      } catch (error) {
        console.error('Failed to load CFD data:', error);
      }
    };
    loadData();
  }, [filterKey]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup - side view for left-to-right flow
    const camera = new THREE.OrthographicCamera(
      -2, 2, 1, -1, 0.1, 1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0xf8f9fa, 1);
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 5);
    scene.add(directionalLight);

    // Add filter plane
    const filterGeometry = new THREE.PlaneGeometry(0.05, 2);
    const filterMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x666666,
      transparent: true,
      opacity: 0.7
    });
    const filterMesh = new THREE.Mesh(filterGeometry, filterMaterial);
    filterMesh.position.set(0, 0, 0);
    scene.add(filterMesh);

    // Load GLB streamlines if available
    const loader = new GLTFLoader();
    const modelPath = `/cfd-data/${filterKey}/streamlines.glb`;
    
    loader.load(
      modelPath,
      (gltf) => {
        const streamlines = gltf.scene;
        
        // Scale and position to fit our coordinate system
        streamlines.scale.setScalar(0.01);
        streamlines.position.set(0, 0, -0.5);
        
        // Apply materials
        streamlines.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshLambertMaterial({
              color: filterKey.startsWith('ViSTAT') ? 0x00cc00 : 0x0066cc,
              transparent: true,
              opacity: 0.3
            });
          }
        });

        scene.add(streamlines);
        setStreamlineGeometry(streamlines);
      },
      undefined,
      (error) => {
        console.log('GLB not available, creating simplified streamlines');
        createSimplifiedStreamlines(scene, filterKey);
      }
    );

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

  // Create simplified streamlines if GLB not available
  const createSimplifiedStreamlines = (scene, filterKey) => {
    const streamlineGroup = new THREE.Group();
    
    // Create multiple streamlines flowing left to right
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * 0.3;
      
      // Before filter - straight flow
      const beforeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, y, 0),
        new THREE.Vector3(-0.5, y, 0),
        new THREE.Vector3(-0.1, y, 0)
      ]);
      
      // After filter - slightly disturbed flow
      const afterCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.1, y, 0),
        new THREE.Vector3(0.5, y + (Math.random() - 0.5) * 0.1, 0),
        new THREE.Vector3(2, y, 0)
      ]);

      // Create tube geometries
      const beforeGeometry = new THREE.TubeGeometry(beforeCurve, 20, 0.02, 8, false);
      const afterGeometry = new THREE.TubeGeometry(afterCurve, 20, 0.015, 8, false);

      const streamlineMaterial = new THREE.MeshLambertMaterial({
        color: filterKey.startsWith('ViSTAT') ? 0x00cc00 : 0x0066cc,
        transparent: true,
        opacity: 0.6
      });

      const beforeMesh = new THREE.Mesh(beforeGeometry, streamlineMaterial);
      const afterMesh = new THREE.Mesh(afterGeometry, streamlineMaterial.clone());
      
      // Make after-filter flow slightly dimmer to show energy loss
      afterMesh.material.opacity = 0.4;

      streamlineGroup.add(beforeMesh);
      streamlineGroup.add(afterMesh);
    }

    scene.add(streamlineGroup);
    setStreamlineGeometry(streamlineGroup);
  };

  // Create animated particles that follow streamlines
  useEffect(() => {
    if (!velocityData) return;

    const particles = [];
    const particleCount = scenario === 'single' ? 20 : 15;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        position: new THREE.Vector3(-2, (Math.random() - 0.5) * 1.8, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        type: Math.random() < 0.2 ? 'pathogen' : 'air',
        age: Math.random() * 1000,
        removed: false,
        size: Math.random() < 0.2 ? 0.04 : 0.02
      });
    }

    setAnimationParticles(particles);
  }, [velocityData, scenario]);

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // Create particle meshes
    const particleMeshes = [];
    const particleGeometry = new THREE.SphereGeometry(1, 8, 6);

    animationParticles.forEach((particle, index) => {
      const material = new THREE.MeshLambertMaterial({
        color: particle.type === 'pathogen' ? 0xff0000 : 0x0088ff,
        transparent: true,
        opacity: 0.8
      });

      const mesh = new THREE.Mesh(particleGeometry, material);
      mesh.scale.setScalar(particle.size);
      mesh.position.copy(particle.position);
      scene.add(mesh);
      particleMeshes.push(mesh);
    });

    const animate = (time) => {
      frameId.current = requestAnimationFrame(animate);

      // Update particles
      animationParticles.forEach((particle, index) => {
        const mesh = particleMeshes[index];
        if (!mesh) return;

        // Get velocity based on position
        let vx = 0.8; // Base flow velocity left to right
        let vy = 0;

        if (velocityData && !velocityData.synthetic) {
          // Use real CFD data if available
          const worldX = (particle.position.x + 2) / 4; // Convert to 0-1 range
          const worldY = (particle.position.y + 1) / 2;
          const [cfdVx, cfdVy] = cfdLoader.interpolateVelocity(velocityData, worldX, worldY);
          vx = cfdVx * 2; // Scale for visualization
          vy = cfdVy * 2;
        } else {
          // Simplified flow model
          // Slow down after filter
          if (particle.position.x > 0) {
            vx *= (1 - params.red); // Apply pressure drop
          }
          
          // Add some vertical movement
          vy = Math.sin(time * 0.001 + particle.id) * 0.1;
        }

        // Update position
        particle.position.x += vx * 0.016; // ~60fps
        particle.position.y += vy * 0.016;
        particle.age += 16;

        // Filter interaction
        if (particle.type === 'pathogen' && 
            particle.position.x > -0.1 && 
            particle.position.x < 0.1 && 
            !particle.removed) {
          
          if (Math.random() < params.removal / 100 * 0.1) {
            particle.removed = true;
            mesh.material.color.setHex(filterKey.startsWith('ViSTAT') ? 0x888888 : 0xff4444);
            mesh.material.opacity = 0.5;
            // Stop the particle at the filter
            particle.position.x = -0.05 + Math.random() * 0.1;
            vx = 0;
            vy = 0;
          }
        }

        // Reset particles that exit the right side
        if (particle.position.x > 2.5) {
          particle.position.x = -2;
          particle.position.y = (Math.random() - 0.5) * 1.8;
          particle.removed = false;
          particle.age = 0;
          mesh.material.color.setHex(particle.type === 'pathogen' ? 0xff0000 : 0x0088ff);
          mesh.material.opacity = 0.8;
        }

        // Boundary constraints
        if (particle.position.y > 1) particle.position.y = 1;
        if (particle.position.y < -1) particle.position.y = -1;

        // Update mesh position
        mesh.position.copy(particle.position);
      });

      renderer.render(scene, camera);
    };

    animate(0);

    return () => {
      // Clean up particle meshes
      particleMeshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      });
    };
  }, [animationParticles, velocityData, params, filterKey]);

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      overflow: 'hidden',
      backgroundColor: 'white'
    }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #ddd'
      }}>
        <h4 style={{ 
          margin: '0 0 5px 0', 
          fontSize: '14px',
          color: '#333'
        }}>
          {filterKey} - CFD Streamline Animation
        </h4>
        <div style={{ 
          fontSize: '12px', 
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Removal: {params.removal}%</span>
          <span>Pressure Drop: {(params.red * 100).toFixed(1)}%</span>
          <span>{velocityData?.synthetic ? 'Synthetic' : 'Real CFD'}</span>
        </div>
      </div>
      
      <div 
        ref={mountRef} 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          position: 'relative'
        }} 
      />

      {/* Flow direction indicators */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '10px',
        fontSize: '12px',
        color: '#666',
        pointerEvents: 'none'
      }}>
        Inlet →
      </div>
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '10px',
        fontSize: '12px',
        color: '#666',
        pointerEvents: 'none'
      }}>
        → Outlet
      </div>
    </div>
  );
}