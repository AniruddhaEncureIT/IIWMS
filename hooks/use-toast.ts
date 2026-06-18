"use client";

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) =>
      sonnerToast.success(message, options),

    error: (message: string, options?: ToastOptions) =>
      sonnerToast.error(message, options),

    warning: (message: string, options?: ToastOptions) =>
      sonnerToast.warning(message, options),

    info: (message: string, options?: ToastOptions) =>
      sonnerToast.info(message, options),

    loading: (message: string, options?: ToastOptions) =>
      sonnerToast.loading(message, options),

    dismiss: (id?: string | number) => sonnerToast.dismiss(id),

    promise: <T>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ) => sonnerToast.promise(promise, messages),
  };
}
