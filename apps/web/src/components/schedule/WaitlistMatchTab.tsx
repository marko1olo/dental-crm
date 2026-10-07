import React from "react";
import { Plus, Sparkles } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { WaitlistBookingCard } from "./WaitlistBookingCard";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import type {
	MatchScoringResult,
	WaitlistPatientEntry,
} from "./waitlistMatchScoring";

export interface WaitlistMatchTabProps {
	scoredPatients: Array<{
		patient: WaitlistPatientEntry;
		scoring: MatchScoringResult;
	}>;
	contactedPatients: Set<string>;
	bookingPatientId: string | null;
	activeTargetSlot: TargetSlotInfo | null;
	activeMenuPatientId: string | null;
	onToggleMenu: (id: string | null) => void;
	onBookPatient: (patient: WaitlistPatientEntry) => void;
	onSendWhatsApp: (patient: WaitlistPatientEntry) => void;
	onCopySms: (patient: WaitlistPatientEntry) => void;
	onSendTelegram: (patient: WaitlistPatientEntry) => void;
	onDelete: (id: string) => void;
	onOpenAddTab: () => void;
}

export const WaitlistMatchTab: React.FC<WaitlistMatchTabProps> = ({
	scoredPatients,
	contactedPatients,
	bookingPatientId,
	activeTargetSlot,
	activeMenuPatientId,
	onToggleMenu,
	onBookPatient,
	onSendWhatsApp,
	onCopySms,
	onSendTelegram,
	onDelete,
	onOpenAddTab,
}) => {
	return (
		<div className="space-y-3" data-testid="match-tab-content">
			{scoredPatients.length === 0 ? (
				<EmptyState
					icon={<Sparkles size={28} />}
					title="В листе ожидания нет подходящих пациентов"
					description="Добавьте пациента в очередь или откройте окно для записи с улицы."
					glass={false}
					action={
						<button
							type="button"
							onClick={onOpenAddTab}
							className="h-8 px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer pointer-coarse:min-h-[44px]"
							data-testid="match-empty-add-btn"
						>
							<Plus className="w-3.5 h-3.5 shrink-0" />
							<span>Добавить в лист ожидания</span>
						</button>
					}
				/>
			) : (
				<div className="space-y-2.5">
					{scoredPatients.map(({ patient, scoring }, idx) => (
						<WaitlistBookingCard
							key={patient.id}
							patient={patient}
							index={idx}
							scoring={scoring}
							isContacted={contactedPatients.has(patient.id)}
							isBooking={bookingPatientId === patient.id}
							activeTargetSlot={activeTargetSlot}
							activeMenuId={activeMenuPatientId}
							onToggleMenu={onToggleMenu}
							onBookPatient={onBookPatient}
							onSendWhatsApp={onSendWhatsApp}
							onCopySms={onCopySms}
							onSendTelegram={onSendTelegram}
							onDelete={onDelete}
							isMatchMode={true}
						/>
					))}
				</div>
			)}
		</div>
	);
};
