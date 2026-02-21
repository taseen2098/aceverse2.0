
import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingDisplayProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

const LoadingDisplay = ({ 
  message, 
  className, 
  fullScreen = false 
}: LoadingDisplayProps) => {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4 p-6 text-center",
      className
    )}>
      <div className="relative">
        <Spinner className="size-12 text-aceverse-blue" />
        <div className="absolute inset-0 size-12 rounded-full border-4 border-aceverse-ice border-t-transparent animate-pulse -z-10" />
      </div>
      {message && (
        <p className="text-aceverse-navy font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingDisplay;
