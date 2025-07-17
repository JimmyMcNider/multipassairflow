import { useState, useEffect, useRef } from 'react';
import { Simulation, filterParams, scenarioPasses, GlobalTimeSystem } from '../simulations.js';
import { COLORS } from '../utils/colors.js';

// Global Clock Component
function GlobalClock() {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const simulatedMinutes = GlobalTimeSystem.getCurrentSimulatedMinutes();
      setCurrentTime(simulatedMinutes);
    }, 100); // Update every 100ms for smooth time display

    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(currentTime / 60);
  const minutes = Math.floor(currentTime % 60);
  const timeDisplay = `${hours} ${hours === 1 ? 'Hour' : 'Hours'} and ${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;

  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '3px solid #007acc',
      marginBottom: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#007acc',
        marginBottom: '8px',
        letterSpacing: '1px'
      }}>
        {timeDisplay}
      </div>
      <div style={{
        fontSize: '16px',
        color: '#666',
        fontWeight: '500'
      }}>
        Accelerated Simulation Time • 6 Air Exchanges/Hour
      </div>
    </div>
  );
}

export default function MultiPassPage() {
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

    // Always reset global time system when simulations change
    // Calculate the maximum time needed across all selected filters
    const maxTime = Math.max(...selectedFilters.map(key => scenarioPasses[key] * 10));
    GlobalTimeSystem.maxTimeToComplete = maxTime;
    
    // Always reset the global timer to ensure fresh start
    GlobalTimeSystem.reset();

    // Add new simulations for newly selected filters
    filtersToAdd.forEach(filterKey => {
      const sim = new Simulation(
        containerRef.current, 
        filterKey, 
        filterParams[filterKey], 
        scenarioPasses[filterKey],
        'multi'
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
          Multi-Pass Filter Simulations
        </h2>
        <p style={{ 
          margin: '0 0 20px 0', 
          color: '#666',
          fontSize: '14px'
        }}>
          Recirculating room simulation showing gradual pathogen removal over multiple air changes. Watch efficiency build up over time.
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
                {/* ({scenarioPasses[filterKey]} passes for 100%) */}
              </label>
            ))}
          </div>
        </div>

        {/* Global Clock */}
        <GlobalClock />
        
        {/* Simulations Container */}
        <div 
          ref={containerRef}
          style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            gridAutoRows: 'min-content',
            marginTop: '10px'
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
          <strong>Multi-Pass Mode:</strong> Room air recirculates through the HVAC system multiple times. 
          Particles bounce around the room and are gradually removed when they encounter the filter. 
          The gray square represents the HVAC intake where filtration occurs.
        </div>
      </div>
    </div>
  );
}