// SPDX-License-Identifier: MIT
'use client';

import { useState, useCallback } from 'react';
import { CustomToast, ToastContainer } from '@/components/custom-toast';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  description?: string;
}

export function useCustomToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto remove after 5 seconds (except loading)
    if (toast.type !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const toast = {
    success: (title: string, description?: string) => {
      return addToast({ type: 'success', title, description });
    },
    error: (title: string, description?: string) => {
      return addToast({ type: 'error', title, description });
    },
    warning: (title: string, description?: string) => {
      return addToast({ type: 'warning', title, description });
    },
    info: (title: string, description?: string) => {
      return addToast({ type: 'info', title, description });
    },
    loading: (title: string, description?: string) => {
      return addToast({ type: 'loading', title, description });
    },
    dismiss: removeToast,
    update: updateToast
  };

  const ToastProvider = () => {
    if (toasts.length === 0) return null;
    
    return (
      <ToastContainer>
        {toasts.map(toast => (
          <CustomToast
            key={toast.id}
            type={toast.type}
            title={toast.title}
            description={toast.description}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    );
  };

  return { toast, ToastProvider };
}
