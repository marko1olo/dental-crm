import React from "react";
import { Sparkles } from "lucide-react";
import type { ChairsideThoughtStep } from "./chairsideTypes";

export interface ChairsideThoughtStreamProps {
  thoughts: ChairsideThoughtStep[];
  isExecutingAgent: boolean;
}

export const ChairsideThoughtStream: React.FC<ChairsideThoughtStreamProps> = ({
  thoughts,
  isExecutingAgent,
}) => {
  return (
    <div className="chairside-thought-stream" data-testid="chairside-thought-stream">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)] mb-1.5">
        <span className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-[var(--teal)]" /> Размышления ИИ
        </span>
        <span className="text-[10px] text-[var(--ok-fg,var(--teal))] bg-[var(--teal)]/10 px-1.5 py-0.5 rounded font-semibold">
          {isExecutingAgent ? (
            <span className="inline-flex items-center gap-1 animate-pulse">
              <span>Печатает</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-[var(--teal)] animate-pulse [animation-delay:300ms]" />
              </span>
            </span>
          ) : thoughts.length > 0 ? (
            "завершено"
          ) : (
            "готов к работе"
          )}
        </span>
      </div>
      {thoughts.length > 0 ? (
        <ol className="chairside-thought-steps space-y-1 text-xs text-[var(--ink)]">
          {thoughts.map((s) => (
            <li key={s.id}>
              {s.title.replace(/^\d+\.\s*/, "")}
              {s.detail ? <span className="text-[var(--muted)]"> — {s.detail}</span> : null}
            </li>
          ))}
        </ol>
      ) : isExecutingAgent ? (
        <p className="text-xs text-[var(--teal)] font-medium m-0 animate-pulse">
          Формирование клинического протокола и расчет сметы...
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)] italic m-0">
          Готов к работе. Ожидание команды или диктовки...
        </p>
      )}
    </div>
  );
};
