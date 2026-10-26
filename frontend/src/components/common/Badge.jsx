import React from 'react';

export const RiskBadge = ({ level, score }) => {
  const norm = (level || '').toUpperCase();
  let colorStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
  let dotColor = 'bg-emerald-500';

  if (norm === 'HIGH') {
    colorStyle = 'bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse';
    dotColor = 'bg-rose-500';
  } else if (norm === 'MEDIUM') {
    colorStyle = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    dotColor = 'bg-amber-500';
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
  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = norm;

  switch (norm) {
    case 'new':
      style = 'bg-blue-500/15 text-blue-500 border-blue-500/30';
      label = 'New';
      break;
    case 'under_review':
      style = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      label = 'Under Review';
      break;
    case 'escalated':
      style = 'bg-purple-500/15 text-purple-500 border-purple-500/30';
      label = 'Escalated';
      break;
    case 'closed':
      style = 'bg-slate-800 text-slate-400 border-slate-700';
      label = 'Closed';
      break;
    case 'completed':
      style = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      label = 'Completed';
      break;
    case 'failed':
      style = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      label = 'Failed';
      break;
    case 'pending':
      style = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      label = 'Pending';
      break;
    default:
      label = norm;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
};

export const DecisionBadge = ({ decision }) => {
  if (!decision) return <span className="text-slate-500 text-xs italic">Pending</span>;

  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = decision;

  if (decision === 'confirmed_suspicious') {
    style = 'bg-rose-500/15 text-rose-500 border-rose-500/35 font-semibold';
    label = 'Confirmed Suspicious';
  } else if (decision === 'false_positive') {
    style = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35 font-semibold';
    label = 'False Positive';
  } else if (decision === 'needs_further_investigation') {
    style = 'bg-amber-500/15 text-amber-500 border-amber-500/35 font-semibold';
    label = 'Needs Investigation';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};
