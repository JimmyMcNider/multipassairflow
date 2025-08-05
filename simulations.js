// public/simulations.js  (or src/simulations.js in your Vite app)

console.log('✅ Auto-loop enabled - simulations will restart after completion');
console.log('🔥 MULTIPASS-DEPLOY SIMULATIONS.JS LOADED - 180 seconds!');
console.log('🔥 File path: /Users/james/projects/airflowvis/multipass-deploy/simulations.js');

// Global time system for multipass simulations
export const GlobalTimeSystem = {
  airExchangesPerHour: 6,
  totalSimulationTime: 180 * 1000, // 30 seconds for testing auto-loop
  simulationStartTime: null,
  maxTimeToComplete: 0, // Will be set to the longest filter time
  autoLoop: true, // Enable automatic looping
  restartDelay: 2000, // 2 second pause at 100% before restart
  restartTimer: null, // Timer for restart delay
  isRestarting: false, // Flag to track restart state
  resetCallbacks: [], // Array to store simulation reset functions
  
  init() {
    this.simulationStartTime = Date.now();
  },
  
  getCurrentSimulatedMinutes() {
    if (!this.simulationStartTime) return 0;
    const realElapsedMs = Date.now() - this.simulationStartTime;
    const progress = Math.min(realElapsedMs / this.totalSimulationTime, 1);
    
    // During restart delay, return the maximum time to maintain 100% state
    if (this.isRestarting) {
      return this.maxTimeToComplete;
    }
    
    return progress * this.maxTimeToComplete;
  },
  
  getProgress() {
    if (!this.simulationStartTime) return 0;
    const realElapsedMs = Date.now() - this.simulationStartTime;
    const progress = Math.min(realElapsedMs / this.totalSimulationTime, 1);
    
    // Auto-loop logic: restart after reaching 100% completion
    if (this.autoLoop && progress >= 1 && !this.isRestarting) {
      console.log('🔄 Auto-loop triggered! Progress:', progress);
      this.isRestarting = true;
      this.restartTimer = setTimeout(() => {
        console.log('🔄 Restarting animation now!');
        this.reset();
        this.isRestarting = false;
        this.restartTimer = null;
      }, this.restartDelay);
    }
    
    return progress;
  },
  
  reset() {
    // Clear any existing restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    
    this.simulationStartTime = Date.now();
    this.isRestarting = false;
    
    // Call all registered reset callbacks to reset individual simulations
    this.resetCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error calling reset callback:', error);
      }
    });
    
    console.log('GlobalTimeSystem: Animation restarting with', this.resetCallbacks.length, 'simulations');
  },
  
  registerResetCallback(callback) {
    this.resetCallbacks.push(callback);
  },
  
  clearResetCallbacks() {
    this.resetCallbacks = [];
  }
};

export class Simulation {
  constructor(container, filterKey, params, passes, scenario) {
    this.filterKey = filterKey;
    this.params = params;
    this.passes = passes;
    this.scenario = scenario;
    this.particles = [];
    this.maxParticles = 500;
    this.spawnInterval = 41;
    this.lastSpawn = 0;
    this.baseSpeed = 0.1; // Reduced from 0.2 to slow down particles
    this.hvacSize = 20;
    this.filled = false;
    
    // New time-controlled multipass properties
    if (scenario === 'multi') {
      this.isComplete = false;
      this.completionTime = null;
      
      // Calculate time to 100% filtration based on passes
      // Time = passes * (60 minutes / 6 exchanges) = passes * 10 minutes  
      this.timeToComplete = passes * 10; // minutes
    }

    // Build the DOM structure
    this.container = document.createElement('div');
    this.container.className = 'sim-box';

    this.title = document.createElement('h3');
    // Clean up filter names and remove Multi-Pass suffix
    let displayName = filterKey;
    if (filterKey === 'ViSTAT-10') {
      displayName = 'ViSTAT MERV 10';
    } else if (filterKey === 'ViSTAT-7') {
      displayName = 'ViSTAT MERV 7';
    } else if (filterKey === 'MERV15') {
      displayName = 'MERV 15';
    } else if (filterKey === 'MERV13') {
      displayName = 'MERV 13';
    } else if (filterKey === 'MERV10') {
      displayName = 'MERV 10';
    } else if (filterKey === 'MERV7') {
      displayName = 'MERV 7';
    }
    this.title.textContent = displayName;
    this.container.appendChild(this.title);

    if (scenario === 'multi') {
      this.info = document.createElement('p');
      // this.info.textContent = `Requires ${passes} passes for 100% removal`;
      this.container.appendChild(this.info);
    }

    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    container.appendChild(this.container);

    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    
    // Register reset callback with GlobalTimeSystem
    this.resetCallback = () => this.resetState();
    GlobalTimeSystem.registerResetCallback(this.resetCallback);
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    const headerH = this.title.clientHeight + (this.info ? this.info.clientHeight : 0) + 10;
    this.canvas.height = this.container.clientHeight - headerH;
  }
  
