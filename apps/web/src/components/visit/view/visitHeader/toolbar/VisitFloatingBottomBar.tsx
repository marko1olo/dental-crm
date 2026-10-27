import React from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { showToast } from "../../../../GlobalToast";

interface VisitFloatingBottomBarProps {
	readonly flushPendingVisitSaves?: (() => Promise<void> | void) | undefined;
	readonly handleFinishVisitAction?: (() => void) | undefined;
	readonly handleApplySomaticNormQuick?: (() => void) | undefined;
}

export function VisitFloatingBottomBar({
	flushPendingVisitSaves,
	handleFinishVisitAction,
	handleApplySomaticNormQuick,
}: VisitFloatingBottomBarProps) {
	return (
		<div
			className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] bg-[var(--paper-strong,var(--paper))]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg flex items-center justify-between gap-2"
			role="toolbar"
			aria-label="Нижняя панель действий у кресла"
		>
			<button
				type="button"
				onClick={handleApplySomaticNormQuick}
				className="secondary-button min-h-[44px] h-11 px-3 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer rounded-xl shrink-0"
				title="Заполнить нормой"
			>
				<Check className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span>Норма</span>
			</button>

			<button
				type="button"
				onClick={async () => {
					if (typeof flushPendingVisitSaves === "function") {
						await flushPendingVisitSaves();
					}
					showToast("Изменения приёма сохранены", "success", 2000);
				}}
				className="secondary-button min-h-[44px] h-11 px-3 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer rounded-xl shrink-0"
				title="Сохранить изменения приёма"
			>
				<Check className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span>Сохранить</span>
			</button>

			<button
				type="button"
				onClick={handleFinishVisitAction}
				data-testid="btn-complete-visit-bottom-bar"
				className="primary-button flex-1 min-h-[44px] h-11 px-4 py-0 text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-xs active:scale-[0.98] transition-all"
				title="Завершить приём и сохранить все изменения"
			>
				<CheckCircle2 className="w-4 h-4 text-white shrink-0" />
				<span className="whitespace-nowrap font-bold">Завершить приём</span>
			</button>
		</div>
	);
}
