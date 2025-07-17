import { useEffect, useRef, useState } from 'react';
import { cfdLoader } from '../utils/cfdLoader.js';
import StreamlineViewer from './StreamlineViewer.jsx';

export default function PerformantSimulation({ 
  filterKey, 
  params, 
  passes, 
  scenario,
  width = 400,
  height = 300,
  useWebWorker = true
}) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const [velocityData, setVelocityData] = useState(null);
  const [viewMode, setViewMode] = useState('2d');
  const [particles, setParticles] = useState([]);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const performanceMetrics = useRef({
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0
  });

  // Initialize Web Worker
  useEffect(() => {
    if (!useWebWorker) return;

    try {
      const worker = new Worker('/particle-worker.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'particlesUpdated') {
          setParticles(data);
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setIsWorkerReady(false);
      };

      setIsWorkerReady(true);

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.warn('Web Worker not available, falling back to main thread:', error);
      setIsWorkerReady(false);
    }
  }, [useWebWorker]);

  // Load CFD data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await cfdLoader.loadVelocityField(filterKey);
        setVelocityData(data);
        
        // Send data to worker
        if (workerRef.current && isWorkerReady) {
          workerRef.current.postMessage({
            type: 'setVelocityData',
            data: data
          });
        }
      } catch (error) {
        console.error('Failed to load CFD data:', error);
      }
    };
    loadData();
  }, [filterKey, isWorkerReady]);

  // Update worker parameters
  useEffect(() => {
    if (workerRef.current && isWorkerReady && velocityData) {
      workerRef.current.postMessage({
        type: 'setParameters',
        data: {
          ...params,
          scenario,
          removalEfficiency: params.removal
        }
      });
    }
  }, [params, scenario, isWorkerReady, velocityData]);

  // Initialize particles
  useEffect(() => {
    if (!velocityData) return;

    const initialParticles = [];
    const particleCount = scenario === 'multi' ? 200 : 100;

    for (let i = 0; i < particleCount; i++) {
      const particle = createParticle(velocityData, scenario);
      initialParticles.push(particle);
    }

    setParticles(initialParticles);
    
    // Send to worker
    if (workerRef.current && isWorkerReady) {
      workerRef.current.postMessage({
        type: 'setParticles',
        data: initialParticles
      });
    }
  }, [velocityData, scenario, isWorkerReady]);

  const createParticle = (velData, scenario) => {
    const [xmin, xmax, ymin, ymax] = velData.bounds;
    
    if (scenario === 'single') {
      return {
        id: Math.random(),
        type: Math.random() < 0.8 ? 'air' : 'pathogen',
        x: xmin,
        y: ymin + Math.random() * (ymax - ymin),
        vx: 0,
        vy: 0,
        age: 0,
        removed: false,
        color: Math.random() < 0.8 ? 'rgba(0,150,255,0.6)' : 'red',
        scenario
      };
    } else {
      return {
        id: Math.random(),
        type: Math.random() < 0.7 ? 'air' : 'pathogen',
        x: xmin + Math.random() * (xmax - xmin),
        y: ymin + Math.random() * (ymax - ymin),
        vx: 0,
        vy: 0,
        age: 0,
        removed: false,
        color: Math.random() < 0.7 ? 'rgba(0,150,255,0.6)' : 'red',
        scenario
      };
    }
  };

  // Animation loop
  useEffect(() => {
    if (!velocityData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;

    const animate = (time) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Update performance metrics
      performanceMetrics.current.frameCount++;
      if (time - performanceMetrics.current.lastFpsUpdate > 1000) {
        performanceMetrics.current.fps = performanceMetrics.current.frameCount;
        performanceMetrics.current.frameCount = 0;
        performanceMetrics.current.lastFpsUpdate = time;
      }

      if (deltaTime > 0) {
        if (useWebWorker && workerRef.current && isWorkerReady) {
          // Use Web Worker for particle updates
          workerRef.current.postMessage({
            type: 'updateParticles',
            data: { deltaTime }
          });
        } else {
          // Fallback to main thread
          updateParticlesMainThread(deltaTime);
        }
        
        renderParticles(ctx);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [velocityData, width, height, useWebWorker, isWorkerReady]);

  const updateParticlesMainThread = (deltaTime) => {
    // Simplified main thread particle update (fallback)
    if (!velocityData) return;

    const dt = deltaTime * 0.001;
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;

    setParticles(currentParticles => {
      return currentParticles.map(particle => {
        const [vx, vy] = cfdLoader.interpolateVelocity(
          velocityData, 
          particle.x, 
          particle.y
        );

        const newX = particle.x + vx * dt * 0.1;
        const newY = particle.y + vy * dt * 0.1;

        let finalX = newX;
        let finalY = newY;

        if (scenario === 'single') {
          if (newX > xmax) finalX = xmin;
          if (newX < xmin) finalX = xmin;
        } else {
          if (newX < xmin) finalX = xmax;
          if (newX > xmax) finalX = xmin;
        }

        if (newY < ymin) finalY = ymin;
        if (newY > ymax) finalY = ymax;

        return {
          ...particle,
          x: finalX,
          y: finalY,
          vx,
          vy,
          age: particle.age + dt
        };
      });
    });
  };

  const renderParticles = (ctx) => {
    if (!velocityData) return;

    const canvas = ctx.canvas;
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;

    // Clear with slight transparency for trails effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = 'rgba(240, 240, 240, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw filter position
    const filterX = canvas.width / 2;
    ctx.fillStyle = '#888';
    ctx.fillRect(filterX - 2, 0, 4, canvas.height);

    // Draw particles
    particles.forEach(particle => {
      const canvasX = ((particle.x - xmin) / (xmax - xmin)) * canvas.width;
      const canvasY = ((particle.y - ymin) / (ymax - ymin)) * canvas.height;

      ctx.beginPath();
      ctx.arc(canvasX, canvasY, particle.type === 'air' ? 2 : 3, 0, 2 * Math.PI);
      
      // Dynamic color based on removal status
      if (particle.type === 'pathogen' && particle.removed) {
        ctx.fillStyle = filterKey.startsWith('ViSTAT') ? 'rgba(128, 128, 128, 0.7)' : 'rgba(255, 0, 0, 0.3)';
      } else {
        ctx.fillStyle = particle.color || (particle.type === 'air' ? 'rgba(0,150,255,0.6)' : 'red');
      }
      
      ctx.fill();
    });

    // Performance metrics and info
    ctx.fillStyle = '#000';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Filter: ${filterKey}`, 10, 15);
    ctx.fillText(`Particles: ${particles.length}`, 10, 30);
    ctx.fillText(`FPS: ${performanceMetrics.current.fps}`, 10, 45);
    
    if (useWebWorker && isWorkerReady) {
      ctx.fillText('Web Worker: Active', 10, 60);
    } else {
      ctx.fillText('Main Thread', 10, 60);
    }
    
    if (velocityData?.synthetic) {
      ctx.fillText('(Synthetic CFD)', 10, canvas.height - 10);
    }

    // Removal efficiency
    const pathogenCount = particles.filter(p => p.type === 'pathogen').length;
    const removedCount = particles.filter(p => p.type === 'pathogen' && p.removed).length;
    const efficiency = pathogenCount > 0 ? (removedCount / pathogenCount * 100).toFixed(1) : '0.0';
    ctx.fillText(`Efficiency: ${efficiency}%`, canvas.width - 100, 15);
  };

  const renderModeButtons = () => (
    <div style={{ padding: '5px', borderBottom: '1px solid #ccc' }}>
      <button 
        onClick={() => setViewMode('2d')}
        style={{ 
          marginRight: '5px', 
          padding: '2px 8px',
          backgroundColor: viewMode === '2d' ? '#007acc' : '#f0f0f0',
          color: viewMode === '2d' ? 'white' : 'black',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      >
        2D Flow
      </button>
      <button 
        onClick={() => setViewMode('3d')}
        style={{ 
          marginRight: '5px', 
          padding: '2px 8px',
          backgroundColor: viewMode === '3d' ? '#007acc' : '#f0f0f0',
          color: viewMode === '3d' ? 'white' : 'black',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      >
        3D Streamlines
      </button>
      <button 
        onClick={() => setViewMode('split')}
        style={{ 
          marginRight: '5px', 
          padding: '2px 8px',
          backgroundColor: viewMode === 'split' ? '#007acc' : '#f0f0f0',
          color: viewMode === 'split' ? 'white' : 'black',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      >
        Split
      </button>
      <span style={{ 
        fontSize: '10px', 
        color: useWebWorker && isWorkerReady ? '#28a745' : '#dc3545',
        marginLeft: '10px'
      }}>
        {useWebWorker && isWorkerReady ? '⚡ Optimized' : '⚠ Fallback'}
      </span>
    </div>
  );

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '4px', 
      overflow: 'hidden',
      width: `${width}px`,
      backgroundColor: 'white'
    }}>
      <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
          {filterKey} ({scenario === 'single' ? 'Single-Pass' : 'Multi-Pass'})
        </h3>
        {renderModeButtons()}
      </div>

      <div style={{ height: `${height}px` }}>
        {viewMode === '2d' && (
          <canvas 
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        )}
        
        {viewMode === '3d' && (
          <StreamlineViewer 
            filterKey={filterKey} 
            width={width} 
            height={height}
          />
        )}
        
        {viewMode === 'split' && (
          <div style={{ display: 'flex', height: '100%' }}>
            <canvas 
              ref={canvasRef}
              style={{ display: 'block', width: '50%', height: '100%' }}
            />
            <StreamlineViewer 
              filterKey={filterKey} 
              width={width / 2} 
              height={height}
            />
          </div>
        )}
      </div>
    </div>
  );
}