  resetState() {
    // Reset multi-pass simulation state
    if (this.scenario === 'multi') {
      this.isComplete = false;
      this.completionTime = null;
      this.filled = false;
      this.particles = [];
      console.log(`${this.filterKey}: Simulation state reset`);
    }
  }

  fillRoom() {
    const airCount = 300;
    const pathogenCount = 100;
    this.initialPathogenCount = pathogenCount;

    // Air particles
    for (let i = 0; i < airCount; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const angle = Math.random() * 2 * Math.PI;
      this.particles.push({
        type: 'air',
        x, y,
        vx: this.baseSpeed * Math.cos(angle),
        vy: this.baseSpeed * Math.sin(angle),
        color: 'rgba(0,150,255,0.3)'
      });
    }

    // Pathogen particles
    for (let i = 0; i < pathogenCount; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const angle = Math.random() * 2 * Math.PI;
      this.particles.push({
        type: 'pathogen',
        x, y,
        vx: this.baseSpeed * Math.cos(angle),
        vy: this.baseSpeed * Math.sin(angle),
        color: 'red'
      });
    }
  }

  spawn() {
    // New air
    const yAir = Math.random() * this.canvas.height;
    this.particles.push({
      type: 'air',
      x: -5,
      y: yAir,
      color: 'rgba(0,150,255,0.5)'
    });

    // New pathogen
    const removalChance = this.params.removal / 100;
    const removed = Math.random() < removalChance;
    const yPath = Math.random() * this.canvas.height;
    this.particles.push({
      type: 'pathogen',
      x: -5,
      y: yPath,
      removed,
      color: 'red'
    });

    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  update(delta, time) {
    const { red, removal } = this.params;
    const cfmIn = 819;
    
    // Use 500-819 CFM range for more dramatic visual differences
    const cfmMin = 500;
    const cfmOut = cfmIn - (red * (cfmIn - cfmMin));
    
    const dtSec = delta / 1000;
    const ctx = this.ctx;

    // Defensive check: Skip rendering if canvas is hidden/collapsed but keep particle logic running
    const canRender = ctx && this.canvas.width > 0 && this.canvas.height > 0;
    
    if (canRender) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Multi-pass initial fill
    if (this.scenario === 'multi' && !this.filled) {
      this.fillRoom();
      this.filled = true;
    }

    if (this.scenario === 'single') {
      // Single-pass: stream through center line
      const filterX = this.canvas.width / 2;
      
      if (time - this.lastSpawn > this.spawnInterval) {
        this.spawn();
        this.lastSpawn = time;
      }

      // Move particles (always update, regardless of canvas visibility)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        // Calculate visual speed based on CFM range (500-819)
        const cfmRatio = cfmOut / cfmIn; // This will be between ~0.95-1.0 for the 781-815 range
        // BABY-OBVIOUS dramatic visual differences - like molasses vs fire hose!
        const minSpeedRatio = 0.01; // BARELY MOVING for MERV15 - like thick molasses!
        const maxSpeedRatio = 1.2;   // Actually FASTER for low pressure drop filters
        // Use quartic (4th power) scaling to make the difference RIDICULOUS
        const normalizedRatio = (cfmRatio - (500/819)) / (1 - (500/819)); // 0 to 1
        const visualSpeedMultiplier = minSpeedRatio + Math.pow(normalizedRatio, 10) * (maxSpeedRatio - minSpeedRatio);
        const speed = p.x < filterX ? this.baseSpeed : this.baseSpeed * visualSpeedMultiplier;
        p.x += speed * delta;

        if (p.type === 'pathogen' && p.x >= filterX && p.removed) {
          p.x = filterX - 2 + Math.random() * 4;
          p.color = this.filterKey.startsWith('ViSTAT') ? 'gray' : 'red';
        }

        // Use canvas width from last known good state if canvas is collapsed
        const effectiveCanvasWidth = canRender ? this.canvas.width : (this.lastKnownWidth || 400);
        if (p.x > effectiveCanvasWidth + 5) {
          this.particles.splice(i, 1);
          continue;
        }
      }

      // Only draw if canvas is visible and valid
      if (canRender) {
        // Store last known width for particle logic
        this.lastKnownWidth = this.canvas.width;
        
        // Draw filter line
        ctx.fillStyle = '#888';
        ctx.fillRect(filterX - 2, 0, 4, this.canvas.height);

        // Draw particles
        for (const p of this.particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.type === 'air' ? 2 : 3, 0, 2 * Math.PI);
          ctx.fillStyle = p.color;
          ctx.fill();
        }

        // Metrics
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.fillText(`CFM In: ${cfmIn}`, 10, 15);
        ctx.fillText(`CFM Out: ${cfmOut.toFixed(1)}`, 10, 30);
        ctx.fillText(`Viral Filtration Efficiency: ${removal}%`, 10, 45);
      }

    } else {
      // Multi-pass: time-controlled recirculating room using global time
      
      // Use global time system
      const globalSimulatedMinutes = GlobalTimeSystem.getCurrentSimulatedMinutes();
      
      // Synchronized completion for filters with same target time
      const remainingPathogens = this.particles.filter(p => p.type === 'pathogen').length;
      const timeProgress = Math.min(globalSimulatedMinutes / this.timeToComplete, 1);
      
      // Complete at exactly the target time (100% of timeline)
      if (!this.isComplete && timeProgress >= 1.0) {
        this.isComplete = true;
        this.completionTime = this.timeToComplete; // Set to exact target time
        // Remove all pathogen particles instantly at completion
        this.particles = this.particles.filter(p => p.type !== 'pathogen');
      }
      
      // Calculate current efficiency - exact mathematical curve with 100% snap
      let currentEfficiency;
      if (this.isComplete) {
        currentEfficiency = 100; // Exactly 100% when complete
      } else {
        // Linear interpolation to exactly 99.9% at 99.9% of timeline
        if (timeProgress < 0.999) {
          // Smooth curve up to 99.9% of the time
          const curveEfficiency = (1 - Math.exp(-6 * timeProgress)) * 100;
          currentEfficiency = Math.min(curveEfficiency, 99.9 * (timeProgress / 0.999));
        } else {
          // Final stretch: ensure we hit exactly 99.9%
          currentEfficiency = 99.9;
        }
      }
      
      // Update particle movement
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        
        // Red particles (pathogens) move 10% faster than blue particles (air)
        const speedMultiplier = p.type === 'pathogen' ? 1.1 : 1.0;
        p.x += p.vx * delta * speedMultiplier;
        p.y += p.vy * delta * speedMultiplier;

        // Bounce off walls (use last known dimensions if canvas is collapsed)
        const effectiveWidth = canRender ? this.canvas.width : (this.lastKnownWidth || 400);
        const effectiveHeight = canRender ? this.canvas.height : (this.lastKnownHeight || 300);
        
        if (p.x <= 0 || p.x >= effectiveWidth) p.vx *= -1;
        if (p.y <= 0 || p.y >= effectiveHeight) p.vy *= -1;

        // Deterministic particle removal to match exact efficiency curve (only if not complete)
        if (p.type === 'pathogen' && !this.isComplete) {
          const timeProgress = Math.min(globalSimulatedMinutes / this.timeToComplete, 1);
          
          // Target efficiency based on mathematical curve (matches display curve)
          let targetEfficiency;
          if (timeProgress < 0.999) {
            const curveEfficiency = (1 - Math.exp(-6 * timeProgress));
            targetEfficiency = Math.min(curveEfficiency, 0.999 * (timeProgress / 0.999));
          } else {
            targetEfficiency = 0.999; // 99.9% in decimal form
          }
          
          // Calculate target number of pathogens that should remain
          const targetPathogens = Math.round(this.initialPathogenCount * (1 - targetEfficiency));
          const currentPathogens = this.particles.filter(p => p.type === 'pathogen').length;
          
          // If we have too many pathogens, remove this one deterministically
          if (currentPathogens > targetPathogens) {
            // Remove particles systematically (every Nth particle) rather than randomly
            const excessPathogens = currentPathogens - targetPathogens;
            const removalInterval = Math.max(1, Math.floor(currentPathogens / excessPathogens));
            if (i % removalInterval === 0) {
              this.particles.splice(i, 1);
              continue;
            }
          }
        }
      }

