import { useEffect, useRef } from 'react';
import { initSimulations } from '../simulations.js';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function SimulationsPage() {
  const simContainer = useRef(null);

  useEffect(() => {
    if (simContainer.current) {
      // Clear any existing content
      simContainer.current.innerHTML = '';
      
      // Initialize your original simulations
      initSimulations(simContainer.current);
    }
  }, []);

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
            Interactive Filter Simulations
          </h2>
          <p style={{ 
            margin: '0 0 20px 0', 
            color: '#666',
            fontSize: '14px'
          }}>
            Visual particle flow animations showing how different filters affect airflow and particle removal efficiency.
          </p>

          {/* Filter & Scenario Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '30px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div className="dropdown" style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className="dropbtn"
                style={{
                  backgroundColor: '#007acc',
                  color: 'white',
                  padding: '12px 20px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Filters &amp; Scenarios ▼
              </button>
              <div 
                className="dropdown-content"
                style={{
                  display: 'none',
                  position: 'absolute',
                  right: 0,
                  backgroundColor: 'white',
                  minWidth: '280px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  padding: '15px',
                  zIndex: 1000,
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}
              >
                <div id="filterControls" style={{ marginBottom: '15px' }}>
                  <strong style={{ display: 'block', marginBottom: '10px' }}>Filters:</strong>
                  {["HEPA","MERV15","MERV13","MERV10","ViSTAT-10","MERV7","ViSTAT-7"].map(f => (
                    <label 
                      key={f}
                      style={{
                        display: 'block',
                        margin: '8px 0',
                        padding: '6px 10px',
                        border: `2px solid ${getFilterColor(f)}`,
                        borderRadius: '4px',
                        backgroundColor: COLORS.BACKGROUND_LIGHT,
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        value={f} 
                        defaultChecked 
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ 
                        fontWeight: f.startsWith('ViSTAT') ? 'bold' : 'normal',
                        color: getFilterColor(f)
                      }}>
                        {f}
                      </span>
                    </label>
                  ))}
                </div>
                <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                <div id="scenarioControls">
                  <strong style={{ display: 'block', marginBottom: '10px' }}>Scenarios:</strong>
                  {["single","multi"].map(s => (
                    <label 
                      key={s}
                      style={{
                        display: 'block',
                        margin: '8px 0',
                        padding: '6px 10px',
                        border: '1px solid #6c757d',
                        borderRadius: '4px',
                        backgroundColor: '#f8f9fa',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        value={s} 
                        defaultChecked 
                        style={{ marginRight: '8px' }}
                      />
                      {s === "single" ? "Single-Pass" : "Multi-Pass"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulations Container */}
      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div 
            id="simContainer" 
            ref={simContainer}
            style={{}}
          />
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '30px 20px', 
        backgroundColor: '#f8f9fa', 
        borderTop: '1px solid #dee2e6'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
            How the Simulations Work
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            fontSize: '14px',
            color: '#666'
          }}>
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h5 style={{ 
                margin: '0 0 10px 0', 
                color: '#007acc',
                fontSize: '16px'
              }}>
                🌬️ Single-Pass Flow
              </h5>
              <p style={{ margin: '0', lineHeight: '1.5' }}>
                Air and particles flow from left to right through the filter. 
                Removed particles get trapped at the filter surface, while clean air continues through.
              </p>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h5 style={{ 
                margin: '0 0 10px 0', 
                color: '#007acc',
                fontSize: '16px'
              }}>
                🔄 Multi-Pass Recirculation
              </h5>
              <p style={{ margin: '0', lineHeight: '1.5' }}>
                Room air recirculates through the HVAC system. 
                Particles are gradually removed with each pass through the filter.
              </p>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'white', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h5 style={{ 
                margin: '0 0 10px 0', 
                color: '#28a745',
                fontSize: '16px'
              }}>
              🎯 ViSTAT Advantage
              </h5>
              <p style={{ margin: '0', lineHeight: '1.5' }}>
                ViSTAT filters achieve high removal efficiency with lower pressure drop, 
                maintaining better airflow while capturing more particles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for dropdown hover and responsive grid */}
      <style>{`
        .dropdown:hover .dropdown-content {
          display: block !important;
        }
        .dropdown-content label:hover {
          background-color: #e9ecef !important;
        }
        #simContainer {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 20px !important;
          padding: 0 !important;
        }
        
        /* Mobile: 1 column */
        @media (max-width: 767px) {
          #simContainer {
            grid-template-columns: 1fr !important;
          }
          .sim-box {
            width: 100% !important;
            max-width: none !important;
          }
        }
        
        /* Tablet and up: 2 columns */
        @media (min-width: 768px) {
          #simContainer {
            grid-template-columns: repeat(2, 1fr) !important;
            max-width: 800px !important;
            margin: 0 auto !important;
          }
          .sim-box {
            width: 100% !important;
            max-width: none !important;
          }
        }
        
        /* Large screens: still 2 columns but wider */
        @media (min-width: 1200px) {
          #simContainer {
            grid-template-columns: repeat(2, 1fr) !important;
            max-width: 900px !important;
          }
        }
        
        .sim-box {
          border: 1px solid #ccc;
          border-radius: 8px;
          background: white;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .sim-box h3 {
          margin: 10px;
          font-size: 14px;
          color: #333;
        }
        
        .sim-box canvas {
          display: block;
          width: 100%;
        }
      `}</style>
    </div>
  );
}