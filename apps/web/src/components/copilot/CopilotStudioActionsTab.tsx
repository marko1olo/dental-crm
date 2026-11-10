import React, { useState } from "react";
import { Calendar, Activity, Receipt, BookOpen, Sparkles, Brain } from "lucide-react";
import { CRM_FASTIFY_TOOLS_REGISTRY } from "./copilotCatalogData";
import { showToast } from "../GlobalToast";
import { ActiveDiffCard } from "./cards/ActiveDiffCard";
import { CopilotToolLogsView } from "./cards/CopilotToolLogsView";
import type { CopilotToolExecutionLog, CopilotActiveDiff } from "../../store/copilotStore";

export interface CopilotStudioActionsTabProps {
  activeTooth?: number | null | undefined;
  patientId?: string | null | undefined;
  runtimeMode: string;
  toolExecutionLogs: CopilotToolExecutionLog[];
  activeDiff: CopilotActiveDiff | null;
  setActiveDiff: (diff: CopilotActiveDiff | null) => void;
  applyActiveDiff: () => void;
  rejectActiveDiff: () => void;
  executeApiTool: (toolKey: string, payload: Record<string, unknown>) => Promise<void>;
}

export const CopilotStudioActionsTab: React.FC<CopilotStudioActionsTabProps> = ({
  activeTooth,
  patientId,
  runtimeMode,
  toolExecutionLogs,
  activeDiff,
  setActiveDiff,
  applyActiveDiff,
  rejectActiveDiff,
  executeApiTool,
}) => {
  const [actionsSubTab, setActionsSubTab] = useState<"quick" | "logs">("quick");

  return (
    <div className="copilot-actions-grid flex-1 overflow-y-auto p-5 space-y-3.5">
      {/* Apple HIG Segmented Control: Быстрые действия vs Логи инструментов */}
      <div className="flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] gap-1 shrink-0">
        {(["quick", "logs"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActionsSubTab(tab)}
            data-testid={`copilot-actions-subtab-${tab}`}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              actionsSubTab === tab
                ? "bg-[var(--paper)] text-[var(--teal,#0d9488)] font-bold shadow-xs border border-[var(--line)]"
                : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"
            }`}
          >
            <span>{tab === "quick" ? "Быстрые действия" : "Логи и диффы"}</span>
            {tab === "logs" && toolExecutionLogs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold">
                {toolExecutionLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>
      {activeDiff && <ActiveDiffCard diff={activeDiff} onApply={applyActiveDiff} onReject={rejectActiveDiff} />}

      {actionsSubTab === "quick" ? (
        <>
          <p className="text-xs text-[var(--muted)] leading-normal m-0">Клинические инструменты прямого исполнения без блокировок врача:</p>
          {[
            {
              title: "Бронирование слота",
              badge: "Расписание",
              desc: "Резерв следующего этапа терапии через 7 дней без обязательных начмедов.",
              btn: "Забронировать окно приёма",
              icon: <Calendar size={16} className="text-[var(--teal,#0d9488)]" />,
              fn: () => {
                const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                nextWeek.setHours(10, 0, 0, 0);
                void executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot, {
                  patientId: patientId || undefined,
                  startTime: nextWeek.toISOString(),
                  durationMinutes: 30,
                  serviceTitle: "Терапевтический приём",
                  notes: activeTooth ? `Лечение зуба ${activeTooth}` : undefined,
                });
              },
            },
            {
              title: "Зубная формула FDI",
              badge: "Одонтограмма",
              desc: activeTooth ? `Фиксация кариеса дентина и пломбирования зуба ${activeTooth}.` : "Выберите зуб на одонтограмме для быстрой фиксации кариеса дентина.",
              btn: activeTooth ? `Обновить статус зуба ${activeTooth}` : "Выберите зуб на формуле",
              icon: <Activity size={16} className="text-[var(--teal,#0d9488)]" />,
              fn: () => {
                if (!activeTooth) {
                  showToast("Выберите зуб на одонтограмме", "info");
                  return;
                }
                void executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, {
                  patientId: patientId || undefined,
                  toothNumber: activeTooth,
                  state: "caries",
                  notes: "K02.1 Кариес дентина",
                });
              },
            },
            {
              title: "Выставление счёта",
              badge: "Касса и чеки",
              desc: "Пречек на препарирование и нанокомпозитную реставрацию: 6 500 руб.",
              btn: "Сформировать счёт (6 500 руб.)",
              icon: <Receipt size={16} className="text-[var(--teal,#0d9488)]" />,
              fn: () => void executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createInvoiceDraft, {
                patientId: patientId || undefined,
                items: [
                  {
                    title: activeTooth ? `Лечение кариеса (Зуб ${activeTooth})` : "Лечение кариеса и нанокомпозитная реставрация",
                    priceRub: 6500,
                    quantity: 1,
                    toothCode: activeTooth ? String(activeTooth) : undefined,
                  },
                ],
                discountRub: 0,
              }),
            },
            {
              title: "Протокол SOAP в карту",
              badge: "Медкарта",
              desc: "Синтез дневника по стандарту SOAP с жалобами, осмотром и лечением.",
              btn: activeTooth ? `Сформировать протокол SOAP (Зуб ${activeTooth})` : "Сформировать протокол SOAP",
              icon: <BookOpen size={16} className="text-[var(--teal,#0d9488)]" />,
              fn: () => void executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary, {
                toothNumber: activeTooth || undefined,
                diagnosisMkb: "K02.1",
                complaints: activeTooth ? `Жалобы на кратковременные боли от холодного и сладкого в зубе ${activeTooth}` : "Жалобы на кратковременные боли от холодного и сладкого",
                patientId: patientId || undefined,
              }),
            },
            ...(runtimeMode === "desktop_native" ? [
              {
                title: "Захват визиографа (ROI)",
                badge: "Рабочая станция",
                desc: activeTooth ? `Локальный снимок активного окна визиографа для анализа рентгенограммы зуба ${activeTooth}.` : "Локальный снимок активного окна визиографа для анализа рентгенограммы.",
                btn: "Захватить снимок визиографа",
                icon: <Sparkles size={16} className="text-[var(--teal,#0d9488)]" />,
                fn: () => void executeApiTool("capture_workstation_screen", { diagnosticReason: activeTooth ? `Анализ визиографа зуба ${activeTooth}` : "Анализ визиографа", targetScreenIndex: 0 }),
              },
              {
                title: "Поиск КЛКТ на диске",
                badge: "Локальный диск",
                desc: "Сканирование сетевой папки томографа Romexis/Ez3D на наличие новых срезов.",
                btn: "Сканировать папку КЛКТ",
                icon: <Brain size={16} className="text-[var(--teal,#0d9488)]" />,
                fn: () => void executeApiTool("search_workstation_files", { query: "dicom", category: "xray_study" }),
              },
              {
                title: "Патчинг файла на ПК",
                badge: "Файлы и дифф",
                desc: "Точечное обновление протокола на ПК врача через инструмент replace_file_content.",
                btn: "Применить патч файла",
                icon: <Activity size={16} className="text-[var(--teal,#0d9488)]" />,
                fn: () => {
                  const targetProtocolFile = patientId ? `clinical_protocol_${patientId.slice(0, 8)}.txt` : (activeTooth ? `protocol_tooth_${activeTooth}.txt` : "clinical_protocol_draft.txt");
                  void executeApiTool("replace_file_content", {
                    targetFile: targetProtocolFile,
                    targetContent: "Диагноз: первичный осмотр",
                    replacementContent: activeTooth ? `Диагноз: Зуб ${activeTooth} K02.1 кариес дентина` : "Диагноз: Санация полости рта, норма СтАР",
                  });
                },
              },
            ] : []),
          ].map((item, idx) => (
            <div key={idx} className="copilot-action-item-card p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] space-y-2">
              <div className="copilot-action-item-header flex items-center justify-between">
                <div className="flex items-center gap-2">{item.icon}<span className="text-xs font-bold text-[var(--ink)]">{item.title}</span></div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">{item.badge}</span>
              </div>
              <p className="text-xs text-[var(--muted)] m-0">{item.desc}</p>
              <button
                type="button"
                onClick={item.fn}
                className="copilot-action-item-btn w-full h-11 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{item.btn}</span>
              </button>
            </div>
          ))}
        </>
      ) : (
        <CopilotToolLogsView
          logs={toolExecutionLogs}
          onViewDiff={(log) => {
            const a = log.args || {};
            setActiveDiff({
              id: `diff-${log.id}`,
              title: `Дифф: ${log.toolName}`,
              targetEntity: String(a.targetEntity || a.path || a.target || log.toolName),
              beforeText: String(a.beforeText || a.target || "(Исходный фрагмент)"),
              afterText: String(a.afterText || a.replacement || log.resultSummary || "(Измененный фрагмент)"),
              applied: log.status === "success",
            });
          }}
        />
      )}
    </div>
  );
};
