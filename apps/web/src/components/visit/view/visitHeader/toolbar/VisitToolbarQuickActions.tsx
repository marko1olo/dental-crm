import React from "react";
import { FlaskConical, AlertTriangle } from "lucide-react";
import { useAppStore } from "../../../../../store/appStore";
import { showToast } from "../../../../GlobalToast";
import { VisitShiftQueueControls } from "../VisitTimerAndStatusControls";
import type { VisitActionButtonsToolbarProps } from "../types";

type VisitToolbarQuickActionsProps = Pick<
	VisitActionButtonsToolbarProps,
	| "onOpenLabOrderModal"
	| "setIsEmergencyModalOpen"
	| "shiftDayQueue"
	| "isQueueLobbyDropdownOpen"
	| "setIsQueueLobbyDropdownOpen"
	| "queueLobbyDropdownRef"
>;

export function VisitToolbarQuickActions({
	onOpenLabOrderModal,
	setIsEmergencyModalOpen,
	shiftDayQueue,
	isQueueLobbyDropdownOpen,
	setIsQueueLobbyDropdownOpen,
	queueLobbyDropdownRef,
}: VisitToolbarQuickActionsProps) {
	return (
		<>
			{/* Наряд ЗТЛ для ортопеда у кресла */}
			<button
				type="button"
				onClick={() => {
					if (typeof onOpenLabOrderModal === "function") {
						onOpenLabOrderModal();
					} else {
						useAppStore.getState().setCurrentView("lab");
						showToast("Открыт журнал ЗТЛ", "info");
					}
				}}
				data-testid="btn-visit-lab-order-fast"
				className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 h-11 px-2.5 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 rounded-xl shadow-xs"
				title="Наряд в зуботехническую лабораторию (ЗТЛ)"
				aria-label="Наряд в лабораторию ЗТЛ"
			>
				<FlaskConical className="w-4 h-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
				<span className="hidden sm:inline">Наряд ЗТЛ</span>
				<span className="sm:hidden">ЗТЛ</span>
			</button>

			{/* Экстренная помощь / Аптечка анти-шок (тихий служебный доступ) */}
			<button
				type="button"
				onClick={() => setIsEmergencyModalOpen(true)}
				data-testid="btn-visit-emergency-rescue"
				className="visit-emergency-rescue-quiet hidden 2xl:inline-flex secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-medium text-[var(--ink-muted)] hover:text-rose-600 border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/30 items-center gap-1.5 cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors"
				title="Экстренная помощь у кресла (шпаргалка 112, аптечка первой линии)"
			>
				<AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
				<span>Экстренная помощь</span>
			</button>

			{/* 3-Стадийная оперативная очередь смены */}
			<VisitShiftQueueControls
				shiftDayQueue={shiftDayQueue}
				isQueueLobbyDropdownOpen={isQueueLobbyDropdownOpen}
				setIsQueueLobbyDropdownOpen={setIsQueueLobbyDropdownOpen}
				queueLobbyDropdownRef={queueLobbyDropdownRef}
			/>
		</>
	);
}
