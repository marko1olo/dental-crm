import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { LostPatientCard } from "../LostPatientCard";
import type { LostPatientRow } from "./lostPatientTypes";

interface LostPatientsRiskListProps {
	readonly loading: boolean;
	readonly error: string | null;
	readonly filteredPatients: readonly LostPatientRow[];
	readonly openMenuPatientId: string | null;
	readonly onToggleMenu: (id: string) => void;
	readonly onOpenCard: (patientId: string) => void;
	readonly onGenerateOffer: (patient: LostPatientRow) => void;
}

export function LostPatientsRiskList({
	loading,
	error,
	filteredPatients,
	openMenuPatientId,
	onToggleMenu,
	onOpenCard,
	onGenerateOffer,
}: LostPatientsRiskListProps) {
	if (loading) {
		return (
			<div className="py-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
				<RefreshCw className="w-4 h-4 animate-spin text-[var(--teal)]" />
				Загрузка пациентов зоны риска...
			</div>
		);
	}

	if (error) {
		return (
			<div
				role="alert"
				className="p-3 rounded-lg border border-[var(--danger,#e11d48)]/25 text-xs bg-[var(--danger-soft,rgba(225,29,72,0.08))] text-[var(--danger,#e11d48)] flex items-center gap-2"
			>
				<AlertTriangle className="w-4 h-4 flex-shrink-0" />
				<span>{error}</span>
			</div>
		);
	}

	if (filteredPatients.length === 0) {
		return (
			<div className="py-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-lg border border-dashed border-[var(--line)]">
				Пациентов по выбранным критериям риска не найдено.
			</div>
		);
	}

	return (
		<div className="space-y-2 max-h-96 overflow-y-auto pr-1 pb-16">
			{filteredPatients.map((patient) => (
				<LostPatientCard
					key={patient.id}
					patient={patient}
					isOpenMenu={openMenuPatientId === patient.id}
					onToggleMenu={() => onToggleMenu(patient.id)}
					onOpenCard={onOpenCard}
					onGenerateOffer={onGenerateOffer}
				/>
			))}
		</div>
	);
}
