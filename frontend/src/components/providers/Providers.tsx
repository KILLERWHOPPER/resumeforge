'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { setGlobalErrorHandler } from '@/lib/api';
import { AxiosError } from 'axios';

function GlobalErrorListener() {
  const toast = useToast();

  useEffect(() => {
    setGlobalErrorHandler((error: AxiosError) => {
      const status = error.response?.status;
      let message = '请求失败，请稍后重试';
      if (!error.response) {
        message = '网络连接失败，请检查网络';
      } else if (status && status >= 500) {
        message = '服务器错误，请稍后重试';
      }
      toast.error('操作失败', message);
    });
    return () => setGlobalErrorHandler(null);
  }, [toast]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <GlobalErrorListener />
      {children}
    </ToastProvider>
  );
}
