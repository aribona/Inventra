"use client";

import { cn } from "@/lib/utils";
import { NavContent } from "./nav-content";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar",
        className
      )}
    >
      <NavContent />
    </aside>
  );
}
