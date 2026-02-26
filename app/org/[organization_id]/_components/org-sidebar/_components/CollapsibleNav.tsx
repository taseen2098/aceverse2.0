import { Button } from "@/components/ui/button";
import { Collapsible,CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function CollapsibleNav({
  title,
  icon: Icon,
  children,
  active,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(active);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between",
            active && "bg-aceverse-ice/50 text-aceverse-navy",
          )}
        >
          <div className="flex items-center">
            <Icon
              className={cn(
                "mr-2 h-4 w-4",
                active ? "text-aceverse-blue" : "text-muted-foreground",
              )}
            />
            {title}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}
