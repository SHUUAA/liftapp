import React, { useRef, useEffect } from 'react';

// Inform TypeScript that Chart will be available on the global scope from the CDN script
declare var Chart: any;

interface ChartDataPoint {
  name: string;
  submission_count: number;
}

interface SubmissionsBarChartProps {
  data: ChartDataPoint[];
}

const SubmissionsBarChart: React.FC<SubmissionsBarChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null); // To hold the chart instance

  useEffect(() => {
    if (chartRef.current && data) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.map(d => d.name),
            datasets: [{
              label: 'Submission Count',
              data: data.map(d => d.submission_count),
              backgroundColor: [
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)'
              ],
              borderColor: [
                'rgb(54, 162, 235)',
                'rgb(255, 99, 132)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)',
                'rgb(153, 102, 255)',
                'rgb(255, 159, 64)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            indexAxis: 'y', // This makes it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Number of Submissions'
                },
                ticks: {
                  precision: 0 // Ensure x-axis labels are whole numbers
                }
              },
              y: {
                title: {
                  display: false, // The chart is self-explanatory
                },
                 grid: {
                  display: false
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
               tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: {
                    size: 14,
                },
                bodyFont: {
                    size: 12,
                },
                padding: 10,
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div style={{ position: 'relative', height: '300px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default SubmissionsBarChart;
