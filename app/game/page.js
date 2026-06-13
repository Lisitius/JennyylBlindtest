import { Suspense } from "react";
import GameClient from "@/components/GameClient";

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-jenny-line border-t-jenny" />
        </main>
      }
    >
      <GameClient />
    </Suspense>
  );
}