      // Only draw if canvas is visible and valid
      if (canRender) {
        // Store last known dimensions for particle logic
        this.lastKnownWidth = this.canvas.width;
        this.lastKnownHeight = this.canvas.height;
        
        // Draw boundary and HVAC
        ctx.strokeStyle = '#888';
        ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // Color HVAC and overlay based on completion status
        if (this.isComplete) {
          // Draw green overlay on entire simulation
          ctx.fillStyle = 'rgba(40, 167, 69, 0.15)';
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.fillStyle = '#28a745'; // Green HVAC when complete
        } else {
          ctx.fillStyle = '#666';
        }
        
        ctx.fillRect(
          this.canvas.width - this.hvacSize,
          this.canvas.height / 2 - this.hvacSize / 2,
          this.hvacSize,
          this.hvacSize
        );

        // Draw particles
        for (const p of this.particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.type === 'air' ? 2 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      // Don't draw individual clocks - will be handled globally
      
      // Only draw UI elements if canvas is visible and valid
      if (canRender) {
        // Progress bar for this specific filter - smooth time-based progress
        const progressBarWidth = this.canvas.width - 40;
        const progressBarHeight = 6;
        const progressBarX = 20;
        const progressBarY = 25;
        
        ctx.fillStyle = '#ddd';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
        
        // Smooth progress based on time, not particle count
        const filterProgress = timeProgress; // 0 to 1 based on time
        
        ctx.fillStyle = this.isComplete ? '#28a745' : '#007acc';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * filterProgress, progressBarHeight);

        // Metrics
        const displayedEfficiency = Math.min(currentEfficiency, 100);

        ctx.fillStyle = this.isComplete ? '#28a745' : '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Target: ${this.timeToComplete} min (${this.passes} passes)`, 10, this.canvas.height - 30);
        ctx.fillText(`Current Efficiency: ${displayedEfficiency.toFixed(1)}%`, 10, this.canvas.height - 15);
        
        if (this.isComplete) {
          ctx.fillStyle = '#28a745';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('✓ 100% COMPLETE', 10, this.canvas.height - 45);
        }
      }
    }
  }
}

