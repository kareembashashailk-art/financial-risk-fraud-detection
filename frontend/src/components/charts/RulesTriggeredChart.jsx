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
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const RulesTriggeredChart = ({ rules = [] }) => {
  const { isDark } = useTheme();

  const labels = rules.map((r) => r.rule_name || 'Rule');
  const counts = rules.map((r) => r.count);

  const barBg = isDark ? 'rgba(99, 102, 241, 0.75)' : 'rgba(37, 99, 235, 0.75)';
  const barBorder = isDark ? '#6366F1' : '#2563EB';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.85)';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBorder = isDark ? '#334155' : '#CBD5E1';

  const data = {
    labels,
    datasets: [
      {
        label: 'Times Triggered',
        data: counts,
        backgroundColor: barBg,
        borderColor: barBorder,
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
        backgroundColor: '#0F172A',
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: tickColor, stepSize: 1 },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 11 } },
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
