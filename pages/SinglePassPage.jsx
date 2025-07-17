import { useState, useEffect, useRef } from 'react';
import { Simulation, filterParams } from '../simulations.js';
import { COLORS } from '../utils/colors.js';

export default function SinglePassPage() {
  // Hide HEPA for now
  const availableFilters = Object.keys(filterParams).filter(key => key !== 'HEPA');
  
  const [selectedFilters, setSelectedFilters] = useState(availableFilters);
  const containerRef = useRef(null);
  const simulationsRef = useRef([]);
  const animationRunningRef = useRef(false);

  const handleFilterToggle = (filterKey) => {
    setSelectedFilters(prev => 
      prev.includes(filterKey) 
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  // Initialize simulations when filters change
  useEffect(() => {
    if (!containerRef.current) return;

    // Find which filters were added/removed
    const currentKeys = simulationsRef.current.map(sim => sim.filterKey);
    const filtersToAdd = selectedFilters.filter(key => !currentKeys.includes(key));
    const filtersToRemove = currentKeys.filter(key => !selectedFilters.includes(key));

    // Remove simulations that are no longer selected
    filtersToRemove.forEach(filterKey => {
      const simIndex = simulationsRef.current.findIndex(sim => sim.filterKey === filterKey);
      if (simIndex !== -1) {
        const sim = simulationsRef.current[simIndex];
        if (sim.container && sim.container.parentNode) {
          sim.container.parentNode.removeChild(sim.container);
        }
        simulationsRef.current.splice(simIndex, 1);
      }
    });

    // Add new simulations for newly selected filters
    filtersToAdd.forEach(filterKey => {
      const sim = new Simulation(
        containerRef.current, 
        filterKey, 
        filterParams[filterKey], 
        0, // passes not used in single-pass
        'single'
      );
      simulationsRef.current.push(sim);
      
      // Force resize for new simulation
      setTimeout(() => {
        sim.resize();
      }, 50);
    });

    // Start animation loop only if we don't have one running
    if (simulationsRef.current.length > 0 && !animationRunningRef.current) {
      animationRunningRef.current = true;
      let lastTime = performance.now();
      const animate = (time) => {
        const delta = time - lastTime;
        lastTime = time;
        simulationsRef.current.forEach(sim => sim.update(delta, time));
        if (simulationsRef.current.length > 0) {
          requestAnimationFrame(animate);
        } else {
          animationRunningRef.current = false;
        }
      };
      requestAnimationFrame(animate);
    }

    // Cleanup function
    return () => {
      simulationsRef.current.forEach(sim => {
        if (sim.container && sim.container.parentNode) {
          sim.container.parentNode.removeChild(sim.container);
        }
      });
      simulationsRef.current = [];
      animationRunningRef.current = false;
    };
  }, [selectedFilters]);

  return (
    <div style={{ padding: '20px', backgroundColor: COLORS.BACKGROUND_WHITE }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
          Single-Pass Filter Simulations
        </h2>
        <p style={{ 
          margin: '0 0 20px 0', 
          color: '#666',
          fontSize: '14px'
        }}>
          Stream-through visualization showing immediate filter efficiency. Air flows once through the filter media.
        </p>

        {/* Filter Controls - Hidden for now */}
        <div style={{ display: 'none' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>
            Select Filters to Compare:
          </h4>
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            flexWrap: 'wrap' 
          }}>
            {availableFilters.map(filterKey => (
              <label key={filterKey} style={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(filterKey)}
                  onChange={() => handleFilterToggle(filterKey)}
                  style={{ marginRight: '8px' }}
                />
                {filterKey}
              </label>
            ))}
          </div>
        </div>

        {/* Simulations Container */}
        <div 
          ref={containerRef}
          style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            gridAutoRows: 'min-content'
          }}
        ></div>

        {/* Info Section */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#666'
        }}>
          <strong>Single-Pass Mode:</strong> Air flows once through the filter media, showing immediate filtration efficiency. 
          Red particles = pathogens, Blue particles = clean air. Particles that are filtered remain at the filter media.
        </div>
      </div>
    </div>
  );
}