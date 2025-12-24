import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}) => {
  useEffect(() => {
    if (closeOnEscape && isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white rounded-[2.5rem] shadow-2xl
          animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
          border border-slate-200/50
          ${className}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 rounded-t-[2.5rem]">
            {title && (
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
              </div>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center
                  hover:bg-rose-50 hover:text-rose-500 transition-all duration-200"
                aria-label="Close modal"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
