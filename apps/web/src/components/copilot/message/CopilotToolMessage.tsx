/**
 * @file CopilotToolMessage.tsx
 * @description Agentic Tool Execution Card with Two-Phase Guard & Contiguous Diff (Mandate 8b <= 200 lines).
 */

import React, { useState } from 'react';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown,
  Activity, FileText, Receipt, Calendar, Camera, Wrench, Check, X, Zap
} from 'lucide-react';
import { formatKopecksToRub } from '@dental/shared';
import type { CopilotUiMessage, SelectIdHandler, BookSlotHandler, ConfirmHandler } from '../copilotTypes';
import { CopilotResultCard } from '../CopilotResultCard';
import { resolveActionDiff } from '../actionConfirm/actionConfirmDiff';

export interface CopilotToolMessageProps {
  message: Extract<CopilotUiMessage, { kind: 'tool' }>;
  onSelectPatient?: SelectIdHandler | undefined;
  onSelectAppointment?: SelectIdHandler | undefined;
  onBookSlot?: BookSlotHandler | undefined;
  onConfirm?: ConfirmHandler | undefined;
}

function resolveToolMeta(toolName: string, args?: Record<string, unknown>) {
  const lower = toolName.toLowerCase();
  let Icon = Wrench;
  let cleanName = toolName.replace(/Tool$/, '').split('.').pop() || toolName;
  let paramHint = '';

  if (lower.includes('tooth') || lower.includes('odontogram')) {
    Icon = Activity;
    cleanName = 'updateToothStatusTool';
    if (args?.tooth) paramHint = `Зуб ${args.tooth}`;
  } else if (lower.includes('soap') || lower.includes('diary') || lower.includes('protocol')) {
    Icon = FileText;
    cleanName = 'generateClinicalProtocolEntryTool';
    if (args?.tooth) paramHint = `Зуб ${args.tooth}`;
  } else if (lower.includes('invoice') || lower.includes('billing') || lower.includes('estimate')) {
    Icon = Receipt;
    cleanName = 'createInvoiceDraftTool';
    if (args?.amountKopecks) paramHint = formatKopecksToRub(Number(args.amountKopecks));
    else if (args?.amount_rub) paramHint = `${Number(args.amount_rub).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽`;
  } else if (lower.includes('appointment') || lower.includes('slot') || lower.includes('agenda')) {
    Icon = Calendar;
    cleanName = 'createAppointmentTool';
    if (args?.date) paramHint = String(args.date);
  } else if (lower.includes('capture') || lower.includes('screen') || lower.includes('visio') || lower.includes('dicom')) {
    Icon = Camera;
    cleanName = 'captureWorkstationScreenTool';
    if (args?.targetApp) paramHint = String(args.targetApp);
  }

  const title = `Вызов: ${cleanName}${paramHint ? ` (${paramHint})` : ''}`;
  return { Icon, title };
}

