import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export  default function NavLink({
  href,
  icon: Icon,
  children,
  active,
  subItem = false,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
  subItem?: boolean;
  onClick?: () => void;
}) {
  return (
    // <p>l</p>
    <Link href={href} onClick={onClick}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start items-center",
          active && "bg-aceverse-ice text-aceverse-navy font-semibold",
          subItem && "pl-8 text-sm",
        )}
      >
        <Icon
          className={cn(
            "mr-2 h-4 w-4 shrink-0",
            active ? "text-aceverse-blue" : "text-muted-foreground",
          )}
        />
        {children}
      </Button>
    </Link>
  );
}
