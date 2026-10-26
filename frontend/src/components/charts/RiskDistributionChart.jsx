import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

export const RiskDistributionChart = ({ distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 } }) => {
  const { isDark } = useTheme();

  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBorder = isDark ? '#334155' : '#CBD5E1';

  const data = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [distribution.LOW || 0, distribution.MEDIUM || 0, distribution.HIGH || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)', // Emerald
          'rgba(245, 158, 11, 0.85)', // Amber
          'rgba(239, 68, 68, 0.85)',  // Red
        ],
        borderColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: tickColor,
          font: { family: 'inherit', size: 12 },
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        padding: 10,
      },
    },
    cutout: '70%',
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
};
