"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={1800} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
