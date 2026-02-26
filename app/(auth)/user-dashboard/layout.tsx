"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/user-dashboard", icon: LayoutDashboard },
  { name: "My memberships", href: "/user-dashboard/my-memberships", icon: Users },
  { name: "Profile", href: "/user-dashboard/profile", icon: User },
];

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-aceverse-ice items-stretch">
      {/* Sidebar for Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-aceverse-blue/10 bg-white md:flex">
        <nav className="flex-1 space-y-2 p-4 mt-6">
          <div className="px-3 mb-6 border-b border-aceverse-blue/10 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-aceverse-navy/60">
              User Space
            </h3>
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-aceverse-blue text-white shadow-sm"
                    : "text-aceverse-navy/70 hover:bg-aceverse-blue/10 hover:text-aceverse-navy",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-aceverse-ice p-0">{children}</main>
    </div>
  );
}
