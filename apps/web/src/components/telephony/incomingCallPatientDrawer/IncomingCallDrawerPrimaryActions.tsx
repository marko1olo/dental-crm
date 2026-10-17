import React from "react";
import { CalendarCheck, ChevronDown, UserCheck, Zap } from "lucide-react";
import type { PatientSomaticAlert } from "../../../store/telephonyTypes";
import type { QuickSlotOption, QuickSlotType } from "../IncomingCallQuickBooking";

interface IncomingCallDrawerPrimaryActionsProps {
	onToggleQuickBooking: () => void;
	showQuickBooking: boolean;
	onOpenFullPatientView: () => void;
	isKnownPatient: boolean;
	somaticAlerts: PatientSomaticAlert[];
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[] | undefined;
}

export const IncomingCallDrawerPrimaryActions: React.FC<IncomingCallDrawerPrimaryActionsProps> = ({
	onToggleQuickBooking,
	showQuickBooking,
	onOpenFullPatientView,
	isKnownPatient,
	somaticAlerts,
	onQuickBook,
	quickSlots,
}) => {
	const hasAcutePain = somaticAlerts.some((a) => a.category === "pain");

	return (
		<div className="space-y-2">
			{/* 2 Primary Direct Action Buttons (Miller's Law Invariant) */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleQuickBooking}
					className="flex-1 h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
					title="Создать запись на приём (быстрые слоты)"
					data-testid="drawer-action-book"
				>
					<CalendarCheck size={15} />
					<span>Создать запись</span>
					<ChevronDown
						size={14}
						className={`transition-transform duration-200 ${showQuickBooking ? "rotate-180" : ""}`}
					/>
				</button>

				<button
					type="button"
					onClick={onOpenFullPatientView}
					className="flex-1 h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
					title={isKnownPatient ? "Открыть карту пациента в реестре" : "Создать нового пациента в реестре"}
					data-testid="drawer-action-open-card"
				>
					<UserCheck size={15} className="text-[var(--teal)]" />
					<span>{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}</span>
				</button>
			</div>

			{/* Emergency Acute Pain (Cito) Fast Intake Action */}
			{hasAcutePain && (
				<button
					type="button"
					onClick={() => onQuickBook("today_urgent")}
					className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-95"
					style={{ backgroundColor: "#e11d48", color: "#ffffff" }}
					data-testid="drawer-action-cito"
					title="Внеочередная экстренная запись пациента с острой болью"
				>
					<div className="flex items-center gap-1.5">
						<Zap size={14} className="text-amber-300" />
						<span>Острая боль! Внеочередной приём (Cito)</span>
					</div>
					<span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: "#be123c" }}>
						{quickSlots?.[0]?.time || "Срочно"}
					</span>
				</button>
			)}
		</div>
	);
};
