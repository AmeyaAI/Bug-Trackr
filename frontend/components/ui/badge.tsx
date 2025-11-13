import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        // Status badges
        "status-open": "bg-blue-50 text-blue-500 hover:bg-blue-100",
        "status-in-progress": "bg-amber-50 text-amber-500 hover:bg-amber-100",
        "status-resolved": "bg-green-50 text-green-500 hover:bg-green-100",
        "status-closed": "bg-gray-100 text-gray-500 hover:bg-gray-200",
        
        // Priority badges
        "priority-low": "bg-gray-50 text-gray-400 hover:bg-gray-100",
        "priority-medium": "bg-yellow-50 text-yellow-500 hover:bg-yellow-100",
        "priority-high": "bg-red-50 text-red-500 hover:bg-red-100",
        "priority-critical": "bg-red-100 text-red-600 hover:bg-red-200",
        
        // Severity badges
        "severity-minor": "bg-green-50 text-green-500 hover:bg-green-100",
        "severity-major": "bg-orange-50 text-orange-500 hover:bg-orange-100",
        "severity-blocker": "bg-red-50 text-red-500 hover:bg-red-100",
        
        // Legacy variants for backward compatibility
        default: "bg-blue-50 text-blue-500 hover:bg-blue-100",
        secondary: "bg-green-50 text-green-500 hover:bg-green-100",
        destructive: "bg-red-50 text-red-500 hover:bg-red-100",
        outline: "bg-gray-100 text-gray-500 hover:bg-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
