import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const RiskDistributionChart = ({ distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 } }) => {
  const data = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [distribution.LOW || 0, distribution.MEDIUM || 0, distribution.HIGH || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Emerald
          'rgba(245, 158, 11, 0.8)', // Amber
          'rgba(239, 68, 68, 0.8)',  // Rose
        ],
        borderColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
        ],
        borderWidth: 1.5,
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
          color: '#94a3b8',
          font: { family: 'inherit', size: 12 },
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
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
