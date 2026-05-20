"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded border border-input shadow-sm transition-colors",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <Primitive.Indicator className="flex items-center justify-center">
      <Check className="h-3 w-3" strokeWidth={3} />
    </Primitive.Indicator>
  </Primitive.Root>
));
Checkbox.displayName = "Checkbox";
