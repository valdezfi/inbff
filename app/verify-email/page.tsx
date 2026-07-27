import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center bg-[#0A0A0B]">
          <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        </main>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
