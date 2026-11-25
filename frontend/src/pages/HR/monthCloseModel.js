/** 1 -> "1", 1.5 -> "1½", 0.5 -> "½". */
export const fmtDays = (n) => {
  if (n == null) return '—';
  const whole = Math.floor(n);
  const half = Math.abs(n - whole - 0.5) < 1e-9;
  if (Math.abs(n - whole) < 1e-9) return String(whole);
  return half ? `${whole || ''}½` : n.toFixed(1);
};

export const hasWarnings = (preview) => Boolean(preview?.issues?.some((i) => i.severity === 'warn'));

/** Close is blocked when the server says so, or when warnings exist and haven't been acknowledged. */
export const closeBlocked = (preview, acknowledged) =>
  !preview?.can_lock || (hasWarnings(preview) && !acknowledged);
