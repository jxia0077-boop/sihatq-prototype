"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/privacy", icon: "health_and_safety", label: "Assess" },
  { href: "/risk-insight", icon: "analytics", label: "Insights" },
  { href: "/recommendations", icon: "checklist", label: "Actions" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full rounded-t-xl bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(0,106,97,0.05)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {items.map((item) => {
          const active =
            item.href === "/privacy"
              ? pathname.startsWith("/privacy") ||
                pathname.startsWith("/profile") ||
                pathname.startsWith("/analyzing")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex flex-col items-center justify-center rounded-full bg-primary-container px-4 py-1 text-on-primary-container"
                  : "flex flex-col items-center justify-center text-on-surface-variant opacity-70 transition-opacity hover:opacity-100"
              }
            >
              <span
                className="material-symbols-outlined"
                style={
                  active
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
