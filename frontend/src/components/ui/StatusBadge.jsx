import React from 'react';

export const StatusBadge = ({ status = 'ACTIVE', variant, text, className = '' }) => {
  const normalized = (variant || status || '').toUpperCase();

  // Status Color Mapping according to Enterprise Visual Design System
  // Success: #15803D text, #F0FDF4 bg, #BBF7D0 border
  // Warning: #D97706 text, #FFFBEB bg, #FDE68A border
  // Error: #DC2626 text, #FEF2F2 bg, #FECACA border
  // Information: #2563EB text, #EFF6FF bg, #BFDBFE border
  let colorStyles = 'text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0]';
  let dotColor = 'bg-[#64748B]';

  if (['CONNECTED', 'ACTIVE', 'APPROVED', 'RESOLVED', 'COMPLETED', 'PUBLISHED', 'SYNCED', 'ONLINE'].includes(normalized)) {
    colorStyles = 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]';
    dotColor = 'bg-[#15803D]';
  } else if (['PENDING', 'PENDING_APPROVAL', 'IN_REVIEW', 'SUBMITTED', 'IN_PROGRESS', 'SCHEDULED', 'AWAITING'].includes(normalized)) {
    colorStyles = 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
    dotColor = 'bg-[#D97706]';
  } else if (['DISCONNECTED', 'REJECTED', 'FAILED', 'SUSPENDED', 'BLOCKED', 'ERROR', 'CRITICAL', 'OPEN'].includes(normalized)) {
    colorStyles = 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]';
    dotColor = 'bg-[#DC2626]';
  } else if (['INFO', 'CREATOR', 'BUSINESS', 'EMPLOYEE', 'ADMIN', 'STAFF'].includes(normalized)) {
    colorStyles = 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';
    dotColor = 'bg-[#2563EB]';
  }

  // Format label text
  const label = text || normalized.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span className="capitalize">{label.toLowerCase()}</span>
    </span>
  );
};

export default StatusBadge;
