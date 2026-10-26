import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const VolumeChart = ({ timeline = [] }) => {
  const { isDark } = useTheme();

  const labels = timeline.map((t) => t.date);
  const txCounts = timeline.map((t) => t.transactions);
  const alertCounts = timeline.map((t) => t.alerts);

  // Dynamic Theme Colors: Dark vs Normal
  const txColor = isDark ? '#3B82F6' : '#2563EB';
  const txBg = isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.1)';
  const alertColor = '#EF4444';
  const alertBg = 'rgba(239, 68, 68, 0.12)';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.85)';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBg = '#0F172A';
  const tooltipBorder = isDark ? '#334155' : '#CBD5E1';
  const tooltipBody = '#CBD5E1';

  const data = {
    labels,
    datasets: [
      {
        label: 'Transactions',
        data: txCounts,
        borderColor: txColor,
        backgroundColor: txBg,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: txColor,
        pointRadius: 4,
      },
      {
        label: 'Alerts Triggered',
        data: alertCounts,
        borderColor: alertColor,
        backgroundColor: alertBg,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: alertColor,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: tickColor,
          font: { family: 'inherit', size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: tooltipBody,
        padding: 10,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: tickColor },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: tickColor, stepSize: 1 },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
};
