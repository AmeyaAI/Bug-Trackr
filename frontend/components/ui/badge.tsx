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
        "priority-lowest": "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 dark:bg-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/40",
        "priority-low": "bg-sky-400/20 text-sky-700 hover:bg-sky-400/30 dark:bg-sky-400/30 dark:text-sky-300 dark:hover:bg-sky-400/40",
        "priority-medium": "bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:bg-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/40",
        "priority-high": "bg-red-400/20 text-red-700 hover:bg-red-400/30 dark:bg-red-400/30 dark:text-red-300 dark:hover:bg-red-400/40",
        "priority-highest": "bg-red-600/25 text-red-800 hover:bg-red-600/35 dark:bg-red-600/35 dark:text-red-200 dark:hover:bg-red-600/45",
        
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
}: React.HTMLAttributes<HTMLSpanElement> &
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
