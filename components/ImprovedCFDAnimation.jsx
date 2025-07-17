import { useEffect, useRef, useState } from 'react';
import { cfdLoader } from '../utils/cfdLoader.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function ImprovedCFDAnimation({ 
  filterKey, 
  params, 
  scenario = 'single',
  width = 420,
  height = 320 
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [velocityData, setVelocityData] = useState(null);
  const [particles, setParticles] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);

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
    setParticles([]);
    spawnTimerRef.current = 0;
  }, [velocityData]);

  const createParticle = (yPosition) => {
    return {
      id: Math.random(),
      x: -10, // Start off-screen left
      y: yPosition,
      vx: 0,
      vy: 0,
      type: Math.random() < 0.3 ? 'pathogen' : 'air',
      removed: false,
      age: 0,
      size: Math.random() < 0.3 ? 3 : 2
    };
  };

  // Main animation loop
  useEffect(() => {
    if (!velocityData || !canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    const animate = (currentTime) => {
      const deltaTime = Math.min(currentTime - lastTimeRef.current, 32); // Cap at ~30fps
      lastTimeRef.current = currentTime;

      if (deltaTime > 0) {
        updateAndRender(ctx, deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [velocityData, isPlaying, width, height, filterKey, params]);

  const updateAndRender = (ctx, deltaTime) => {
    // Clear canvas
    ctx.fillStyle = COLORS.BACKGROUND_WHITE;
    ctx.fillRect(0, 0, width, height);

    // Draw background flow field
    drawFlowField(ctx);

    // Filter position
    const filterX = width * 0.5;
    
    // Draw filter
    ctx.fillStyle = COLORS.BORDER_MEDIUM;
    ctx.fillRect(filterX - 4, 0, 8, height);
    
    // Filter label
    ctx.fillStyle = getFilterColor(filterKey);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(filterKey, filterX, 25);

    // Spawn new particles
    spawnTimerRef.current += deltaTime;
    if (spawnTimerRef.current > 150) { // Spawn every 150ms
      // Spawn particles at different heights
      for (let i = 0; i < 3; i++) {
        const yPos = (height / 4) + (i * height / 4) + (Math.random() - 0.5) * 30;
        setParticles(prev => [...prev, createParticle(yPos)]);
      }
      spawnTimerRef.current = 0;
    }

    // Update and draw particles
    setParticles(currentParticles => {
      const updatedParticles = currentParticles.map(particle => {
        // Base flow velocity (left to right)
        let baseVx = 2.5;
        let baseVy = 0;

        // Apply CFD velocity if available
        if (velocityData && !velocityData.synthetic) {
          const normalizedX = (particle.x + 50) / (width + 100); // Normalize to 0-1
          const normalizedY = particle.y / height;
          
          if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
            const [xmin, xmax, ymin, ymax] = velocityData.bounds;
            const worldX = xmin + normalizedX * (xmax - xmin);
            const worldY = ymin + normalizedY * (ymax - ymin);
            
            const [cfdVx, cfdVy] = cfdLoader.interpolateVelocity(velocityData, worldX, worldY);
            baseVx = cfdVx * 100; // Scale for visualization
            baseVy = cfdVy * 50;
          }
        }

        // Apply filter effects
        if (particle.x > filterX - 20 && particle.x < filterX + 20) {
          // Slow down at filter
          baseVx *= (1 - params.red);
          
          // Filter interaction for pathogens
          if (particle.type === 'pathogen' && !particle.removed) {
            if (Math.random() < params.removal / 100 * 0.1) {
              particle.removed = true;
              particle.x = filterX + (Math.random() - 0.5) * 10; // Stick to filter
              baseVx = 0;
              baseVy = 0;
            }
          }
        }

        // Update position
        const newX = particle.x + baseVx;
        const newY = particle.y + baseVy + (Math.random() - 0.5) * 0.5; // Small random movement

        return {
          ...particle,
          x: newX,
          y: Math.max(10, Math.min(height - 10, newY)),
          vx: baseVx,
          vy: baseVy,
          age: particle.age + deltaTime
        };
      }).filter(particle => particle.x < width + 50); // Remove particles that go off-screen

      // Limit particle count
      const maxParticles = 150;
      if (updatedParticles.length > maxParticles) {
        return updatedParticles.slice(-maxParticles);
      }
      return updatedParticles;
    });

    // Draw all particles
    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
      
      if (particle.removed) {
        ctx.fillStyle = filterKey.startsWith('ViSTAT') ? 
          COLORS.REMOVED_PARTICLE : 'rgba(255, 0, 0, 0.6)';
      } else {
        ctx.fillStyle = particle.type === 'pathogen' ? 
          COLORS.PATHOGEN_PARTICLE : COLORS.AIR_PARTICLE;
      }
      
      ctx.fill();
      
      // Add slight glow for pathogens
      if (particle.type === 'pathogen' && !particle.removed) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size + 1, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fill();
      }
    });

    // Draw flow indicators
    drawFlowIndicators(ctx, filterX);

    // Draw metrics
    const totalPathogens = particles.filter(p => p.type === 'pathogen').length;
    const removedPathogens = particles.filter(p => p.type === 'pathogen' && p.removed).length;
    const currentEfficiency = totalPathogens > 0 ? 
      ((removedPathogens / totalPathogens) * 100).toFixed(1) : '0.0';

    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Live Efficiency: ${currentEfficiency}%`, 10, height - 35);
    ctx.fillText(`Target: ${params.removal}%`, 10, height - 20);
    ctx.fillText(`Pressure Drop: ${(params.red * 100).toFixed(1)}%`, 10, height - 5);

    // Data source indicator
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(velocityData?.synthetic ? 'Synthetic CFD' : 'Real OpenFOAM', width - 10, height - 5);
  };

  const drawFlowField = (ctx) => {
    ctx.strokeStyle = 'rgba(0, 123, 204, 0.15)';
    ctx.lineWidth = 1;

    // Draw horizontal flow lines
    for (let i = 1; i < 6; i++) {
      const y = (height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw streamlines
    ctx.strokeStyle = 'rgba(0, 123, 204, 0.25)';
    ctx.lineWidth = 2;
    
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      const filterX = width * 0.5;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      
      // Curve slightly before filter
      ctx.quadraticCurveTo(filterX - 50, y + Math.sin(i) * 8, filterX, y);
      
      // Deflect after filter based on pressure drop
      const deflection = params.red * 20;
      ctx.quadraticCurveTo(filterX + 50, y + deflection, width, y + deflection * 0.5);
      
      ctx.stroke();
    }
  };

  const drawFlowIndicators = (ctx, filterX) => {
    // Flow direction arrows
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    
    // Before filter
    ctx.fillText('→', filterX - 100, 30);
    ctx.fillText('→', filterX - 150, height / 2);
    ctx.fillText('→', filterX - 100, height - 30);
    
    // After filter (smaller arrows showing reduced flow)
    const afterSize = 1 - params.red;
    ctx.save();
    ctx.scale(afterSize, 1);
    ctx.fillText('→', (filterX + 100) / afterSize, 30);
    ctx.fillText('→', (filterX + 150) / afterSize, height / 2);
    ctx.fillText('→', (filterX + 100) / afterSize, height - 30);
    ctx.restore();

    // Labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.textAlign = 'center';
    ctx.fillText('Inlet', 50, height - 10);
    ctx.fillText('Outlet', width - 50, height - 10);
  };

  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSimulation = () => {
    setParticles([]);
    spawnTimerRef.current = 0;
  };

  return (
    <div style={{ 
      border: '2px solid #ddd', 
      borderRadius: '12px', 
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: COLORS.BACKGROUND_LIGHT,
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h4 style={{ 
            margin: '0 0 5px 0', 
            fontSize: '14px',
            color: getFilterColor(filterKey),
            fontWeight: 'bold'
          }}>
            {filterKey} - CFD Flow Animation
          </h4>
          <div style={{ 
            fontSize: '12px', 
            color: COLORS.TEXT_SECONDARY
          }}>
            Enhanced with {velocityData?.synthetic ? 'Synthetic' : 'Real OpenFOAM'} CFD Data
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleAnimation}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: isPlaying ? COLORS.WARNING : COLORS.SUCCESS,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={resetSimulation}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: COLORS.PRIMARY_BLUE,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>
      
      <canvas 
        ref={canvasRef}
        style={{ 
          display: 'block', 
          width: '100%', 
          height: `${height}px`,
          cursor: 'pointer'
        }}
        onClick={toggleAnimation}
      />
      
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #eee',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        Watch organized airflow through filter • Red particles = pathogens • Blue particles = clean air
      </div>
    </div>
  );
}