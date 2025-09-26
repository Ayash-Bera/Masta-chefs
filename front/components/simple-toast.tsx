// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, Loader2, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  description?: string;
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: (() => void)[] = [];

export function showToast(type: Toast['type'], title: string, description?: string) {
  const id = (++toastId).toString();
  const toast: Toast = { id, type, title, description };
  
  toasts.push(toast);
  
  // Auto remove after 5 seconds (except loading)
  if (type !== 'loading') {
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }
  
  // Notify listeners
  listeners.forEach(listener => listener());
  
  return id;
}

export function removeToast(id: string) {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    listeners.forEach(listener => listener());
  }
}

export function ToastContainer() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 w-80">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-white animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500/40';
      case 'error':
        return 'border-red-500/40';
      case 'warning':
        return 'border-yellow-500/40';
      case 'info':
        return 'border-blue-500/40';
      case 'loading':
        return 'border-white/20';
      default:
        return 'border-white/20';
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.06)';
      case 'error':
        return 'rgba(239, 68, 68, 0.06)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.06)';
      case 'info':
        return 'rgba(59, 130, 246, 0.06)';
      case 'loading':
        return 'rgba(255, 255, 255, 0.06)';
      default:
        return 'rgba(255, 255, 255, 0.06)';
    }
  };

  return (
    <div
      className={`backdrop-blur-3xl backdrop-saturate-200 border ${getBorderColor()} rounded-2xl px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] w-full`}
      style={{ background: getBackgroundColor() }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">
            {toast.title}
          </h4>
          {toast.description && (
            <p className="text-xs text-white/70 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="flex-shrink-0 text-white/40 hover:text-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
