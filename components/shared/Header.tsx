"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, User, Menu, LogIn, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Image from "next/image";
import { OrgSidebar } from "@/app/org/[organization_id]/_components/org-sidebar/OrgSidebar";
import { useBreadcrumbs } from "@/lib/hooks/useBreadcrumbs";
export const dynamic = "force-dynamic";

const navLinks = [
  { name: "Home", href: "/", icon: Home },
  { name: "Results", href: "/results", icon: BarChart2 },
];

const Header = () => {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const breadcrumbs = useBreadcrumbs();
  const pathSegments = pathname.split("/").filter(Boolean);

  const isOrgPath = pathSegments[0] === "org" && pathSegments.length > 1;
  const logout = useAuthStore((state) => state.signOut);
  const router = useRouter();

  const memberships = useAuthStore(state => state.memberships)

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-6 w-6 text-aceverse-navy" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] border-r border-aceverse-blue/10"
                style={{ backgroundColor: "ghostwhite" }}
              >
                <SheetHeader className="pb-6 border-b border-aceverse-blue/10">
                  <SheetTitle className="text-aceverse-navy flex items-center justify-between">
                    {isOrgPath ? (
                      "Organization Menu"
                    ) : (
                      <div className="relative">
                        <Image
                          src="/Logo.png"
                          alt="AceVerse Logo"
                          fill
                          className="object-contain object-left"
                        />
                      </div>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {isOrgPath
                  //  && organizationId 
                   ? (
                    <OrgSidebar />
                  ) : (
                    navLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive =
                        pathname === link.href ||
                        (link.href !== "/" && pathname.startsWith(link.href));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? "bg-aceverse-blue text-white shadow-md"
                              : "text-aceverse-navy hover:bg-aceverse-blue/10 hover:translate-x-1"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${isActive ? "bg-white/20" : "bg-aceverse-ice"}`}
                          >
                            <Icon size={20} />
                          </div>
                          <span className="font-semibold text-lg">{link.name}</span>
                        </Link>
                      );
                    })
                  )}
                </nav>
                <div className="absolute bottom-8 left-6 right-6 pt-6 border-t border-aceverse-blue/10">
                  <p className="text-xs text-center text-muted-foreground">
                    AceVerse v1.0.4
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-30 h-15">
              <Image
                src="/Logo.png"
                alt="AceVerse Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-aceverse-blue ${
                    isActive ? "text-aceverse-blue" : "text-aceverse-navy"
                  }`}
                >
                  <Icon size={16} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!loading &&
            (user ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-aceverse-ice hover:bg-aceverse-ice"
                  >
                    <User className="h-5 w-5 text-aceverse-navy" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>User Profile</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col space-y-1 pb-4 border-b">
                      <p className="text-sm font-medium leading-none">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account settings and more.
                      </p>
                    </div>

                    <div>
                      <h4 className="flex items-center text-sm font-semibold mb-3">
                        Your Memberships
                      </h4>
                      {memberships.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {memberships.map((membership, idx) => (
                            <Link
                              key={idx}
                              href={`/org/${membership.organization_id}/dashboard`}
                              className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-sm text-aceverse-navy">
                                  {membership.organization?.name ||
                                    "Unknown Organization"}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  Role: {membership.member_role}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No active memberships found.
                        </p>
                      )}
                    </div>

                    <div className="absolute bottom-6 left-6 right-6">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-aceverse-navy hover:text-aceverse-blue"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-aceverse-blue hover:bg-aceverse-blue/90 text-white"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register
                  </Button>
                </Link>
              </>
            ))}
        </div>
      </div>

      {/* Breadcrumb section */}
      <div className="border-b bg-transparent px-4 py-2 md:px-8">
        <div className="container mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                if (crumb.title === "Home") return null;
                return (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast && index > 0 ? (
                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.title}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </header>
  );
};

export default Header;
