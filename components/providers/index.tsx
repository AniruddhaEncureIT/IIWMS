"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { ToastProvider } from "./toast-provider";
import { BrandProvider } from "./brand-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BrandProvider>
        <AuthProvider>
          {children}
          <ToastProvider />
        </AuthProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}
