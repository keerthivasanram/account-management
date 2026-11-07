import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action? This operation cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="bg-white border border-[#E5E7EB] rounded-lg shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                danger
                  ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                  : 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#172B24]">
                {title}
              </h3>
              <p className="text-sm text-[#64748B] mt-1.5 font-normal leading-relaxed">
                {message}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#172B24] p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <SecondaryButton onClick={onClose} disabled={loading}>
            {cancelText}
          </SecondaryButton>
          {danger ? (
            <SecondaryButton
              danger
              onClick={onConfirm}
              loading={loading}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[#DC2626]"
            >
              {confirmText}
            </SecondaryButton>
          ) : (
            <PrimaryButton onClick={onConfirm} loading={loading}>
              {confirmText}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
