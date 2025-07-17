// public/simulations.js  (or src/simulations.js in your Vite app)

// Global time system for multipass simulations
export const GlobalTimeSystem = {
  airExchangesPerHour: 6,
  totalSimulationTime: 3 * 60 * 1000, // 3 minutes in milliseconds
  simulationStartTime: null,
  maxTimeToComplete: 0, // Will be set to the longest filter time
  
  init() {
    this.simulationStartTime = Date.now();
  },
  
  getCurrentSimulatedMinutes() {
    if (!this.simulationStartTime) return 0;
    const realElapsedMs = Date.now() - this.simulationStartTime;
    const progress = Math.min(realElapsedMs / this.totalSimulationTime, 1);
    return progress * this.maxTimeToComplete;
  },
  
  getProgress() {
    if (!this.simulationStartTime) return 0;
    const realElapsedMs = Date.now() - this.simulationStartTime;
    return Math.min(realElapsedMs / this.totalSimulationTime, 1);
  },
  
  reset() {
    this.simulationStartTime = Date.now();
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
    this.baseSpeed = 0.2;
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
    this.title.textContent = `${filterKey} (${scenario === 'single' ? 'Single-Pass' : 'Multi-Pass'})`;
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
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    const headerH = this.title.clientHeight + (this.info ? this.info.clientHeight : 0) + 10;
    this.canvas.height = this.container.clientHeight - headerH;
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

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Multi-pass initial fill
    if (this.scenario === 'multi' && !this.filled) {
      this.fillRoom();
      this.filled = true;
    }

    if (this.scenario === 'single') {
      // Single-pass: stream through center line
      const filterX = this.canvas.width / 2;
      ctx.fillStyle = '#888';
      ctx.fillRect(filterX - 2, 0, 4, this.canvas.height);

      if (time - this.lastSpawn > this.spawnInterval) {
        this.spawn();
        this.lastSpawn = time;
      }

      // Move & draw particles
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

        if (p.x > this.canvas.width + 5) {
          this.particles.splice(i, 1);
          continue;
        }

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

    } else {
      // Multi-pass: time-controlled recirculating room using global time
      
      // Use global time system
      const globalSimulatedMinutes = GlobalTimeSystem.getCurrentSimulatedMinutes();
      
      // Synchronized completion for filters with same target time
      const remainingPathogens = this.particles.filter(p => p.type === 'pathogen').length;
      const timeProgress = Math.min(globalSimulatedMinutes / this.timeToComplete, 1);
      
      // Complete when very close to target time (within last 0.5% of timeline)
      if (!this.isComplete && timeProgress >= 0.995 && remainingPathogens <= 2) {
        this.isComplete = true;
        this.completionTime = globalSimulatedMinutes;
        // Remove final particle(s)
        this.particles = this.particles.filter(p => p.type !== 'pathogen');
      }
      
      // Calculate current efficiency based on time progress (logarithmic curve)
      const targetEfficiency = timeProgress >= 1 ? 100 : (1 - Math.exp(-5 * timeProgress)) * 100;
      
      let currentEfficiency;
      if (this.isComplete) {
        currentEfficiency = 100;
      } else {
        currentEfficiency = Math.min(targetEfficiency, 99.9);
      }
      
      // Update particle movement
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;

        // Bounce off walls
        if (p.x <= 0 || p.x >= this.canvas.width) p.vx *= -1;
        if (p.y <= 0 || p.y >= this.canvas.height) p.vy *= -1;

        // Remove particles to match logarithmic filtration curve
        if (p.type === 'pathogen') {
          const timeProgress = Math.min(globalSimulatedMinutes / this.timeToComplete, 1);
          
          // Exponential decay curve that reaches 100% at exactly the target time
          const targetEfficiency = 1 - Math.exp(-5 * timeProgress);
          
          // Current actual particle-based efficiency
          const currentPathogens = this.particles.filter(p => p.type === 'pathogen').length;
          const currentEfficiency = this.initialPathogenCount > 0 ? 
            (this.initialPathogenCount - currentPathogens) / this.initialPathogenCount : 0;
          
          // Only remove if we're behind the target curve
          if (currentEfficiency < targetEfficiency) {
            // Progressive removal rate - faster at start, slower as we approach target
            const efficiencyGap = targetEfficiency - currentEfficiency;
            const baseRemovalRate = 0.008; // Base removal rate
            const removalRate = Math.min(0.03, baseRemovalRate + efficiencyGap * 0.05);
            
            if (Math.random() < removalRate) {
              this.particles.splice(i, 1);
              continue;
            }
          }
        }
      }

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

      // Don't draw individual clocks - will be handled globally
      
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