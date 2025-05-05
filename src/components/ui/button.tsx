// src/components/ui/button.tsx

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils'; // Stelle sicher, dass dieser Pfad korrekt ist

// Definition der Button-Varianten (unverändert)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-input bg-background text-foreground shadow-xs ' +
          'hover:bg-muted hover:text-foreground ' +
          'dark:bg-background dark:hover:bg-zinc-800 dark:hover:text-white',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        listAction:
          'text-primary hover:text-primary/90 hover:bg-primary/5 border border-transparent rounded-md px-3 py-1.5 transition-transform duration-150 hover:scale-[0.98] active:scale-[0.96]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Definition und Export des ButtonProps-Typs
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, // Standard HTML Button Attribute
    VariantProps<typeof buttonVariants> {
  // Props von cva (variant, size)
  asChild?: boolean; // asChild Prop
}

// Button-Komponente mit React.forwardRef und ButtonProps
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Entscheiden, ob ein <button> oder der <Slot> gerendert wird
    const Comp = asChild ? Slot : 'button';

    // Rendern der Komponente und Weitergabe der Props und des ref
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref} // Weitergabe des Refs an das DOM-Element
        {...props} // Weitergabe aller anderen Props
      />
    );
  }
);
Button.displayName = 'Button'; // Wichtig für React DevTools

// Export der Komponente und der Varianten-Definition
export { Button, buttonVariants };
