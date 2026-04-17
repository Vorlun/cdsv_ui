import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../ui/utils';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'primary', showLabel = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    const variantStyles = {
      primary: 'bg-[#3B82F6]',
      success: 'bg-[#10B981]',
      warning: 'bg-[#F59E0B]',
      danger: 'bg-[#EF4444]',
    };
    
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-[#E5E7EB]">Progress</span>
            <span className="text-sm font-medium text-[#9CA3AF]">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="w-full h-2 bg-[#1F2937] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              variantStyles[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
