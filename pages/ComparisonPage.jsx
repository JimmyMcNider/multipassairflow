import { useState } from 'react';
import FilterMetrics from '../components/FilterMetrics.jsx';
import { filterParams } from '../simulations.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function ComparisonPage() {
  const [selectedFilter1, setSelectedFilter1] = useState('ViSTAT-10');
  const [selectedFilter2, setSelectedFilter2] = useState('MERV13');

  // Based on Robert Roth's Scientific Data - BioActive Technology
  const allFilters = [
    { key: 'MERV15', name: 'MERV 15', red: 0.12, removal: 85.0, energy: [40, 60] },
    { key: 'MERV13', name: 'MERV 13', red: 0.0675, removal: 46.0, energy: [20, 31] },
    { key: 'MERV10', name: 'MERV 10', red: 0.045, removal: 29.0, energy: [13, 20] },
    { key: 'ViSTAT-10', name: 'ViSTAT-10', red: 0.0488, removal: 85.0, energy: [14, 21] },
    { key: 'MERV7', name: 'MERV 7', red: 0.012, removal: 19.0, energy: [3, 5] },
    { key: 'ViSTAT-7', name: 'ViSTAT-7', red: 0.015, removal: 61.0, energy: [4, 6] }
  ];

  const getFilterData = (filterKey) => {
    return allFilters.find(f => f.key === filterKey);
  };

  const calculateComparison = () => {
    const filter1 = getFilterData(selectedFilter1);
    const filter2 = getFilterData(selectedFilter2);
    
    if (!filter1 || !filter2) return null;

    const efficiencyDiff = filter1.removal - filter2.removal;
    const pressureDiff = (filter1.red - filter2.red) * 100;
    const energyDiff = (filter1.energy[1] - filter2.energy[1]);
    const cfmDiff = (filter2.red - filter1.red) * 819; // Higher pressure drop = lower CFM

    return {
      filter1,
      filter2,
      efficiencyDiff,
      pressureDiff,
      energyDiff,
      cfmDiff
    };
  };

  const comparison = calculateComparison();

  const renderFilterSelector = (title, selected, onChange, color) => (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      borderRadius: '12px',
      border: `3px solid ${color}`,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: color }}>{title}</h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        {allFilters.map(filter => (
          <button
            key={filter.key}
            onClick={() => onChange(filter.key)}
            style={{
              padding: '12px 16px',
              border: `2px solid ${selected === filter.key ? color : COLORS.BORDER_LIGHT}`,
              borderRadius: '8px',
              backgroundColor: selected === filter.key ? color : 'white',
              color: selected === filter.key ? 'white' : COLORS.TEXT_PRIMARY,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: selected === filter.key ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{filter.name}</div>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.8,
              marginTop: '4px'
            }}>
              {filter.removal}% efficiency • {(filter.red * 100).toFixed(1)}% pressure drop
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderComparisonMetric = (label, value, unit, better, description) => {
    const isPositive = better === 'higher' ? value > 0 : value < 0;
    const color = isPositive ? COLORS.SUCCESS : COLORS.PRIMARY_RED;
    const symbol = value > 0 ? '+' : '';
    
    return (
      <div style={{
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: `2px solid ${color}`,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          {label}
        </div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: color,
          marginBottom: '4px'
        }}>
          {symbol}{Math.abs(value).toFixed(1)}{unit}
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {description}
        </div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 'bold',
          color: color,
          marginTop: '4px'
        }}>
          {isPositive ? `${selectedFilter1} Better` : `${selectedFilter2} Better`}
        </div>
      </div>
    );
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
            Filter Performance Comparison
          </h2>
          <p style={{ 
            margin: '0', 
            color: '#666',
            fontSize: '14px'
          }}>
            Side-by-side analysis of filter efficiency, pressure drop, and energy consumption.
          </p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Filter Selectors */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {renderFilterSelector('Filter 1', selectedFilter1, setSelectedFilter1, COLORS.PRIMARY_BLUE)}
            {renderFilterSelector('Filter 2', selectedFilter2, setSelectedFilter2, COLORS.PRIMARY_RED)}
          </div>

          {/* Comparison Metrics */}
          {comparison && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                textAlign: 'center', 
                margin: '0 0 20px 0', 
                color: '#333' 
              }}>
                Performance Comparison: {comparison.filter1.name} vs {comparison.filter2.name}
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginBottom: '20px'
              }}>
                {renderComparisonMetric(
                  'Removal Efficiency',
                  comparison.efficiencyDiff,
                  '%',
                  'higher',
                  'Particle capture rate'
                )}
                {renderComparisonMetric(
                  'Pressure Drop',
                  comparison.pressureDiff,
                  '%',
                  'lower',
                  'Energy resistance'
                )}
                {renderComparisonMetric(
                  'Energy Consumption',
                  comparison.energyDiff,
                  ' kW',
                  'lower',
                  'Power usage difference'
                )}
                {renderComparisonMetric(
                  'Airflow Rate',
                  comparison.cfmDiff,
                  ' CFM',
                  'higher',
                  'Volume flow rate'
                )}
              </div>
            </div>
          )}

          {/* Performance Chart */}
          {comparison && (
            <div style={{ marginBottom: '30px' }}>
              <FilterMetrics 
                filterData={comparison.filter1}
                width={Math.min(1200, window.innerWidth - 80)}
                height={400}
                showComparison={true}
              />
            </div>
          )}

          {/* Detailed Analysis */}
          {comparison && (
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
                Detailed Analysis
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '25px' 
              }}>
                {/* Filter 1 Details */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px solid #007acc'
                }}>
                  <h4 style={{ 
                    margin: '0 0 15px 0', 
                    color: '#007acc',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#007acc',
                      borderRadius: '50%',
                      marginRight: '10px'
                    }}></span>
                    {comparison.filter1.name}
                  </h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div><strong>Removal Efficiency:</strong> {comparison.filter1.removal}%</div>
                    <div><strong>Pressure Drop:</strong> {(comparison.filter1.red * 100).toFixed(1)}%</div>
                    <div><strong>Energy Range:</strong> {comparison.filter1.energy[0]}-{comparison.filter1.energy[1]} kW</div>
                    <div><strong>Effective CFM:</strong> {(819 * (1 - comparison.filter1.red)).toFixed(0)} CFM</div>
                    {comparison.filter1.key.startsWith('ViSTAT') && (
                      <div style={{ 
                        marginTop: '10px',
                        padding: '8px',
                        backgroundColor: '#d4edda',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <strong>ViSTAT Technology:</strong> Advanced filtration with minimal pressure drop
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter 2 Details */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px solid #dc3545'
                }}>
                  <h4 style={{ 
                    margin: '0 0 15px 0', 
                    color: '#dc3545',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#dc3545',
                      borderRadius: '50%',
                      marginRight: '10px'
                    }}></span>
                    {comparison.filter2.name}
                  </h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div><strong>Removal Efficiency:</strong> {comparison.filter2.removal}%</div>
                    <div><strong>Pressure Drop:</strong> {(comparison.filter2.red * 100).toFixed(1)}%</div>
                    <div><strong>Energy Range:</strong> {comparison.filter2.energy[0]}-{comparison.filter2.energy[1]} kW</div>
                    <div><strong>Effective CFM:</strong> {(819 * (1 - comparison.filter2.red)).toFixed(0)} CFM</div>
                    {comparison.filter2.key.startsWith('ViSTAT') && (
                      <div style={{ 
                        marginTop: '10px',
                        padding: '8px',
                        backgroundColor: '#d4edda',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <strong>ViSTAT Technology:</strong> Advanced filtration with minimal pressure drop
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: comparison.efficiencyDiff > 0 && comparison.pressureDiff < 0 ? '#d4edda' : '#fff3cd',
                borderRadius: '8px',
                border: `1px solid ${comparison.efficiencyDiff > 0 && comparison.pressureDiff < 0 ? '#c3e6cb' : '#ffeaa7'}`
              }}>
                <strong style={{ color: '#333' }}>Recommendation:</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#333' }}>
                  {comparison.efficiencyDiff > 10 && comparison.pressureDiff < 0 ? 
                    `${comparison.filter1.name} offers significantly better efficiency with lower pressure drop - ideal for most applications.` :
                    comparison.efficiencyDiff > 0 && comparison.pressureDiff < 5 ?
                    `${comparison.filter1.name} provides better overall performance with minimal energy penalty.` :
                    comparison.pressureDiff < -5 ?
                    `${comparison.filter1.name} offers much lower energy consumption, suitable for high-volume applications.` :
                    `Both filters have trade-offs. Consider your specific requirements for efficiency vs. energy consumption.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}