// Parameters - Based on Robert Roth's Scientific Data
export const filterParams = {
  HEPA:        { red: 0.18,   removal: 99.9 },  // 18% reduction, 99.9% VFE
  MERV15:      { red: 0.12,   removal: 85.0 },  // 12% reduction, 85% VFE
  MERV13:      { red: 0.0675, removal: 46.0 },  // 6.75% reduction, 46% VFE
  MERV10:      { red: 0.045,  removal: 29.0 },  // 4.5% reduction, 29% VFE
  "ViSTAT-10": { red: 0.0488, removal: 85.0 },  // 4.88% reduction, 85% VFE
  MERV7:       { red: 0.012,  removal: 19.0 },  // 1.2% reduction, 19% VFE
  "ViSTAT-7":  { red: 0.015,  removal: 61.0 }   // 1.5% reduction, 61% VFE
};

export const scenarioPasses = {
  HEPA:       3, MERV15:     8, MERV13:    23,
  MERV10:     41, "ViSTAT-10": 8, MERV7:    66,
  "ViSTAT-7": 15
};

// Initialization helper
export function initSimulations(container) {
  const filterControls   = document.getElementById('filterControls');
  const scenarioControls = document.getElementById('scenarioControls');
  let simulations = [];

  function rebuild() {
    // Clear old
    simulations.forEach(sim => sim.container.remove());
    simulations = [];

    // Gather selections
    const selectedFilters   = Array.from(filterControls.querySelectorAll('input:checked')).map(i => i.value);
    const selectedScenarios = Array.from(scenarioControls.querySelectorAll('input:checked')).map(i => i.value);

    // Instantiate new sims
    selectedFilters.forEach(f =>
      selectedScenarios.forEach(s =>
        simulations.push(new Simulation(container, f, filterParams[f], scenarioPasses[f], s))
      )
    );
  }

  // Hook up events
  filterControls.querySelectorAll('input').forEach(i => i.addEventListener('change', rebuild));
  scenarioControls.querySelectorAll('input').forEach(i => i.addEventListener('change', rebuild));

  // First build + start loop
  rebuild();
  let lastTime = performance.now();

  function animate(time) {
    const delta = time - lastTime;
    lastTime  = time;
    simulations.forEach(sim => sim.update(delta, time));
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}