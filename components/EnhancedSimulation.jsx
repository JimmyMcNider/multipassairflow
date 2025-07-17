import { useEffect, useRef, useState } from 'react';
import { cfdLoader } from '../utils/cfdLoader.js';
import StreamlineViewer from './StreamlineViewer.jsx';

export default function EnhancedSimulation({ 
  filterKey, 
  params, 
  passes, 
  scenario,
  width = 400,
  height = 300 
}) {
  const canvasRef = useRef(null);
  const [velocityData, setVelocityData] = useState(null);
  const [viewMode, setViewMode] = useState('2d'); // '2d', '3d', 'split'
  const [particles, setParticles] = useState([]);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Load CFD data
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
  }, [velocityData, scenario]);

  const createParticle = (velData, scenario) => {
    const [xmin, xmax, ymin, ymax] = velData.bounds;
    
    if (scenario === 'single') {
      // Spawn at inlet
      return {
        id: Math.random(),
        type: Math.random() < 0.8 ? 'air' : 'pathogen',
        x: xmin,
        y: ymin + Math.random() * (ymax - ymin),
        vx: 0,
        vy: 0,
        age: 0,
        removed: false,
        color: Math.random() < 0.8 ? 'rgba(0,150,255,0.6)' : 'red'
      };
    } else {
      // Distribute throughout domain
      return {
        id: Math.random(),
        type: Math.random() < 0.7 ? 'air' : 'pathogen',
        x: xmin + Math.random() * (xmax - xmin),
        y: ymin + Math.random() * (ymax - ymin),
        vx: 0,
        vy: 0,
        age: 0,
        removed: false,
        color: Math.random() < 0.7 ? 'rgba(0,150,255,0.6)' : 'red'
      };
    }
  };

  // Animation loop
  useEffect(() => {
    if (!velocityData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const animate = (time) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (deltaTime > 0) {
        updateParticles(deltaTime);
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
  }, [velocityData, particles, width, height]);

  const updateParticles = (deltaTime) => {
    if (!velocityData) return;

    const dt = deltaTime * 0.001; // Convert to seconds
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;

    setParticles(currentParticles => {
      const updatedParticles = currentParticles.map(particle => {
        // Get velocity from CFD field
        const [vx, vy] = cfdLoader.interpolateVelocity(
          velocityData, 
          particle.x, 
          particle.y
        );

        // Add some randomness for turbulence
        const turbulence = 0.1;
        const randomVx = vx + (Math.random() - 0.5) * turbulence;
        const randomVy = vy + (Math.random() - 0.5) * turbulence;

        // Update position
        const newX = particle.x + randomVx * dt * 0.1; // Scale factor for visualization
        const newY = particle.y + randomVy * dt * 0.1;

        // Handle boundaries
        let finalX = newX;
        let finalY = newY;
        let shouldRemove = false;

        if (scenario === 'single') {
          // Single-pass: remove particles that exit
          if (newX > xmax) {
            shouldRemove = true;
          }
          // Respawn at inlet if needed
          if (newX < xmin) {
            finalX = xmin;
          }
        } else {
          // Multi-pass: wrap around boundaries
          if (newX < xmin) finalX = xmax;
          if (newX > xmax) finalX = xmin;
        }

        // Clamp Y boundaries
        if (newY < ymin) finalY = ymin;
        if (newY > ymax) finalY = ymax;

        // Filter removal logic
        const filterPosition = (xmin + xmax) / 2;
        let isRemoved = particle.removed;
        
        if (particle.type === 'pathogen' && 
            !isRemoved && 
            particle.x < filterPosition && 
            finalX >= filterPosition) {
          // Particle is crossing the filter
          const removalChance = params.removal / 100;
          if (Math.random() < removalChance) {
            isRemoved = true;
          }
        }

        return {
          ...particle,
          x: shouldRemove ? xmin : finalX,
          y: shouldRemove ? ymin + Math.random() * (ymax - ymin) : finalY,
          vx: randomVx,
          vy: randomVy,
          age: particle.age + dt,
          removed: isRemoved,
          color: isRemoved && filterKey.startsWith('ViSTAT') ? 'gray' : particle.color
        };
      });

      // Add new particles periodically for single-pass
      if (scenario === 'single' && Math.random() < 0.1) {
        const newParticle = createParticle(velocityData, scenario);
        updatedParticles.push(newParticle);
      }

      // Limit particle count
      const maxParticles = scenario === 'multi' ? 300 : 500;
      if (updatedParticles.length > maxParticles) {
        return updatedParticles.slice(-maxParticles);
      }

      return updatedParticles;
    });
  };

  const renderParticles = (ctx) => {
    if (!velocityData) return;

    const canvas = ctx.canvas;
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background flow field (optional)
    if (velocityData.synthetic) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw filter position
    const filterX = canvas.width / 2;
    ctx.fillStyle = '#888';
    ctx.fillRect(filterX - 2, 0, 4, canvas.height);

    // Draw particles
    particles.forEach(particle => {
      // Convert from CFD coordinates to canvas coordinates
      const canvasX = ((particle.x - xmin) / (xmax - xmin)) * canvas.width;
      const canvasY = ((particle.y - ymin) / (ymax - ymin)) * canvas.height;

      ctx.beginPath();
      ctx.arc(canvasX, canvasY, particle.type === 'air' ? 2 : 3, 0, 2 * Math.PI);
      ctx.fillStyle = particle.color;
      ctx.fill();
    });

    // Draw metrics
    const pathogenCount = particles.filter(p => p.type === 'pathogen').length;
    const removedCount = particles.filter(p => p.type === 'pathogen' && p.removed).length;
    const removalPercent = pathogenCount > 0 ? (removedCount / pathogenCount * 100).toFixed(1) : '0.0';

    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Filter: ${filterKey}`, 10, 20);
    ctx.fillText(`Removal Efficiency: ${params.removal}%`, 10, 35);
    ctx.fillText(`Current Removal: ${removalPercent}%`, 10, 50);
    ctx.fillText(`Pressure Drop: ${(params.red * 100).toFixed(1)}%`, 10, 65);
    
    if (velocityData.synthetic) {
      ctx.fillText('(Using synthetic CFD data)', 10, canvas.height - 10);
    }
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
          padding: '2px 8px',
          backgroundColor: viewMode === 'split' ? '#007acc' : '#f0f0f0',
          color: viewMode === 'split' ? 'white' : 'black',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      >
        Split View
      </button>
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