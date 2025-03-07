import React, { useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Box } from '@mui/material';

// Register ChartJS components globally - only needs to happen once
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// This component is lazy loaded to avoid SSR issues with Chart.js
interface LazyChartsProps {
  pieData: any;
  barData: any;
  barOptions: any;
  showPie?: boolean;
  showBar?: boolean;
}

export default function LazyCharts({ 
  pieData, 
  barData, 
  barOptions,
  showPie = true,
  showBar = true
}: LazyChartsProps) {
  // Generate unique IDs for each chart to avoid canvas reuse issues
  const pieChartId = useRef(`pie-chart-${Math.random().toString(36).substring(2, 9)}`);
  const barChartId = useRef(`bar-chart-${Math.random().toString(36).substring(2, 9)}`);

  // Clean up chart instances when component unmounts
  useEffect(() => {
    return () => {
      // This ensures all chart instances are properly cleaned up
      const chartInstances = Object.values(ChartJS.instances);
      chartInstances.forEach(chart => chart.destroy());
    };
  }, []);

  return (
    <>
      {showPie && (
        <Box 
          key={pieChartId.current} 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative'
          }}
        >
          <Pie 
            data={pieData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: {
                      size: 12
                    }
                  }
                },
                tooltip: {
                  bodyFont: {
                    size: 12
                  },
                  titleFont: {
                    size: 13
                  }
                }
              }
            }}
          />
        </Box>
      )}
      {showBar && (
        <Box 
          key={barChartId.current} 
          sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'relative'
          }}
        >
          <Bar 
            options={{
              ...barOptions,
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                ...barOptions.plugins,
                legend: {
                  position: 'top',
                  align: 'center',
                  labels: {
                    boxWidth: 15,
                    padding: 20,
                    font: {
                      size: 14
                    },
                    usePointStyle: true,
                    pointStyle: 'circle'
                  }
                },
                tooltip: {
                  bodyFont: {
                    size: 14
                  },
                  titleFont: {
                    size: 16
                  },
                  padding: 12
                }
              }
            }} 
            data={barData}
            height={350}
          />
        </Box>
      )}
    </>
  );
} 