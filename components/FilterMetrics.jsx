import { useEffect, useRef } from 'react';
import { COLORS, getFilterColor } from '../utils/colors.js';

export default function FilterMetrics({ 
  filterData, 
  width = 600, 
  height = 400,
  showComparison = true 
}) {
  const canvasRef = useRef(null);

  const allFilters = [
    { key: 'HEPA', name: 'HEPA', red: 0.18, removal: 99.97, energy: [67, 100] },
    { key: 'MERV15', name: 'MERV 15', red: 0.12, removal: 85.00, energy: [40, 60] },
    { key: 'MERV13', name: 'MERV 13', red: 0.0675, removal: 46.00, energy: [20, 31] },
    { key: 'MERV10', name: 'MERV 10', red: 0.045, removal: 29.00, energy: [13, 20] },
    { key: 'ViSTAT-10', name: 'ViSTAT-10', red: 0.0488, removal: 85.00, energy: [14, 21] },
    { key: 'MERV7', name: 'MERV 7', red: 0.012, removal: 19.00, energy: [3, 5] },
    { key: 'ViSTAT-7', name: 'ViSTAT-7', red: 0.015, removal: 61.00, energy: [4, 6] }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    drawMetricsChart(ctx, allFilters, filterData);
  }, [filterData, width, height]);

  const drawMetricsChart = (ctx, filters, highlightFilter) => {
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Scales
    const maxRemoval = 100;
    const maxPressure = Math.max(...filters.map(f => f.red * 100));
    
    const xScale = (removal) => margin.left + (removal / maxRemoval) * chartWidth;
    const yScale = (pressure) => margin.top + chartHeight - (pressure / maxPressure) * chartHeight;

    // Draw background grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Vertical grid lines (removal efficiency)
    for (let i = 0; i <= 10; i++) {
      const x = xScale(i * 10);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (pressure drop)
    for (let i = 0; i <= 5; i++) {
      const y = yScale(i * (maxPressure / 5));
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Removal Efficiency (%)', margin.left + chartWidth / 2, height - 10);

    ctx.save();
    ctx.translate(20, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure Drop (%)', 0, 0);
    ctx.restore();

    // Draw title
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Filter Performance Comparison', width / 2, 25);

    // Draw data points
    filters.forEach(filter => {
      const x = xScale(filter.removal);
      const y = yScale(filter.red * 100);
      const isHighlighted = highlightFilter && filter.key === highlightFilter.key;
      const isViSTAT = filter.key.startsWith('ViSTAT');
      const filterColor = getFilterColor(filter.key);

      // Point styling
      ctx.beginPath();
      ctx.arc(x, y, isHighlighted ? 8 : 6, 0, 2 * Math.PI);
      
      if (isViSTAT) {
        ctx.fillStyle = isHighlighted ? COLORS.VISTAT_FILTER : '#00CC00';
        ctx.strokeStyle = '#008800';
      } else {
        ctx.fillStyle = isHighlighted ? COLORS.PRIMARY_BLUE : '#4488CC';
        ctx.strokeStyle = '#003388';
      }
      
      ctx.lineWidth = isHighlighted ? 3 : 2;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#333';
      ctx.font = isHighlighted ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(filter.name, x + 10, y - 5);

      // Efficiency percentage
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(`${filter.removal.toFixed(1)}%`, x + 10, y + 8);
    });

    // Draw performance zones
    drawPerformanceZones(ctx, margin, chartWidth, chartHeight, xScale, yScale);

    // Draw legend
    drawLegend(ctx, width - 110, margin.top + 20);
  };

  const drawPerformanceZones = (ctx, margin, chartWidth, chartHeight, xScale, yScale) => {
    // ViSTAT Ideal Zone - High efficiency (75%+), very low pressure (0-8%)
    ctx.fillStyle = COLORS.CHART_IDEAL_ZONE;
    ctx.fillRect(
      xScale(75), 
      margin.top, 
      xScale(100) - xScale(75), 
      yScale(8) - margin.top
    );

    // ViSTAT Performance Zone - Good efficiency (60%+), low pressure (0-12%)
    ctx.fillStyle = 'rgba(40, 167, 69, 0.05)';
    ctx.fillRect(
      xScale(60), 
      margin.top, 
      xScale(100) - xScale(60), 
      yScale(12) - margin.top
    );

    // Standard Zone - Traditional filter performance
    ctx.fillStyle = COLORS.CHART_STANDARD_ZONE;
    ctx.fillRect(
      xScale(20), 
      yScale(8), 
      xScale(75) - xScale(20), 
      yScale(20) - yScale(8)
    );

    // Zone labels
    ctx.fillStyle = COLORS.VISTAT_FILTER;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ViSTAT Ideal', xScale(87), margin.top + 20);

    ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.fillText('ViSTAT Zone', xScale(78), margin.top + 35);

    ctx.fillStyle = COLORS.PRIMARY_BLUE;
    ctx.font = '11px sans-serif';
    ctx.fillText('Traditional Zone', xScale(47), yScale(14));
  };

  const drawLegend = (ctx, x, y) => {
    // ViSTAT legend
    ctx.fillStyle = COLORS.VISTAT_FILTER;
    ctx.fillRect(x, y, 12, 12);
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ViSTAT Filters', x + 16, y + 9);

    // Traditional legend
    ctx.fillStyle = COLORS.TRADITIONAL_FILTER;
    ctx.fillRect(x, y + 20, 12, 12);
    ctx.fillStyle = COLORS.TEXT_PRIMARY;
    ctx.fillText('Traditional Filters', x + 16, y + 29);

    // Performance zones legend
    ctx.fillStyle = COLORS.VISTAT_FILTER;
    ctx.fillRect(x, y + 45, 12, 8);
    ctx.fillStyle = COLORS.TEXT_SECONDARY;
    ctx.font = '10px sans-serif';
    ctx.fillText('ViSTAT Performance Zone', x + 16, y + 52);

    ctx.fillStyle = COLORS.PRIMARY_BLUE;
    ctx.fillRect(x, y + 60, 12, 8);
    ctx.fillText('Traditional Performance Zone', x + 16, y + 67);
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '10px',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <canvas 
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%' }}
      />
      
      {filterData && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>{filterData.key} Performance Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <strong>Removal Efficiency:</strong> {filterData.removal}%
            </div>
            <div>
              <strong>Pressure Drop:</strong> {(filterData.red * 100).toFixed(1)}%
            </div>
            <div>
              <strong>Energy Impact:</strong> {filterData.energy ? `${filterData.energy[0]}-${filterData.energy[1]} kW` : 'N/A'}
            </div>
            <div>
              <strong>CFM Reduction:</strong> {(filterData.red * 819).toFixed(0)} CFM
            </div>
          </div>
          
          {filterData.key.startsWith('ViSTAT') && (
            <div style={{ 
              marginTop: '8px', 
              padding: '6px', 
              backgroundColor: '#e8f5e8',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              <strong>ViSTAT Advantage:</strong> High removal efficiency with minimal pressure drop
            </div>
          )}
        </div>
      )}
    </div>
  );
}