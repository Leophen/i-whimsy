'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

import { useToolStore } from '@/stores/use-tool-store';

/** 客户端 hydration 后再读取 localStorage，避免服务端/客户端首帧不一致。 */
function StoreHydrator() {
  React.useEffect(() => {
    void useToolStore.persist.rehydrate();
    useToolStore.getState().setHydrated(true);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={250}>
        <StoreHydrator />
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                '!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lg !text-[13px]',
              description: '!text-muted-foreground',
            },
          }}
        />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
