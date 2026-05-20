"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
  >
    <Primitive.Thumb className="pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow ring-0 transition-transform data-[state=checked]:translate-x-[18px]" />
  </Primitive.Root>
));
Switch.displayName = "Switch";
