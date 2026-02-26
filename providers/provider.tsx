"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    useAuthStore.getState().initialize();
  });

  return (
    <QueryClientProvider client={queryClient}>
      {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
        {children}
        <Toaster />
      {/* </ThemeProvider> */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
