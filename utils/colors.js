// Standardized color scheme for ViSTAT application
export const COLORS = {
  // Primary brand colors
  PRIMARY_BLUE: '#007acc',      // Main blue for UI elements, air particles
  PRIMARY_RED: '#dc3545',       // Red for pathogens, comparison filters
  
  // ViSTAT brand colors
  VISTAT_GREEN: '#28a745',      // ViSTAT filters and success states
  VISTAT_LIGHT_GREEN: '#d4edda', // ViSTAT highlights and backgrounds
  
  // Particle colors
  AIR_PARTICLE: '#0088ff',      // Air particles (blue)
  PATHOGEN_PARTICLE: '#ff0000', // Pathogen particles (red)
  REMOVED_PARTICLE: '#888888',  // Removed particles (gray)
  
  // UI states
  SUCCESS: '#28a745',           // Success states, good performance
  WARNING: '#ffc107',           // Warning states, moderate performance  
  INFO: '#17a2b8',             // Info states, performance mode
  
  // Background colors
  BACKGROUND_LIGHT: '#f8f9fa',  // Light background
  BACKGROUND_WHITE: '#ffffff',  // White background
  BACKGROUND_GRAY: '#f0f0f0',   // Gray background
  
  // Border and text colors
  BORDER_LIGHT: '#dee2e6',      // Light borders
  BORDER_MEDIUM: '#ccc',        // Medium borders
  TEXT_PRIMARY: '#333',         // Primary text
  TEXT_SECONDARY: '#666',       // Secondary text
  TEXT_MUTED: '#999',          // Muted text
  
  // Filter-specific colors (for consistency)
  TRADITIONAL_FILTER: '#007acc', // Traditional filters (blue)
  VISTAT_FILTER: '#28a745',     // ViSTAT filters (green)
  
  // Chart colors
  CHART_IDEAL_ZONE: 'rgba(40, 167, 69, 0.1)',    // Light green for ideal performance
  CHART_STANDARD_ZONE: 'rgba(255, 193, 7, 0.1)', // Light yellow for standard performance
  CHART_GRID: '#e0e0e0',                          // Grid lines
};

// Helper functions for color usage
export const getFilterColor = (filterKey) => {
  return filterKey.startsWith('ViSTAT') ? COLORS.VISTAT_FILTER : COLORS.TRADITIONAL_FILTER;
};

export const getParticleColor = (particleType, isRemoved = false, filterKey = '') => {
  if (isRemoved) {
    return filterKey.startsWith('ViSTAT') ? COLORS.REMOVED_PARTICLE : COLORS.PATHOGEN_PARTICLE;
  }
  return particleType === 'pathogen' ? COLORS.PATHOGEN_PARTICLE : COLORS.AIR_PARTICLE;
};

export const getPerformanceColor = (isGood) => {
  return isGood ? COLORS.SUCCESS : COLORS.PRIMARY_RED;
};