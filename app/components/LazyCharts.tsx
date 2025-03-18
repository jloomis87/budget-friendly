import React, { useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  type ChartData,
  type ChartArea,
  type Plugin,
  type DefaultDataPoint
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';

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

// Define chart option types
type ChartOptions = {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      position?: 'top' | 'bottom' | 'left' | 'right';
      align?: 'start' | 'center' | 'end';
      labels?: {
        boxWidth?: number;
        padding?: number;
        font?: {
          size?: number;
        };
        usePointStyle?: boolean;
        pointStyle?: string;
        color?: string;
      };
    };
    tooltip?: {
      bodyFont?: {
        size?: number;
      };
      titleFont?: {
        size?: number;
      };
      padding?: number;
      backgroundColor?: string;
      titleColor?: string;
      bodyColor?: string;
      borderColor?: string;
      borderWidth?: number;
      callbacks?: {
        label?: (context: any) => string;
      };
    };
    title?: {
      display?: boolean;
      text?: string;
      font?: {
        size?: number;
        weight?: string;
      };
      padding?: {
        top?: number;
        bottom?: number;
      };
      color?: string;
    };
  };
  scales?: {
    y?: {
      beginAtZero?: boolean;
      grid?: {
        color?: string;
        drawBorder?: boolean;
      };
      ticks?: {
        callback?: (value: number) => string;
        font?: {
          size?: number;
        };
        maxTicksLimit?: number;
        color?: string;
        padding?: number;
      };
    };
    x?: {
      grid?: {
        display?: boolean;
        drawBorder?: boolean;
      };
      ticks?: {
        font?: {
          size?: number;
          weight?: string;
        };
        color?: string;
        padding?: number;
      };
    };
  };
  layout?: {
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
};

// This component is lazy loaded to avoid SSR issues with Chart.js
interface LazyChartsProps {
  pieData: ChartData<'pie'>;
  barData: ChartData<'bar'>;
  barOptions?: ChartOptions;
  showPie?: boolean;
  showBar?: boolean;
}

const defaultBarOptions: ChartOptions = {
  plugins: {},
  scales: {
    y: {
      ticks: {}
    },
    x: {
      ticks: {}
    }
  }
};

export default function LazyCharts({ 
  pieData, 
  barData, 
  barOptions = defaultBarOptions,
  showPie = true,
  showBar = true
}: LazyChartsProps) {
  // Generate unique IDs for each chart to avoid canvas reuse issues
  const pieChartId = useRef(`pie-chart-${Math.random().toString(36).substring(2, 9)}`);
  const barChartId = useRef(`bar-chart-${Math.random().toString(36).substring(2, 9)}`);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Clean up chart instances when component unmounts
  useEffect(() => {
    return () => {
      // This ensures all chart instances are properly cleaned up
      const chartInstances = Object.values(ChartJS.instances);
      chartInstances.forEach(chart => chart.destroy());
    };
  }, []);

  // Apply dark mode styling to charts
  useEffect(() => {
    ChartJS.defaults.color = theme.palette.text.primary;
    ChartJS.defaults.borderColor = theme.palette.divider;
    ChartJS.defaults.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  }, [theme.palette.mode, isDarkMode, theme.palette.text.primary, theme.palette.divider]);

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
                    },
                    color: theme.palette.text.primary
                  }
                },
                tooltip: {
                  bodyFont: {
                    size: 12
                  },
                  titleFont: {
                    size: 13
                  },
                  backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  titleColor: isDarkMode ? theme.palette.text.primary : theme.palette.text.primary,
                  bodyColor: isDarkMode ? theme.palette.text.secondary : theme.palette.text.secondary,
                  borderColor: theme.palette.divider,
                  borderWidth: 1
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
              ...defaultBarOptions,
              ...barOptions,
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                ...(defaultBarOptions.plugins || {}),
                ...(barOptions.plugins || {}),
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
                    pointStyle: 'circle',
                    color: theme.palette.text.primary
                  }
                },
                tooltip: {
                  bodyFont: {
                    size: 14
                  },
                  titleFont: {
                    size: 16
                  },
                  padding: 12,
                  backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  titleColor: isDarkMode ? theme.palette.text.primary : theme.palette.text.primary,
                  bodyColor: isDarkMode ? theme.palette.text.secondary : theme.palette.text.secondary,
                  borderColor: theme.palette.divider,
                  borderWidth: 1
                }
              },
              scales: {
                ...(defaultBarOptions.scales || {}),
                ...(barOptions.scales || {}),
                y: {
                  ...(defaultBarOptions.scales?.y || {}),
                  ...(barOptions.scales?.y || {}),
                  grid: {
                    color: theme.palette.divider,
                    drawBorder: false,
                  },
                  ticks: {
                    ...(defaultBarOptions.scales?.y?.ticks || {}),
                    ...(barOptions.scales?.y?.ticks || {}),
                    color: theme.palette.text.secondary,
                  }
                },
                x: {
                  ...(defaultBarOptions.scales?.x || {}),
                  ...(barOptions.scales?.x || {}),
                  grid: {
                    display: false,
                    drawBorder: false
                  },
                  ticks: {
                    ...(defaultBarOptions.scales?.x?.ticks || {}),
                    ...(barOptions.scales?.x?.ticks || {}),
                    color: theme.palette.text.primary,
                  }
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