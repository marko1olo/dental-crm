/**
 * apps/web/src/components/visit/mobileChairside/ToothQuickStatusSheet.tsx
 * DENTE Dental CRM — Native iOS Bottom Sheet for Tooth Clinical Status
 * Standard: Apple HIG & Touch Ergonomics (Mandate 8ze & Mandate 8e)
 *
 * Invariants:
 * 1. Touch Targets >= 44x44px (List items >= 52px height)
 * 2. Grouped List Cards (iOS Settings / Apple Health style)
 * 3. 0px Horizontal Drift (overflow-x: clip; max-width: 100vw)
 * 4. All 17 Clinical States structured by clinical discipline
 * 5. Natural Thumb Zone Sticky Footer with 1-click Norm action
 */

import React, { useMemo } from "react";
import { CheckCircle2, ShieldCheck, Stethoscope, Zap, Crown, Syringe } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { TOOTH_STATUS_OPTIONS, type ToothStatusOptionItem } from "./types";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";

export interface ToothQuickStatusSheetProps {
  readonly toothNumber: string | null;
  readonly isOpen: boolean;
  readonly currentStatus?: string | undefined;
  readonly onClose: () => void;
  readonly onSelectStatus: (statusId: string, item: ToothStatusOptionItem) => void;
  readonly testId?: string | undefined;
}

interface CategoryGroup {
  id: "therapy" | "endo" | "orthopedics" | "surgery";
  title: string;
  icon: React.ReactNode;
  items: readonly ToothStatusOptionItem[];
}

export const ToothQuickStatusSheet: React.FC<ToothQuickStatusSheetProps> = ({
  toothNumber,
  isOpen,
  currentStatus,
  onClose,
  onSelectStatus,
  testId = "mobile-tooth-quick-status-sheet",
}) => {
  const numericTooth = toothNumber ? Number.parseInt(toothNumber, 10) : null;
  const subtitle = numericTooth ? getToothFolkAndAnatomicalNameRu(numericTooth) : undefined;

  const groupedOptions = useMemo<CategoryGroup[]>(() => {
    const therapyItems = TOOTH_STATUS_OPTIONS.filter((i) => i.category === "therapy");
    const endoItems = TOOTH_STATUS_OPTIONS.filter((i) => i.category === "endo");
    const orthoItems = TOOTH_STATUS_OPTIONS.filter((i) => i.category === "orthopedics");
    const surgeryItems = TOOTH_STATUS_OPTIONS.filter((i) => i.category === "surgery");

    return [
      {
        id: "therapy",
        title: "Терапия и профилактика",
        icon: <Stethoscope size={15} className="text-emerald-600 dark:text-emerald-400" />,
        items: therapyItems,
      },
      {
        id: "endo",
        title: "Эндодонтия и корни",
        icon: <Zap size={15} className="text-rose-600 dark:text-rose-400" />,
        items: endoItems,
      },
      {
        id: "orthopedics",
        title: "Ортопедия и реставрация",
        icon: <Crown size={15} className="text-blue-600 dark:text-blue-400" />,
        items: orthoItems,
      },
      {
        id: "surgery",
        title: "Хирургия и имплантация",
        icon: <Syringe size={15} className="text-indigo-600 dark:text-indigo-400" />,
        items: surgeryItems,
      },
    ];
  }, []);

  if (!toothNumber) return null;

  const handleSelect = (item: ToothStatusOptionItem) => {
    triggerHaptic("selection");
    onSelectStatus(item.id, item);
  };

  const footerAction = (
    <div className="flex gap-2 w-full">
      <button
        type="button"
        onClick={() => {
          const healthyItem = TOOTH_STATUS_OPTIONS.find((i) => i.id === "Healthy");
          if (healthyItem) {
            triggerHaptic("success");
            onSelectStatus("Healthy", healthyItem);
          }
        }}
        className="flex-1 min-h-[50px] h-[50px] rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
        data-testid={`${testId}-healthy-norm-btn`}
      >
        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
        <span>✓ Здоров / Интактный (Норма)</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[50px] h-[50px] px-5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-bold text-sm flex items-center justify-center active:scale-98 transition-transform cursor-pointer"
      >
        Отмена
      </button>
    </div>
  );

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Зуб ${toothNumber}: Клинический статус`}
      subtitle={subtitle}
      footer={footerAction}
      testId={testId}
    >
      <div className="w-full max-w-full overflow-x-clip box-border space-y-4 pb-4">
        {groupedOptions.map((group) => (
          <div key={group.id} className="w-full">
            <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
              {group.icon}
              <span>{group.title}</span>
            </div>
            <div className="w-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-[var(--line-subtle,#f1f5f9)] dark:divide-slate-800/80">
              {group.items.map((item) => {
                const isCurrent = currentStatus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-slate-800/60 select-none ${
                      isCurrent
                        ? "bg-teal-500/10 dark:bg-teal-950/30"
                        : "bg-transparent"
                    }`}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-bold leading-snug break-words ${
                          isCurrent ? "text-teal-700 dark:text-teal-300 font-black" : "text-[var(--ink,#0f172a)]"
                        }`}>
                          {item.label}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300">
                            Текущий
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5 leading-snug break-words">
                        {item.desc}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-center w-6 h-6">
                      {isCurrent ? (
                        <CheckCircle2 size={20} className="text-teal-600 dark:text-teal-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--line-strong,#cbd5e1)] dark:border-slate-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </MobileBottomSheet>
  );
};
