// CFD Data Loader utility for loading velocity fields and streamlines

export class CFDDataLoader {
  constructor() {
    this.velocityCache = new Map();
    this.loadingPromises = new Map();
  }

  async loadVelocityField(filterKey) {
    // Return cached data if available
    if (this.velocityCache.has(filterKey)) {
      return this.velocityCache.get(filterKey);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(filterKey)) {
      return this.loadingPromises.get(filterKey);
    }

    // Create new loading promise
    const loadPromise = this._fetchVelocityField(filterKey);
    this.loadingPromises.set(filterKey, loadPromise);

    try {
      const data = await loadPromise;
      this.velocityCache.set(filterKey, data);
      this.loadingPromises.delete(filterKey);
      return data;
    } catch (error) {
      this.loadingPromises.delete(filterKey);
      throw error;
    }
  }

  async _fetchVelocityField(filterKey) {
    try {
      const response = await fetch(`/cfd-data/${filterKey}/velocity.json`);
      if (!response.ok) {
        throw new Error(`Failed to load velocity field for ${filterKey}`);
      }
      const data = await response.json();
      
      // Validate data structure
      if (!data.nx || !data.ny || !data.field || !data.bounds) {
        throw new Error(`Invalid velocity field data for ${filterKey}`);
      }

      return data;
    } catch (error) {
      console.warn(`Failed to load CFD data for ${filterKey}, using synthetic data:`, error);
      return this._generateSyntheticVelocityField(filterKey);
    }
  }

  _generateSyntheticVelocityField(filterKey) {
    // Generate synthetic velocity field for demonstration
    const nx = 200;
    const ny = 100;
    const bounds = [0.0, 1.0, 0.0, 0.5];
    
    const field = [];
    for (let j = 0; j < ny; j++) {
      const row = [];
      for (let i = 0; i < nx; i++) {
        const x = i / (nx - 1);
        const y = j / (ny - 1);
        
        // Create flow profile - faster in center, slower near walls
        const centerFlow = 1.0;
        const wallEffect = Math.sin(y * Math.PI); // Parabolic profile
        
        // Add filter effect - reduce velocity after mid-point
        const filterPosition = 0.5;
        const afterFilter = x > filterPosition;
        const filterReduction = this._getFilterReduction(filterKey);
        
        const vx = centerFlow * wallEffect * (afterFilter ? (1 - filterReduction) : 1.0);
        const vy = 0.1 * Math.sin(x * Math.PI * 2) * Math.sin(y * Math.PI); // Small vertical component
        
        row.push([vx, vy]);
      }
      field.push(row);
    }

    return {
      nx,
      ny,
      bounds,
      field,
      synthetic: true
    };
  }

  _getFilterReduction(filterKey) {
    // Filter pressure drop reductions from the original data
    const reductions = {
      'HEPA': 0.18,
      'MERV15': 0.12,
      'MERV13': 0.0675,
      'MERV10': 0.045,
      'ViSTAT-10': 0.0488,
      'MERV7': 0.012,
      'ViSTAT-7': 0.015
    };
    return reductions[filterKey] || 0.1;
  }

  // Interpolate velocity at a specific point
  interpolateVelocity(velocityData, x, y) {
    const { nx, ny, bounds, field } = velocityData;
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

  // Clear cache
  clearCache() {
    this.velocityCache.clear();
  }
}

// Singleton instance
export const cfdLoader = new CFDDataLoader();