export const CopilotToolMessage: React.FC<CopilotToolMessageProps> = ({
  message,
  onSelectPatient,
  onSelectAppointment,
  onBookSlot,
  onConfirm,
}) => {
  const [showArgs, setShowArgs] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const isRunning = message.status === 'running';
  const isDone = message.status === 'done';
  const isConfirmation = message.status === 'confirmation_required';
  const isError = message.status === 'failed' || message.status === 'error';
  const hasCard = Boolean(isDone && message.result !== undefined && message.result !== null);
  const hasArgs = Boolean(message.args && Object.keys(message.args).length > 0);

  const { Icon, title } = resolveToolMeta(message.name, message.args);
  const durationText = message.durationMs
    ? message.durationMs < 1000 ? `${message.durationMs}мс` : `${(message.durationMs / 1000).toFixed(1)}с`
    : null;

  const clinicalDiff = resolveActionDiff(message.name, (message.args || {}) as Record<string, unknown>, title);
  const diffFrom = clinicalDiff?.from ?? 'Текущее состояние';
  const diffTo = clinicalDiff?.to ?? 'Применение изменений';
  const diffTarget = clinicalDiff?.target ?? title;

  return (
    <div className="copilot-tool-box my-2 p-3 rounded-xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] shadow-sm text-xs">
      {/* Шапка карточки инструмента */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
            <Icon size={13} />
          </div>
          <span className="font-semibold text-[var(--ink,#0f172a)] truncate" title={title}>{title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRunning && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/25 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" />
              <span>Выполняется...</span>
            </span>
          )}
          {isDone && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--success-soft,rgba(16,185,129,0.1))] text-[var(--success,#059669)] border border-[var(--success-border,rgba(16,185,129,0.25))] flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>{`Готово ${durationText ? `(${durationText})` : ''}`}</span>
            </span>
          )}
          {isError && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--danger-soft,rgba(244,63,94,0.1))] text-[var(--danger,#e11d48)] border border-[var(--danger-border,rgba(244,63,94,0.25))] flex items-center gap-1">
              <XCircle size={11} />
              <span>Ошибка</span>
            </span>
          )}
          {isConfirmation && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--warn-soft,rgba(245,158,11,0.1))] text-[var(--warn,#d97706)] border border-[var(--warn-border,rgba(245,158,11,0.25))] flex items-center gap-1">
              <AlertCircle size={11} />
              <span>Требуется подтверждение</span>
            </span>
          )}
        </div>
      </div>

      {/* Ошибка при исполнении */}
      {isError && message.error && (
        <div className="mt-2 p-2 rounded bg-[var(--danger-soft,rgba(244,63,94,0.1))] border border-[var(--danger-border,rgba(244,63,94,0.25))] text-[var(--danger,#e11d48)] font-mono text-[11px]">
          {message.error}
        </div>
      )}

      {/* Двухфазный визуальный дифф изменений (Two-Phase Contiguous Diff) */}
      {isConfirmation && (
        <div className="mt-2.5 pt-2 border-t border-[var(--line,rgba(15,118,110,0.15))] space-y-2">
          {diffTarget && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink)]">
              <Zap size={12} className="text-[var(--primary)]" />
              <span>{diffTarget}</span>
              {clinicalDiff?.badge && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink-muted)]">
                  {clinicalDiff.badge}
                </span>
              )}
            </div>
          )}
          <div className="copilot-contiguous-diff p-2 rounded-lg bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] font-mono text-[11px] space-y-1">
            <div className="diff-line diff-del flex items-center gap-1.5 text-[var(--danger,#e11d48)] bg-[var(--danger-soft,rgba(244,63,94,0.1))] px-2 py-1 rounded">
              <span className="font-bold select-none">-</span>
              <span className="line-through opacity-85">{diffFrom}</span>
            </div>
            <div className="diff-line diff-add flex items-center gap-1.5 text-[var(--success-ink,#047857)] bg-[var(--success-soft,rgba(16,185,129,0.1))] px-2 py-1 rounded font-medium">
              <span className="font-bold select-none">+</span>
              <span>{diffTo}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onConfirm?.(message.callId, 'reject')}
              className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] font-medium flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <X size={13} />
              <span>Отклонить</span>
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(message.callId, 'confirm', message.args)}
              className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-95 font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
            >
              <Check size={13} />
              <span>Применить действие</span>
            </button>
          </div>
        </div>
      )}

      {/* Сворачиваемые аргументы вызова (JSON / параметры) */}
      {hasArgs && (
        <div className="mt-2 pt-1.5 border-t border-[var(--line,rgba(15,118,110,0.12))]">
          <button
            type="button"
            onClick={() => setShowArgs(!showArgs)}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer select-none"
          >
            <span>Параметры ({Object.keys(message.args || {}).length})</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${showArgs ? 'rotate-180' : ''}`} />
          </button>
          {showArgs && (
            <pre className="mt-1.5 p-2 rounded bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] text-[10px] font-mono text-[var(--muted,#64748b)] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(message.args, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Результат исполнения */}
      {hasCard && (
        <div className="mt-2 pt-1.5 border-t border-[var(--line,rgba(15,118,110,0.12))]">
          <button
            type="button"
            onClick={() => setShowResult(!showResult)}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--teal,#0d9488)] hover:underline cursor-pointer select-none mb-1"
          >
            <span>{showResult ? 'Скрыть карточку результата' : 'Показать карточку результата'}</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${showResult ? 'rotate-180' : ''}`} />
          </button>
          {showResult && (
            <CopilotResultCard
              toolName={message.name}
              result={message.result}
              onSelectPatient={onSelectPatient}
              onSelectAppointment={onSelectAppointment}
              onBookSlot={onBookSlot}
            />
          )}
        </div>
      )}
    </div>
  );
};
