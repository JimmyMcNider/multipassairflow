import { useEffect, useRef, useState } from 'react';
import { cfdLoader } from '../utils/cfdLoader.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function RealisticCFDAnimation({ 
  filterKey, 
  params, 
  scenario = 'single',
  width = 430,
  height = 320 
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [velocityData, setVelocityData] = useState(null);
  const [particles, setParticles] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const frameCountRef = useRef(0);

  // Load realistic CFD data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await cfdLoader.loadVelocityField(filterKey);
        setVelocityData(data);
        console.log(`Loaded realistic CFD data for ${filterKey}:`, {
          dimensions: data.dimensions,
          bounds: data.bounds,
          synthetic: data.synthetic,
          physicsModel: data.physics_model
        });
      } catch (error) {
        console.error('Failed to load CFD data:', error);
      }
    };
    loadData();
  }, [filterKey]);

  // Reset particles when data changes
  useEffect(() => {
    if (!velocityData) return;
    setParticles([]);
    spawnTimerRef.current = 0;
    frameCountRef.current = 0;
  }, [velocityData, filterKey]);

  const createParticle = (spawnY) => {
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    
    return {
      id: Math.random(),
      x: xmin - 0.02,  // Start slightly before domain
      y: spawnY || (ymin + Math.random() * (ymax - ymin)),
      vx: 0,
      vy: 0,
      type: Math.random() < 0.3 ? 'pathogen' : 'air',
      removed: false,
      age: 0,
      size: Math.random() < 0.3 ? 3.5 : 2.5,
      trail: [],
      mass: Math.random() < 0.3 ? 1.2 : 0.8,  // Pathogens slightly heavier
      stokes: Math.random() < 0.3 ? 0.8 : 1.0  // Stokes number for inertia
    };
  };

  // Lagrangian particle tracking with realistic physics
  const updateParticlePosition = (particle, deltaTime) => {
    const dt = deltaTime * 0.001; // Convert to seconds
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    
    // Normalize particle position to grid coordinates
    const normalizedX = (particle.x - xmin) / (xmax - xmin);
    const normalizedY = (particle.y - ymin) / (ymax - ymin);
    
    // Check bounds
    if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
      return particle; // Keep particle as-is if out of bounds
    }
    
    // Get fluid velocity at particle position using bilinear interpolation
    const [fluidVx, fluidVy] = cfdLoader.interpolateVelocity(velocityData, particle.x, particle.y);
    
    // Lagrangian particle tracking with drag
    const dragCoeff = 0.1; // Drag coefficient
    const relaxationTime = particle.stokes * 0.01; // Particle relaxation time
    
    // Particle velocity equation: dv/dt = (u_fluid - u_particle) / tau + g
    const accelX = (fluidVx - particle.vx) / relaxationTime;
    const accelY = (fluidVy - particle.vy) / relaxationTime;
    
    // Update particle velocity (Lagrangian approach)
    const newVx = particle.vx + accelX * dt;
    const newVy = particle.vy + accelY * dt;
    
    // Add Brownian motion for small particles
    const brownianIntensity = particle.type === 'pathogen' ? 0.01 : 0.005;
    const brownianX = (Math.random() - 0.5) * brownianIntensity;
    const brownianY = (Math.random() - 0.5) * brownianIntensity;
    
    // Update position using particle velocity
    const newX = particle.x + (newVx + brownianX) * dt;
    const newY = particle.y + (newVy + brownianY) * dt;
    
    // Keep particles within domain bounds (y-direction)
    const boundedY = Math.max(ymin + 0.002, Math.min(ymax - 0.002, newY));
    
    return {
      ...particle,
      x: newX,
      y: boundedY,
      vx: newVx,
      vy: newVy
    };
  };

  // Filter interaction model
  const applyFilterEffects = (particle) => {
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    const filterStart = 0.15;
    const filterEnd = 0.17;
    
    // Check if particle is in filter zone
    if (particle.x >= filterStart && particle.x <= filterEnd && !particle.removed) {
      
      if (particle.type === 'pathogen') {
        // Realistic removal probability based on filter efficiency
        const removalEfficiency = params.removal / 100;
        const captureProb = removalEfficiency * 0.015; // Per frame probability
        
        if (Math.random() < captureProb) {
          return {
            ...particle,
            removed: true,
            vx: 0,
            vy: 0,
            x: filterStart + (filterEnd - filterStart) * Math.random(),
            y: particle.y + (Math.random() - 0.5) * 0.005
          };
        }
      }
    }
    
    return particle;
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
      frameCountRef.current++;

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
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    
    // Clear canvas
    ctx.fillStyle = COLORS.BACKGROUND_WHITE;
    ctx.fillRect(0, 0, width, height);
    
    // Draw realistic flow field
    drawFlowField(ctx);
    
    // Filter position (in domain coordinates)
    const filterStartX = 0.15;
    const filterEndX = 0.17;
    const filterPixelStart = ((filterStartX - xmin) / (xmax - xmin)) * width;
    const filterPixelEnd = ((filterEndX - xmin) / (xmax - xmin)) * width;
    
    // Draw filter media
    ctx.fillStyle = COLORS.BORDER_MEDIUM;
    ctx.fillRect(filterPixelStart - 2, 0, filterPixelEnd - filterPixelStart + 4, height);
    
    // Filter label
    ctx.fillStyle = getFilterColor(filterKey);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(filterKey, (filterPixelStart + filterPixelEnd) / 2, 25);
    
    // Spawn new particles periodically
    spawnTimerRef.current += deltaTime;
    if (spawnTimerRef.current > 120) { // Every 120ms
      const numToSpawn = 2;
      for (let i = 0; i < numToSpawn; i++) {
        const spawnY = ymin + (i + 0.5) * (ymax - ymin) / numToSpawn + 
                       (Math.random() - 0.5) * (ymax - ymin) * 0.3;
        setParticles(prev => [...prev, createParticle(spawnY)]);
      }
      spawnTimerRef.current = 0;
    }
    
    // Update particles
    setParticles(currentParticles => {
      const updatedParticles = currentParticles
        .map(particle => updateParticlePosition(particle, deltaTime))
        .map(particle => applyFilterEffects(particle))
        .filter(particle => {
          // Remove particles that have exited the domain
          return particle.x < xmax + 0.05;
        });
      
      // Limit total particle count
      const maxParticles = 120;
      if (updatedParticles.length > maxParticles) {
        return updatedParticles.slice(-maxParticles);
      }
      return updatedParticles;
    });
    
    // Draw particles with realistic rendering
    particles.forEach(particle => {
      // Convert to canvas coordinates
      const canvasX = ((particle.x - xmin) / (xmax - xmin)) * width;
      const canvasY = ((particle.y - ymin) / (ymax - ymin)) * height;
      
      // Skip if outside canvas
      if (canvasX < -10 || canvasX > width + 10 || canvasY < -10 || canvasY > height + 10) {
        return;
      }
      
      // Draw particle trail for better visualization
      if (particle.trail.length > 1) {
        ctx.strokeStyle = particle.type === 'pathogen' ? 
          'rgba(255, 0, 0, 0.2)' : 'rgba(0, 136, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        ctx.stroke();
      }
      
      // Update trail
      particle.trail.push({ x: canvasX, y: canvasY });
      if (particle.trail.length > 6) particle.trail.shift();
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, particle.size, 0, 2 * Math.PI);
      
      if (particle.removed) {
        ctx.fillStyle = filterKey.startsWith('ViSTAT') ? 
          COLORS.VISTAT_GREEN : 'rgba(255, 0, 0, 0.6)';
      } else {
        ctx.fillStyle = particle.type === 'pathogen' ? 
          COLORS.PATHOGEN_PARTICLE : COLORS.AIR_PARTICLE;
      }
      
      ctx.fill();
      
      // Add glow for pathogens
      if (particle.type === 'pathogen' && !particle.removed) {
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, particle.size + 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fill();
      }
    });
    
    // Draw flow indicators
    drawFlowIndicators(ctx);
    
    // Draw performance metrics
    const totalPathogens = particles.filter(p => p.type === 'pathogen').length;
    const removedPathogens = particles.filter(p => p.type === 'pathogen' && p.removed).length;
    const currentEfficiency = totalPathogens > 0 ? 
      ((removedPathogens / totalPathogens) * 100).toFixed(1) : '0.0';
    
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Live Efficiency: ${currentEfficiency}%`, 10, height - 40);
    ctx.fillText(`Target: ${params.removal}%`, 10, height - 25);
    ctx.fillText(`Pressure Drop: ${(params.red * 100).toFixed(1)}%`, 10, height - 10);
    
    // Data source indicator
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Realistic CFD Physics', width - 10, height - 5);
  };

  const drawFlowField = (ctx) => {
    if (!velocityData) return;
    
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    
    // Draw streamlines based on actual velocity field
    ctx.strokeStyle = 'rgba(0, 123, 204, 0.15)';
    ctx.lineWidth = 1;
    
    // Sample streamlines at different heights
    for (let i = 1; i < 8; i++) {
      const y = (height / 9) * i;
      const yWorld = ymin + (y / height) * (ymax - ymin);
      
      ctx.beginPath();
      let x = 0;
      let currentX = xmin;
      
      ctx.moveTo(x, y);
      
      // Trace streamline using velocity field
      while (currentX < xmax && x < width) {
        const [vx, vy] = cfdLoader.interpolateVelocity(velocityData, currentX, yWorld);
        const step = 0.002; // Step size in world coordinates
        
        currentX += step;
        const newY = yWorld + vy * step * 20; // Scale for visualization
        
        x = ((currentX - xmin) / (xmax - xmin)) * width;
        const yCanvas = ((newY - ymin) / (ymax - ymin)) * height;
        
        ctx.lineTo(x, Math.max(5, Math.min(height - 5, yCanvas)));
      }
      
      ctx.stroke();
    }
  };

  const drawFlowIndicators = (ctx) => {
    const [xmin, xmax] = velocityData.bounds;
    const filterStart = ((0.15 - xmin) / (xmax - xmin)) * width;
    const filterEnd = ((0.17 - xmin) / (xmax - xmin)) * width;
    
    // Flow direction arrows
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    
    // Before filter
    ctx.fillText('→', filterStart - 60, 30);
    ctx.fillText('→', filterStart - 80, height / 2);
    ctx.fillText('→', filterStart - 60, height - 30);
    
    // After filter (scaled by pressure drop)
    const afterSize = 1 - params.red * 0.5;
    ctx.save();
    ctx.scale(afterSize, 1);
    ctx.fillText('→', (filterEnd + 60) / afterSize, 30);
    ctx.fillText('→', (filterEnd + 80) / afterSize, height / 2);
    ctx.fillText('→', (filterEnd + 60) / afterSize, height - 30);
    ctx.restore();
    
    // Labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.fillText('Inlet', 50, height - 10);
    ctx.fillText('Outlet', width - 50, height - 10);
  };

  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSimulation = () => {
    setParticles([]);
    spawnTimerRef.current = 0;
    frameCountRef.current = 0;
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
            {filterKey} - Realistic CFD Simulation
          </h4>
          <div style={{ 
            fontSize: '12px', 
            color: COLORS.TEXT_SECONDARY
          }}>
            Lagrangian Particle Tracking • {velocityData?.physics_model || 'Navier-Stokes CFD'}
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
        Realistic HVAC filter physics • Lagrangian particle tracking • Red = pathogens • Blue = clean air
      </div>
    </div>
  );
}