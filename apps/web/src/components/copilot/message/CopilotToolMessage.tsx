/**
 * @file CopilotToolMessage.tsx
 * @description Agentic Tool Execution Card with Two-Phase Guard & Contiguous Diff (Mandate 8b <= 200 lines).
 */

import React, { useState } from 'react';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown,
  Activity, FileText, Receipt, Calendar, Camera, Pill, Wrench, Check, X
} from 'lucide-react';
import type { CopilotUiMessage, SelectIdHandler, BookSlotHandler, ConfirmHandler } from '../copilotTypes';
import { CopilotResultCard } from '../CopilotResultCard';

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
  } else if (lower.includes('soap') || lower.includes('diary') || lower.includes('protocol') || lower.includes('043')) {
    Icon = FileText;
    cleanName = 'generateForm043Tool';
    if (args?.tooth) paramHint = `Зуб ${args.tooth}`;
  } else if (lower.includes('invoice') || lower.includes('billing') || lower.includes('estimate')) {
    Icon = Receipt;
    cleanName = 'createInvoiceDraftTool';
    if (args?.amountKopecks) paramHint = `${Math.round(Number(args.amountKopecks) / 100).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽`;
    else if (args?.amount_rub) paramHint = `${Number(args.amount_rub).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽`;
  } else if (lower.includes('appointment') || lower.includes('slot') || lower.includes('agenda')) {
    Icon = Calendar;
    cleanName = 'createAppointmentTool';
    if (args?.date) paramHint = String(args.date);
  } else if (lower.includes('capture') || lower.includes('screen') || lower.includes('visio') || lower.includes('dicom')) {
    Icon = Camera;
    cleanName = 'captureWorkstationScreenTool';
    if (args?.targetApp) paramHint = String(args.targetApp);
  } else if (lower.includes('drug') || lower.includes('medication') || lower.includes('prescription')) {
    Icon = Pill;
    cleanName = 'checkDrugInteractionsTool';
    if (args?.drug_name || args?.medication) paramHint = String(args.drug_name || args.medication);
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

  const toothNumber = message.args?.tooth || 36;
  const oldState = String(message.args?.old_status || message.args?.previous_status || 'Без патологии / Интактный');
  const newState = String(message.args?.treatment || message.args?.diagnosis || (message.args?.state === 'C' ? 'K02.1 Кариес дентина, пломба нанокомпозит' : 'Обновление статуса'));

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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>{`Готово ${durationText ? `(${durationText})` : ''}`}</span>
            </span>
          )}
          {isError && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <XCircle size={11} />
              <span>Ошибка</span>
            </span>
          )}
          {isConfirmation && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <AlertCircle size={11} />
              <span>Требуется подтверждение</span>
            </span>
          )}
        </div>
      </div>

      {/* Ошибка при исполнении */}
      {isError && message.error && (
        <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono text-[11px]">
          {message.error}
        </div>
      )}

      {/* Двухфазный визуальный дифф изменений (Two-Phase Contiguous Diff) */}
      {isConfirmation && (
        <div className="mt-2.5 pt-2 border-t border-[var(--line,rgba(15,118,110,0.15))] space-y-2">
          <div className="copilot-contiguous-diff p-2 rounded-lg bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] font-mono text-[11px] space-y-1">
            <div className="diff-line diff-del flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
              <span className="font-bold select-none">-</span>
              <span className="line-through opacity-85">{`Зуб ${toothNumber}: ${oldState}`}</span>
            </div>
            <div className="diff-line diff-add flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-medium">
              <span className="font-bold select-none">+</span>
              <span>{`Зуб ${toothNumber}: ${newState}`}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onConfirm?.(message.callId, 'reject')}
              className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5 cursor-pointer text-xs"
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
              <span>Применить в карту</span>
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
