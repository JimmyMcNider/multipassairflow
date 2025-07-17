import { useState, useEffect } from 'react';

export default function InteractiveControls({
  onParameterChange,
  initialParameters = {},
  filterKey = 'HEPA'
}) {
  const [parameters, setParameters] = useState({
    airflowRate: 819, // CFM
    removalEfficiency: 99.97, // %
    pressureDropMultiplier: 1.0, // Multiplier for base pressure drop
    particleDensity: 1.0, // Particles per unit
    turbulenceIntensity: 0.1, // 0-1
    temperatureFactor: 1.0, // Temperature effect on flow
    ...initialParameters
  });

  const [advancedMode, setAdvancedMode] = useState(false);
  const [presetMode, setPresetMode] = useState('realistic'); // 'realistic', 'optimized', 'stressed'

  // Preset configurations
  const presets = {
    realistic: {
      name: 'Realistic Conditions',
      description: 'Standard operating conditions',
      parameters: {
        airflowRate: 819,
        pressureDropMultiplier: 1.0,
        particleDensity: 1.0,
        turbulenceIntensity: 0.1,
        temperatureFactor: 1.0
      }
    },
    optimized: {
      name: 'Optimized Performance',
      description: 'Best-case scenario conditions',
      parameters: {
        airflowRate: 900,
        pressureDropMultiplier: 0.8,
        particleDensity: 0.8,
        turbulenceIntensity: 0.05,
        temperatureFactor: 1.1
      }
    },
    stressed: {
      name: 'Stressed Conditions',
      description: 'High-load, challenging conditions',
      parameters: {
        airflowRate: 650,
        pressureDropMultiplier: 1.3,
        particleDensity: 1.5,
        turbulenceIntensity: 0.2,
        temperatureFactor: 0.9
      }
    }
  };

  // Filter-specific parameter limits
  const getParameterLimits = (filterKey) => {
    const baseLimits = {
      airflowRate: { min: 300, max: 1200, step: 10 },
      removalEfficiency: { min: 0, max: 99.99, step: 0.1 },
      pressureDropMultiplier: { min: 0.5, max: 2.0, step: 0.1 },
      particleDensity: { min: 0.1, max: 3.0, step: 0.1 },
      turbulenceIntensity: { min: 0, max: 0.5, step: 0.01 },
      temperatureFactor: { min: 0.7, max: 1.3, step: 0.1 }
    };

    // Adjust limits based on filter type
    if (filterKey.startsWith('ViSTAT')) {
      baseLimits.pressureDropMultiplier.max = 1.5; // ViSTAT has inherently lower pressure drop
      baseLimits.removalEfficiency.min = 50; // ViSTAT maintains good efficiency
    }

    return baseLimits;
  };

  const limits = getParameterLimits(filterKey);

  useEffect(() => {
    onParameterChange(parameters);
  }, [parameters, onParameterChange]);

  const handleParameterChange = (key, value) => {
    const numValue = parseFloat(value);
    const limit = limits[key];
    
    // Clamp to limits
    const clampedValue = Math.max(limit.min, Math.min(limit.max, numValue));
    
    setParameters(prev => ({
      ...prev,
      [key]: clampedValue
    }));
  };

  const applyPreset = (presetKey) => {
    const preset = presets[presetKey];
    setParameters(prev => ({
      ...prev,
      ...preset.parameters
    }));
    setPresetMode(presetKey);
  };

  const resetToDefaults = () => {
    applyPreset('realistic');
  };

  const calculateDerivedMetrics = () => {
    const baseEfficiencyForFilter = {
      'HEPA': 99.97,
      'MERV15': 85.00,
      'MERV13': 46.00,
      'MERV10': 29.00,
      'ViSTAT-10': 85.00,
      'MERV7': 19.00,
      'ViSTAT-7': 61.00
    };

    const basePressureDropForFilter = {
      'HEPA': 0.18,
      'MERV15': 0.12,
      'MERV13': 0.0675,
      'MERV10': 0.045,
      'ViSTAT-10': 0.0488,
      'MERV7': 0.012,
      'ViSTAT-7': 0.015
    };

    const baseEfficiency = baseEfficiencyForFilter[filterKey] || 50;
    const basePressureDrop = basePressureDropForFilter[filterKey] || 0.1;

    const adjustedEfficiency = Math.min(99.99, 
      baseEfficiency * (parameters.temperatureFactor * 0.5 + 0.5)
    );
    
    const adjustedPressureDrop = basePressureDrop * parameters.pressureDropMultiplier;
    const effectiveCFM = parameters.airflowRate * (1 - adjustedPressureDrop);
    const energyConsumption = Math.pow(adjustedPressureDrop + 0.1, 1.5) * 50; // Simplified energy model

    return {
      adjustedEfficiency,
      adjustedPressureDrop,
      effectiveCFM,
      energyConsumption
    };
  };

  const metrics = calculateDerivedMetrics();

  const renderSlider = (key, label, unit = '') => {
    const limit = limits[key];
    return (
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontSize: '13px',
          fontWeight: '500' 
        }}>
          {label}: {parameters[key]}{unit}
        </label>
        <input
          type="range"
          min={limit.min}
          max={limit.max}
          step={limit.step}
          value={parameters[key]}
          onChange={(e) => handleParameterChange(key, e.target.value)}
          style={{ 
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#ddd',
            outline: 'none'
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          color: '#666' 
        }}>
          <span>{limit.min}{unit}</span>
          <span>{limit.max}{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
        Interactive Controls - {filterKey}
      </h3>

      {/* Preset Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Quick Presets</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: presetMode === key ? '#007acc' : '#f8f9fa',
                color: presetMode === key ? 'white' : '#333',
                cursor: 'pointer'
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={resetToDefaults}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              backgroundColor: '#fff',
              color: '#dc3545',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Primary Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Primary Parameters</h4>
        {renderSlider('airflowRate', 'Airflow Rate', ' CFM')}
        {renderSlider('pressureDropMultiplier', 'Pressure Drop Factor', 'x')}
        {renderSlider('particleDensity', 'Particle Density', 'x')}
      </div>

      {/* Advanced Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setAdvancedMode(!advancedMode)}
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            border: '1px solid #666',
            borderRadius: '4px',
            backgroundColor: advancedMode ? '#666' : '#fff',
            color: advancedMode ? 'white' : '#666',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          {advancedMode ? 'Hide' : 'Show'} Advanced Controls
        </button>
        
        {advancedMode && (
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Advanced Parameters</h4>
            {renderSlider('turbulenceIntensity', 'Turbulence Intensity')}
            {renderSlider('temperatureFactor', 'Temperature Factor', 'x')}
          </div>
        )}
      </div>

      {/* Real-time Metrics */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '12px',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Live Performance Metrics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <strong>Efficiency:</strong> {metrics.adjustedEfficiency.toFixed(2)}%
          </div>
          <div>
            <strong>Pressure Drop:</strong> {(metrics.adjustedPressureDrop * 100).toFixed(1)}%
          </div>
          <div>
            <strong>Effective CFM:</strong> {metrics.effectiveCFM.toFixed(0)}
          </div>
          <div>
            <strong>Energy:</strong> {metrics.energyConsumption.toFixed(1)} kW
          </div>
        </div>
        
        {/* Performance Indicator */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>
            <strong>Performance Score:</strong>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#ddd', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, (metrics.adjustedEfficiency / metrics.energyConsumption) * 2)}%`,
              height: '100%',
              backgroundColor: filterKey.startsWith('ViSTAT') ? '#00AA00' : '#007acc',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}