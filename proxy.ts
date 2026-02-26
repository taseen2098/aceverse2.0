import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { staffLinks } from "./app/org/[organization_id]/_lib/navLinks";

export default async function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const pathParts = pathname.split('/');
  const response = NextResponse.next({
    request: {
      headers: request.headers,

    },
  });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected paths
  const protectedPaths = ["/admin", "/org", "/api/student", "/api/exams"];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !user) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access
  if (user && request.nextUrl.pathname.startsWith("/org")) {
    const orgId = pathParts[2];
    const { data , error } = await supabase
      .from("memberships")
      .select("member_role")
      .eq("user_id", user.id)
      .eq("organization_id", orgId);
      
    if (error) {
      console.error("Error fetching memberships:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const staffPaths = staffLinks.map((link) => link.link);
    const isStaffPath = staffPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path),
    );

    const isStaff =
      data?.some((m) => m.member_role === "admin") ||
      data?.some((m) => ["owner", "manager", "teacher"].includes(m.member_role));

    if (isStaffPath && !isStaff) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
