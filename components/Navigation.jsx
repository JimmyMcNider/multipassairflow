import { useState } from 'react';

export default function Navigation({ currentPage, onPageChange }) {
  const pages = [
    { key: 'single', label: 'Single-Pass Simulations', description: 'Stream-through filter efficiency' },
    { key: 'multi', label: 'Multi-Pass Simulations', description: 'Recirculating room air cleaning' },
    { key: 'comparison', label: 'Performance Comparison', description: 'Side-by-side filter analysis' }
  ];

  return (
    <>
      <nav style={{
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '15px' 
          }}>
            <img 
              src="ViSTAT_logo.png" 
              alt="ViSTAT Logo" 
              style={{ height: '40px', marginRight: '20px' }}
            />
            <div>
              <h1 style={{ 
                margin: '0', 
                fontSize: '24px', 
                color: '#333' 
              }}>
                Filtration Visualization
              </h1>
              <p style={{ 
                margin: '5px 0 0 0', 
                fontSize: '14px', 
                color: '#666' 
              }}>
                Simulations for Air Filtration Technology
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap' 
          }}>
            {pages.map(page => (
              <button
                key={page.key}
                onClick={() => onPageChange(page.key)}
                className={`nav-button ${currentPage === page.key ? 'active' : ''}`}
                style={{
                  padding: '12px 20px',
                  border: '2px solid #007acc',
                  borderRadius: '8px',
                  backgroundColor: currentPage === page.key ? '#007acc' : 'white',
                  color: currentPage === page.key ? 'white' : '#007acc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '160px',
                  textAlign: 'left'
                }}
              >
                <div className="nav-button-title" style={{ 
                  fontWeight: 'bold',
                  color: 'inherit'
                }}>
                  {page.label}
                </div>
                <div className="nav-button-description" style={{ 
                  fontSize: '12px', 
                  opacity: 0.8,
                  marginTop: '4px',
                  color: 'inherit'
                }}>
                  {page.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* CSS to handle hover states properly */}
      <style>{`
        .nav-button {
          background-color: white !important;
          color: #007acc !important;
        }
        .nav-button.active {
          background-color: #007acc !important;
          color: white !important;
        }
        .nav-button:not(.active):hover {
          background-color: #f0f8ff !important;
          color: #007acc !important;
        }
        .nav-button .nav-button-title,
        .nav-button .nav-button-description {
          color: inherit !important;
        }
      `}</style>
    </>
  );
}