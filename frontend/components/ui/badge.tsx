import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        // Status badges with dark mode
        "status-open": "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900",
        "status-in-progress": "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900",
        "status-resolved": "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900",
        "status-closed": "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
        
        // Priority badges with dark mode
        "priority-low": "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
        "priority-medium": "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-400 dark:hover:bg-yellow-900",
        "priority-high": "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
        "priority-critical": "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800",
        
        // Severity badges with dark mode
        "severity-minor": "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900",
        "severity-major": "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900",
        "severity-blocker": "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
        
        // Legacy variants for backward compatibility with dark mode
        default: "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900",
        secondary: "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
        outline: "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
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
