"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export const Avatar = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn("relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof Primitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof Primitive.Fallback>
>(({ className, ...props }, ref) => (
  <Primitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center text-[10px] font-semibold text-white", className)}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
