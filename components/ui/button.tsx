import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black border-slate-200 border-2 border-b-4 active:border-b-2 hover:bg-slate-100 text-slate-500",

        // custom
        locked:
          "bg-neutral-200 text-primary-foreground hover:bg-neutral-200/90 border-neutral-400 border-b-4 active:border-b-0",

        primary:
          "bg-brand-500 text-primary-foreground hover:bg-brand-500/90 border-brand-600 border-b-4 active:border-b-0",
        primaryOutline: "bg-white text-brand-500 hover:bg-slate-100",

        secondary:
          "bg-brand-700 text-primary-foreground hover:bg-brand-700/90 border-brand-900 border-b-4 active:border-b-0",
        secondaryOutline: "bg-white text-brand-700 hover:bg-slate-100",

        // Gold: stands out on navy (e.g. "Continue" on a unit banner).
        gold: "bg-gold-400 text-brand-900 hover:bg-gold-400/90 border-gold-600 border-b-4 active:border-b-0",

        danger:
          "bg-rose-500 text-primary-foreground hover:bg-rose-500/90 border-rose-600 border-b-4 active:border-b-0",
        dangerOutline: "bg-white text-rose-500 hover:bg-slate-100",

        super:
          "bg-indigo-500 text-primary-foreground hover:bg-indigo-500/90 border-indigo-600 border-b-4 active:border-b-0",
        superOutline: "bg-white text-indigo-500 hover:bg-slate-100",

        ghost:
          "bg-transparent text-slate-500 border-transparent border-0 hover:bg-slate-100",

        sidebar:
          "bg-transparent text-slate-500 border-2 border-transparent hover:bg-slate-100 transition-none",
        sidebarOutline:
          "bg-brand-500/15 text-brand-500 border-brand-300 border-2 hover:bg-brand-500/20 transition-none",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",

        // custom
        rounded: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
