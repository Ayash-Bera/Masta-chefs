// SPDX-License-Identifier: MIT
'use client';

import { useCustomToast } from '@/hooks/use-custom-toast';

export function GlobalToastProvider() {
  const { ToastProvider } = useCustomToast();
  return <ToastProvider />;
}
