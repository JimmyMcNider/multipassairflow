// Web Worker for particle computation
// This runs in a separate thread to avoid blocking the main UI

class ParticleWorker {
  constructor() {
    this.particles = [];
    this.velocityData = null;
    this.parameters = {};
  }

  interpolateVelocity(x, y) {
    if (!this.velocityData) return [0, 0];
    
    const { nx, ny, bounds, field } = this.velocityData;
    const [xmin, xmax, ymin, ymax] = bounds;
    
    // Normalize coordinates
    const xNorm = (x - xmin) / (xmax - xmin);
    const yNorm = (y - ymin) / (ymax - ymin);
    
    // Clamp to bounds
    const xClamped = Math.max(0, Math.min(1, xNorm));
    const yClamped = Math.max(0, Math.min(1, yNorm));
    
    // Convert to grid indices
    const i = xClamped * (nx - 1);
    const j = yClamped * (ny - 1);
    
    // Bilinear interpolation
    const i0 = Math.floor(i);
    const i1 = Math.min(i0 + 1, nx - 1);
    const j0 = Math.floor(j);
    const j1 = Math.min(j0 + 1, ny - 1);
    
    const fx = i - i0;
    const fy = j - j0;
    
    const v00 = field[j0][i0];
    const v10 = field[j0][i1];
    const v01 = field[j1][i0];
    const v11 = field[j1][i1];
    
    const vx = v00[0] * (1 - fx) * (1 - fy) +
               v10[0] * fx * (1 - fy) +
               v01[0] * (1 - fx) * fy +
               v11[0] * fx * fy;
               
    const vy = v00[1] * (1 - fx) * (1 - fy) +
               v10[1] * fx * (1 - fy) +
               v01[1] * (1 - fx) * fy +
               v11[1] * fx * fy;
    
    return [vx, vy];
  }

  updateParticles(deltaTime) {
    if (!this.velocityData || this.particles.length === 0) return;

    const dt = deltaTime * 0.001;
    const [xmin, xmax, ymin, ymax] = this.velocityData.bounds;
    const { 
      turbulenceIntensity = 0.1,
      temperatureFactor = 1.0,
      particleDensity = 1.0 
    } = this.parameters;

    const updatedParticles = [];

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      // Get velocity from CFD field
      const [vx, vy] = this.interpolateVelocity(particle.x, particle.y);

      // Add turbulence
      const turbulenceX = (Math.random() - 0.5) * turbulenceIntensity;
      const turbulenceY = (Math.random() - 0.5) * turbulenceIntensity;

      // Apply temperature effects
      const tempFactor = temperatureFactor;
      const finalVx = (vx + turbulenceX) * tempFactor;
      const finalVy = (vy + turbulenceY) * tempFactor;

      // Update position
      const newX = particle.x + finalVx * dt * 0.1;
      const newY = particle.y + finalVy * dt * 0.1;

      // Boundary handling
      let finalX = newX;
      let finalY = newY;
      let shouldRemove = false;

      if (particle.scenario === 'single') {
        if (newX > xmax) shouldRemove = true;
        if (newX < xmin) finalX = xmin;
      } else {
        if (newX < xmin) finalX = xmax;
        if (newX > xmax) finalX = xmin;
      }

      if (newY < ymin) finalY = ymin;
      if (newY > ymax) finalY = ymax;

      // Filter removal logic
      const filterPosition = (xmin + xmax) / 2;
      let isRemoved = particle.removed;
      
      if (particle.type === 'pathogen' && 
          !isRemoved && 
          particle.x < filterPosition && 
          finalX >= filterPosition) {
        const removalChance = this.parameters.removalEfficiency / 100;
        if (Math.random() < removalChance) {
          isRemoved = true;
        }
      }

      if (!shouldRemove) {
        updatedParticles.push({
          ...particle,
          x: finalX,
          y: finalY,
          vx: finalVx,
          vy: finalVy,
          age: particle.age + dt,
          removed: isRemoved
        });
      }
    }

    // Add new particles for single-pass scenario
    if (this.parameters.scenario === 'single' && Math.random() < 0.1 * particleDensity) {
      const newParticle = {
        id: Math.random(),
        type: Math.random() < 0.8 ? 'air' : 'pathogen',
        x: xmin,
        y: ymin + Math.random() * (ymax - ymin),
        vx: 0,
        vy: 0,
        age: 0,
        removed: false,
        scenario: this.parameters.scenario
      };
      updatedParticles.push(newParticle);
    }

    // Limit particle count
    const maxParticles = this.parameters.scenario === 'multi' ? 300 : 500;
    if (updatedParticles.length > maxParticles) {
      this.particles = updatedParticles.slice(-maxParticles);
    } else {
      this.particles = updatedParticles;
    }

    return this.particles;
  }

  setVelocityData(data) {
    this.velocityData = data;
  }

  setParameters(params) {
    this.parameters = { ...this.parameters, ...params };
  }

  setParticles(particles) {
    this.particles = particles;
  }

  getParticles() {
    return this.particles;
  }
}

// Worker instance
const worker = new ParticleWorker();

// Message handling
self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'setVelocityData':
      worker.setVelocityData(data);
      break;
      
    case 'setParameters':
      worker.setParameters(data);
      break;
      
    case 'setParticles':
      worker.setParticles(data);
      break;
      
    case 'updateParticles':
      const updatedParticles = worker.updateParticles(data.deltaTime);
      self.postMessage({
        type: 'particlesUpdated',
        data: updatedParticles
      });
      break;
      
    case 'getParticles':
      self.postMessage({
        type: 'particlesData',
        data: worker.getParticles()
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};