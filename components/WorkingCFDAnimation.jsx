import { useEffect, useRef, useState } from 'react';
import { cfdLoader } from '../utils/cfdLoader.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function WorkingCFDAnimation({ 
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

  // Load CFD data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await cfdLoader.loadVelocityField(filterKey);
        setVelocityData(data);
        console.log(`Loaded CFD data for ${filterKey}:`, data.synthetic ? 'synthetic' : 'real');
      } catch (error) {
        console.error('Failed to load CFD data:', error);
      }
    };
    loadData();
  }, [filterKey]);

  // Initialize particles when data loads
  useEffect(() => {
    if (!velocityData) return;

    const newParticles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push(createParticle(velocityData, i));
    }

    setParticles(newParticles);
  }, [velocityData]);

  const createParticle = (velData, id) => {
    const [xmin, xmax, ymin, ymax] = velData.bounds;
    
    return {
      id,
      x: xmin + Math.random() * 0.1, // Start near inlet
      y: ymin + Math.random() * (ymax - ymin),
      vx: 0,
      vy: 0,
      type: Math.random() < 0.25 ? 'pathogen' : 'air',
      age: Math.random() * 1000,
      removed: false,
      trail: [], // For particle trails
      size: Math.random() < 0.25 ? 4 : 2
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
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (deltaTime > 0 && deltaTime < 100) { // Prevent large jumps
        updateAndRenderParticles(ctx, deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [velocityData, particles, isPlaying, width, height, filterKey, params]);

  const updateAndRenderParticles = (ctx, deltaTime) => {
    const dt = deltaTime * 0.001; // Convert to seconds
    const [xmin, xmax, ymin, ymax] = velocityData.bounds;
    
    // Clear canvas with slight fade effect
    ctx.fillStyle = 'rgba(248, 249, 250, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = COLORS.BACKGROUND_LIGHT;
    ctx.fillRect(0, 0, width, height);

    // Draw streamlines background (simplified)
    drawStreamlines(ctx);

    // Draw filter
    const filterX = width * 0.6; // Filter position
    ctx.fillStyle = COLORS.BORDER_MEDIUM;
    ctx.fillRect(filterX - 3, 0, 6, height);
    
    // Filter label
    ctx.fillStyle = getFilterColor(filterKey);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(filterKey, filterX, 20);

    // Update and draw particles
    const updatedParticles = particles.map(particle => {
      // Get velocity from CFD field
      const normalizedX = (particle.x - xmin) / (xmax - xmin);
      const normalizedY = (particle.y - ymin) / (ymax - ymin);
      
      let [vx, vy] = cfdLoader.interpolateVelocity(velocityData, particle.x, particle.y);
      
      // Scale velocity for visualization
      vx *= 50;  
      vy *= 50;
      
      // Add some randomness for turbulence
      vx += (Math.random() - 0.5) * 5;
      vy += (Math.random() - 0.5) * 2;

      // Update position
      const newX = particle.x + vx * dt;
      const newY = particle.y + vy * dt;

      // Convert to canvas coordinates for rendering
      const canvasX = (normalizedX) * width;
      const canvasY = (normalizedY) * height;

      // Update trail
      const newTrail = [...particle.trail, { x: canvasX, y: canvasY }];
      if (newTrail.length > 8) newTrail.shift();

      // Filter interaction
      let isRemoved = particle.removed;
      const filterCanvasX = filterX;
      
      if (particle.type === 'pathogen' && 
          !isRemoved && 
          canvasX >= filterCanvasX - 10 && 
          canvasX <= filterCanvasX + 10) {
        
        if (Math.random() < params.removal / 100 * 0.2) {
          isRemoved = true;
        }
      }

      // Reset particles that go off screen
      let finalX = newX;
      let finalY = newY;
      let resetTrail = newTrail;

      if (normalizedX > 1.2 || normalizedX < -0.2) {
        // Respawn at inlet
        const respawnParticle = createParticle(velocityData, particle.id);
        finalX = respawnParticle.x;
        finalY = respawnParticle.y;
        isRemoved = false;
        resetTrail = [];
      }

      // Keep Y in bounds
      if (normalizedY > 1) finalY = ymax * 0.9;
      if (normalizedY < 0) finalY = ymin + (ymax - ymin) * 0.1;

      return {
        ...particle,
        x: finalX,
        y: finalY,
        vx,
        vy,
        removed: isRemoved,
        trail: resetTrail,
        age: particle.age + deltaTime
      };
    });

    setParticles(updatedParticles);

    // Draw particles
    updatedParticles.forEach(particle => {
      const normalizedX = (particle.x - xmin) / (xmax - xmin);
      const normalizedY = (particle.y - ymin) / (ymax - ymin);
      const canvasX = normalizedX * width;
      const canvasY = normalizedY * height;

      // Draw trail
      if (particle.trail.length > 1) {
        ctx.strokeStyle = particle.type === 'pathogen' ? 
          'rgba(255, 0, 0, 0.3)' : 'rgba(0, 136, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        ctx.stroke();
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, particle.size, 0, 2 * Math.PI);
      
      if (particle.removed) {
        ctx.fillStyle = filterKey.startsWith('ViSTAT') ? 
          COLORS.REMOVED_PARTICLE : 'rgba(255, 0, 0, 0.5)';
      } else {
        ctx.fillStyle = particle.type === 'pathogen' ? 
          COLORS.PATHOGEN_PARTICLE : COLORS.AIR_PARTICLE;
      }
      
      ctx.fill();
      
      // Add glow effect for pathogens
      if (particle.type === 'pathogen' && !particle.removed) {
        ctx.shadowColor = COLORS.PATHOGEN_PARTICLE;
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw metrics
    const pathogenCount = updatedParticles.filter(p => p.type === 'pathogen').length;
    const removedCount = updatedParticles.filter(p => p.type === 'pathogen' && p.removed).length;
    const currentEfficiency = pathogenCount > 0 ? (removedCount / pathogenCount * 100).toFixed(1) : '0.0';

    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Live Efficiency: ${currentEfficiency}%`, 10, height - 40);
    ctx.fillText(`Target: ${params.removal}%`, 10, height - 25);
    ctx.fillText(`Pressure Drop: ${(params.red * 100).toFixed(1)}%`, 10, height - 10);

    // Flow direction arrow
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→ AIRFLOW →', width / 2, 25);
  };

  const drawStreamlines = (ctx) => {
    // Draw simplified streamlines based on CFD data
    ctx.strokeStyle = 'rgba(0, 123, 204, 0.2)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      const y = (height / 6) * (i + 1);
      ctx.beginPath();
      ctx.moveTo(0, y);
      
      // Create curved streamlines that show filter effects
      const filterX = width * 0.6;
      const beforeFilter = filterX - 50;
      const afterFilter = filterX + 50;
      
      // Before filter - smooth curve
      ctx.quadraticCurveTo(beforeFilter, y + Math.sin(i) * 20, filterX, y);
      
      // After filter - slightly deflected based on pressure drop
      const deflection = params.red * 30;
      ctx.quadraticCurveTo(afterFilter, y + deflection, width, y + deflection * 0.5);
      
      ctx.stroke();
    }
  };

  const toggleAnimation = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSimulation = () => {
    if (velocityData) {
      const newParticles = [];
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        newParticles.push(createParticle(velocityData, i));
      }
      setParticles(newParticles);
    }
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
            {velocityData?.synthetic ? 'Synthetic CFD Data' : 'Real OpenFOAM Data'}
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
        Click to pause/play • Particles follow real CFD velocity fields • Red = pathogens, Blue = air
      </div>
    </div>
  );
}