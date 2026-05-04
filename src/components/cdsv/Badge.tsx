import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../shadcn/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'secure' | 'warning' | 'danger';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'secure', children, ...props }, ref) => {
    const variantStyles = {
      secure: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
      warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
      danger: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
    };
    
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
