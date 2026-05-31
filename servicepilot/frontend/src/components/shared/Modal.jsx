import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'default' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card w-full ${sizes[size]} max-h-[92vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between p-5 border-b border-surface-100 dark:border-surface-700 sticky top-0 bg-white dark:bg-surface-800 z-10">
          <h3 className="text-lg font-bold text-surface-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
