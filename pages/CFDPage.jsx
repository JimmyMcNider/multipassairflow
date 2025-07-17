import { useState } from 'react';
import RealisticCFDAnimation from '../components/RealisticCFDAnimation.jsx';
import FilterMetrics from '../components/FilterMetrics.jsx';
import InteractiveControls from '../components/InteractiveControls.jsx';
import { filterParams, scenarioPasses } from '../simulations.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function CFDPage() {
  const [selectedFilters, setSelectedFilters] = useState(['HEPA', 'ViSTAT-10', 'MERV13']);
  const [selectedScenarios, setSelectedScenarios] = useState(['single']);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [selectedFilterForMetrics, setSelectedFilterForMetrics] = useState(null);
  const [customParameters, setCustomParameters] = useState({});

  const handleFilterChange = (filterKey, checked) => {
    if (checked) {
      setSelectedFilters(prev => [...prev, filterKey]);
    } else {
      setSelectedFilters(prev => prev.filter(f => f !== filterKey));
    }
  };

  const handleScenarioChange = (scenario, checked) => {
    if (checked) {
      setSelectedScenarios(prev => [...prev, scenario]);
    } else {
      setSelectedScenarios(prev => prev.filter(s => s !== scenario));
    }
  };

  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
            Advanced CFD Visualization
          </h2>
          <p style={{ 
            margin: '0 0 20px 0', 
            color: '#666',
            fontSize: '14px'
          }}>
            Realistic HVAC filter simulations using Navier-Stokes CFD physics and Lagrangian particle tracking. Watch air particles navigate real filter media with accurate pressure drops and turbulence!
          </p>

          {/* Filter Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '30px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#333' }}>Filters:</strong>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                {["HEPA","MERV15","MERV13","MERV10","ViSTAT-10","MERV7","ViSTAT-7"].map(f => (
                  <label key={f} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    border: `2px solid ${getFilterColor(f)}`,
                    borderRadius: '6px',
                    backgroundColor: selectedFilters.includes(f) ? getFilterColor(f) : 'white',
                    color: selectedFilters.includes(f) ? 'white' : getFilterColor(f),
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}>
                    <input 
                      type="checkbox" 
                      value={f} 
                      checked={selectedFilters.includes(f)}
                      onChange={(e) => handleFilterChange(f, e.target.checked)}
                      style={{ marginRight: '6px' }}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '14px', color: '#333' }}>Scenarios:</strong>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                {["single","multi"].map(s => (
                  <label key={s} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    border: `2px solid ${COLORS.TEXT_SECONDARY}`,
                    borderRadius: '6px',
                    backgroundColor: selectedScenarios.includes(s) ? COLORS.TEXT_SECONDARY : 'white',
                    color: selectedScenarios.includes(s) ? 'white' : COLORS.TEXT_SECONDARY,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}>
                    <input 
                      type="checkbox" 
                      value={s} 
                      checked={selectedScenarios.includes(s)}
                      onChange={(e) => handleScenarioChange(s, e.target.checked)}
                      style={{ marginRight: '6px' }}
                    />
                    {s === "single" ? "Single-Pass" : "Multi-Pass"}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ 
            marginTop: '20px',
            display: 'flex', 
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setShowMetrics(!showMetrics)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: showMetrics ? COLORS.SUCCESS : COLORS.BACKGROUND_GRAY,
                color: showMetrics ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showMetrics ? 'Hide' : 'Show'} Performance Metrics
            </button>
            <button 
              onClick={() => setShowControls(!showControls)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: showControls ? COLORS.WARNING : COLORS.BACKGROUND_GRAY,
                color: 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showControls ? 'Hide' : 'Show'} Interactive Controls
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      {showMetrics && (
        <div style={{ padding: '20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <FilterMetrics 
              filterData={selectedFilterForMetrics}
              width={Math.min(1000, window.innerWidth - 80)}
              height={350}
            />
          </div>
        </div>
      )}

      {/* Controls Section */}
      {showControls && selectedFilters.length > 0 && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {selectedFilters.slice(0, 3).map(filterKey => (
                <InteractiveControls
                  key={filterKey}
                  filterKey={filterKey}
                  initialParameters={customParameters[filterKey] || {}}
                  onParameterChange={(params) => {
                    setCustomParameters(prev => ({
                      ...prev,
                      [filterKey]: params
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CFD Simulations */}
      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '20px'
          }}>
            {selectedFilters.flatMap(filterKey =>
              selectedScenarios.map(scenario => (
                <div 
                  key={`${filterKey}-${scenario}`}
                  onClick={() => setSelectedFilterForMetrics({
                    key: filterKey,
                    removal: filterParams[filterKey].removal,
                    red: filterParams[filterKey].red,
                    energy: filterKey === 'HEPA' ? [67, 100] :
                           filterKey === 'MERV15' ? [40, 60] :
                           filterKey === 'MERV13' ? [20, 31] :
                           filterKey === 'MERV10' ? [13, 20] :
                           filterKey === 'ViSTAT-10' ? [14, 21] :
                           filterKey === 'MERV7' ? [3, 5] :
                           filterKey === 'ViSTAT-7' ? [4, 6] : [10, 15]
                  })}
                  style={{ 
                    cursor: 'pointer',
                    border: selectedFilterForMetrics?.key === filterKey ? 
                      `4px solid ${getFilterColor(filterKey)}` : 
                      '2px solid transparent',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedFilterForMetrics?.key === filterKey ? 
                      '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <RealisticCFDAnimation
                    filterKey={filterKey}
                    params={{
                      ...filterParams[filterKey],
                      ...customParameters[filterKey]
                    }}
                    scenario={scenario}
                    width={430}
                    height={320}
                  />
                </div>
              ))
            )}
          </div>

          {selectedFilters.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#666', marginBottom: '10px' }}>
                Select Filters to Begin CFD Visualization
              </h3>
              <p style={{ color: '#999', fontSize: '14px' }}>
                Choose one or more filters above to see advanced computational fluid dynamics simulations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div style={{ 
        padding: '30px 20px', 
        backgroundColor: '#f8f9fa', 
        borderTop: '1px solid #dee2e6'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
            Advanced CFD Features
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong style={{ color: '#007acc' }}>🔬 Real CFD Data</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                Particles follow actual OpenFOAM velocity fields from computational fluid dynamics simulations
              </p>
            </div>
            <div style={{ 
              padding: '15px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong style={{ color: '#007acc' }}>🎮 Interactive Controls</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                Adjust airflow rates, pressure drops, and turbulence to see real-time effects on filter performance
              </p>
            </div>
            <div style={{ 
              padding: '15px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong style={{ color: '#007acc' }}>📊 Performance Analysis</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                Click simulations to analyze detailed metrics and compare ViSTAT vs traditional filter efficiency
              </p>
            </div>
            <div style={{ 
              padding: '15px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <strong style={{ color: '#007acc' }}>⚡ Performance Mode</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                Web Worker optimization for smooth 60+ FPS particle computation in complex simulations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}