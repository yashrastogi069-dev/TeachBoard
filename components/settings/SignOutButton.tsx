"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition-colors duration-150 hover:border-danger/40 hover:text-danger active:scale-[0.98] disabled:opacity-60"
    >
      <SignOut size={16} />
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
