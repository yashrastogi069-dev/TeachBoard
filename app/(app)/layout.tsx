import type { ReactNode } from "react";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import Copilot from "@/components/shell/Copilot";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden">
          <div
            className="absolute -top-48 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--accent-glow)" }}
          />
        </div>
        <Topbar />
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Copilot />
    </div>
  );
}
