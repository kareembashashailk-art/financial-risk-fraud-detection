import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const RulesTriggeredChart = ({ rules = [] }) => {
  const labels = rules.map((r) => r.rule_name || 'Rule');
  const counts = rules.map((r) => r.count);

  const data = {
    labels,
    datasets: [
      {
        label: 'Times Triggered',
        data: counts,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#94a3b8', stepSize: 1 },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
    },
  };

  if (!rules.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm italic">
        No rule triggers recorded yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Bar data={data} options={options} />
    </div>
  );
};
