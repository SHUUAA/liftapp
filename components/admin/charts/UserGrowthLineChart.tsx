import React, { useRef, useEffect } from 'react';

// Inform TypeScript that Chart will be available on the global scope from the CDN script
declare var Chart: any; 

interface ChartDataPoint {
  date: string;
  count: number;
}

interface UserGrowthLineChartProps {
  data: ChartDataPoint[];
}

const UserGrowthLineChart: React.FC<UserGrowthLineChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null); // To hold the chart instance

  useEffect(() => {
    if (chartRef.current && data) {
      // Destroy the old chart instance if it exists to prevent memory leaks
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            datasets: [{
              label: 'Cumulative Users',
              data: data.map(d => ({ x: d.date, y: d.count })),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              fill: true,
              tension: 0.2,
              pointRadius: 2,
              pointHoverRadius: 5,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false, // Important for fitting into a responsive div
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'day',
                  tooltipFormat: 'MMM d, yyyy',
                  displayFormats: {
                      day: 'MMM d'
                  }
                },
                title: {
                  display: true,
                  text: 'Date'
                },
                grid: {
                  display: false
                }
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Total Registered Users'
                },
                ticks: {
                  precision: 0 // Ensure y-axis labels are whole numbers
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: {
                    size: 14,
                },
                bodyFont: {
                    size: 12,
                },
                padding: 10,
              }
            },
            interaction: {
              mode: 'index',
              intersect: false
            }
          }
        });
      }
    }

    // Cleanup function to destroy the chart on component unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]); // Re-run effect if data changes

  // The wrapper div with position: relative and a fixed height is crucial for Chart.js's responsiveness.
  return (
    <div style={{ position: 'relative', height: '350px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default UserGrowthLineChart;
