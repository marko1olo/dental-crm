import * as React from "react";
import type { LucideProps } from "lucide-react";

export interface DentalIconProps extends LucideProps {}

export function createDentalIcon(
  displayName: string,
  lucideClass: string,
  svgElements: React.ReactNode
): React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
> {
  const Component = React.forwardRef<SVGSVGElement, LucideProps>(
    (
      {
        size = 24,
        strokeWidth = 1.75,
        color = "currentColor",
        className = "",
        children,
        ...props
      },
      ref
    ) => (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          className ? `lucide ${lucideClass} ${className}` : `lucide ${lucideClass}`
        }
        {...props}
      >
        {svgElements}
        {children}
      </svg>
    )
  );

  Component.displayName = displayName;
  return Component;
}
