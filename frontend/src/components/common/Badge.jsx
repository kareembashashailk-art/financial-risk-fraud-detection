import React from 'react';

export const RiskBadge = ({ level, score }) => {
  const norm = (level || '').toUpperCase();
  let colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let dotColor = 'bg-emerald-400';

  if (norm === 'HIGH') {
    colorStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
    dotColor = 'bg-rose-400';
  } else if (norm === 'MEDIUM') {
    colorStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dotColor = 'bg-amber-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {norm || 'UNKNOWN'}
      {score !== undefined && <span className="opacity-75">({score})</span>}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const norm = (status || '').toLowerCase();
  let style = 'bg-slate-700 text-slate-300 border-slate-600';
  let label = norm;

  switch (norm) {
    case 'new':
      style = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      label = 'New';
      break;
    case 'under_review':
      style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      label = 'Under Review';
      break;
    case 'escalated':
      style = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      label = 'Escalated';
      break;
    case 'closed':
      style = 'bg-slate-700/50 text-slate-400 border-slate-600';
      label = 'Closed';
      break;
    case 'completed':
      style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      label = 'Completed';
      break;
    case 'failed':
      style = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      label = 'Failed';
      break;
    case 'pending':
      style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      label = 'Pending';
      break;
    default:
      label = norm;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};

export const DecisionBadge = ({ decision }) => {
  if (!decision) return <span className="text-slate-500 text-xs italic">Pending</span>;

  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = decision;

  if (decision === 'confirmed_suspicious') {
    style = 'bg-rose-950/60 text-rose-300 border-rose-700/60';
    label = 'Confirmed Suspicious';
  } else if (decision === 'false_positive') {
    style = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
    label = 'False Positive';
  } else if (decision === 'needs_further_investigation') {
    style = 'bg-amber-950/60 text-amber-300 border-amber-700/60';
    label = 'Needs Investigation';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};
