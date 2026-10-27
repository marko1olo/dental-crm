import React from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { showToast } from "../../../../GlobalToast";

interface VisitToolbarFinishAndSaveProps {
	readonly flushPendingVisitSaves?: (() => Promise<void> | void) | undefined;
	readonly handleFinishVisitAction?: (() => void) | undefined;
}

export function VisitToolbarFinishAndSave({
	flushPendingVisitSaves,
	handleFinishVisitAction,
}: VisitToolbarFinishAndSaveProps) {
	return (
		<>
			{/* Кнопка «Сохранить» на мобильном в шапке */}
			<button
				type="button"
				onClick={async () => {
					if (typeof flushPendingVisitSaves === "function") {
						await flushPendingVisitSaves();
					}
					showToast("Изменения приёма сохранены", "success", 2000);
				}}
				data-testid="btn-save-visit-header-mobile"
				className="sm:hidden secondary-button min-h-[44px] px-3 py-0 text-[13px] font-semibold flex items-center gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-xl whitespace-nowrap h-11 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] shadow-xs"
				title="Сохранить изменения приёма"
			>
				<Check className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span className="text-[13px] font-semibold whitespace-nowrap">Сохранить</span>
			</button>

			{/* Кнопка «Завершить приём» - 100% автономия врача (Мандат 8e: НИКОГДА не блокируется) */}
			<button
				type="button"
				onClick={handleFinishVisitAction}
				data-testid="btn-complete-visit-header"
				className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 py-0 text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white flex items-center gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-xl whitespace-nowrap h-11 shadow-xs transition-all active:scale-[0.98]"
				title="Завершить приём и сохранить все изменения"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
				<span className="hidden sm:inline whitespace-nowrap">Завершить приём и чек</span>
				<span className="sm:hidden text-[13px] font-bold whitespace-nowrap">Завершить</span>
			</button>
		</>
	);
}
