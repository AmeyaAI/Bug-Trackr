import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
}

export function LoadingOverlay({ isLoading, children, className, ...props }: LoadingOverlayProps) {
  return (
    <div className={cn("relative min-h-[200px]", className)} {...props}>
      <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
