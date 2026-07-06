import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HotkeyTooltipProps {
  hotkey?: string;
  description: string;
  children: React.ReactNode;
}

export function ContextualHelp({ hotkey, description, children }: HotkeyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-xs bg-zinc-900 border border-zinc-700 rounded shadow-lg p-2 z-50 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-300 font-medium">{description}</span>
            {hotkey && (
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider bg-zinc-950 px-1.5 py-0.5 rounded w-fit">
                {hotkey}
              </span>
            )}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-900 border-b border-r border-zinc-700 rotate-45" />
        </div>
      )}
    </div>
  );
}
