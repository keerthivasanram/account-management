import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertTriangle, X, Lock } from 'lucide-react';

export const SecurityShield = ({ children }) => {
  const { employee } = useAuth();
  const location = useLocation();
  const [violationAlert, setViolationAlert] = useState(null);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // 1. Device Registration on Mount
  useEffect(() => {
    if (!employee) return;
    const registerDevice = async () => {
      try {
        const fingerprint = `device_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
        await api.security.registerDevice({
          device_name: `${navigator.platform || 'Workstation'} (${employee.full_name})`,
          device_fingerprint: fingerprint,
          browser: navigator.userAgent.split(' ')[0] || 'Unknown',
          os: navigator.platform || 'Unknown'
        });
      } catch (err) {
        // Silently fail if offline or dev
      }
    };
    registerDevice();
  }, [employee]);

  // 2. Intercept Screen Capture Keys & Print Events
  useEffect(() => {
    if (!employee) return;

    const handleKeyDown = async (e) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';
      const isSnippingTool = (e.key === 'S' || e.key === 's') && (e.metaKey || e.ctrlKey) && e.shiftKey;
      const isMacCapture = (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key));
      const isPrint = (e.key === 'P' || e.key === 'p') && (e.metaKey || e.ctrlKey);

      if (isPrintScreen || isSnippingTool || isMacCapture || isPrint) {
        e.preventDefault();

        // Overwrite clipboard pixel buffer
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}

        // Trigger alert banner
        setViolationAlert({
          type: 'CAPTURE_ATTEMPT',
          key: e.key || 'PrintScreen',
          time: new Date().toLocaleTimeString()
        });

        // Report incident beacon to backend
        try {
          await api.security.reportIncident({
            event_type: 'SCREENSHOT_KEY_DETECTED',
            route: location.pathname,
            key_combination: `${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Cmd+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`
          });
        } catch (err) {
          console.warn('Incident report beacon delivered');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [employee, location.pathname]);

  return (
    <div className="relative w-full h-full">
      {/* Background/Focus-Loss Blur Guard */}
      {isWindowBlurred && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
          <Lock className="w-12 h-12 text-cyan-400 mb-3 animate-pulse" />
          <h2 className="text-xl font-bold text-white tracking-tight">Confidential Workspace Protected</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Content is obscured while the window is inactive to safeguard against background capture tools.
          </p>
        </div>
      )}

      {/* Security Incident Violation Modal */}
      {violationAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-white">Security Violation Warning</h3>
                <p className="text-xs text-rose-300 font-semibold mt-0.5">
                  Screen capture attempt detected ({violationAlert.key})
                </p>
              </div>
              <button
                onClick={() => setViolationAlert(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              Capturing, screenshotting, or exporting confidential enterprise records is strictly prohibited by company policy. 
              This incident has been logged with your employee identifier (<strong className="text-white font-mono">{employee?.employee_code}</strong>) and dispatched to the System Administrator.
            </p>

            <button
              onClick={() => setViolationAlert(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              Acknowledge & Return to Workspace
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default SecurityShield;
