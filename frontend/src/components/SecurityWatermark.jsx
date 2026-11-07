import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const SecurityWatermark = () => {
  const { employee } = useAuth();
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!employee) return null;

  const watermarkText = `${employee.employee_code} • ${employee.full_name} • KLARVES CORP • ${timestamp} • CONFIDENTIAL`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed inset-0 z-40 overflow-hidden opacity-[0.035] flex flex-col justify-around rotate-[-15deg] scale-125"
    >
      {[...Array(14)].map((_, rIdx) => (
        <div key={rIdx} className="flex justify-around whitespace-nowrap text-xs font-mono font-medium tracking-widest text-[#172B24]">
          {[...Array(4)].map((_, cIdx) => (
            <span key={cIdx} className="mx-8">
              {watermarkText}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SecurityWatermark;
