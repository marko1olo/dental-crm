import type { Dashboard, Patient } from "@dental/shared";
import React, { useEffect, useRef, useState } from "react";
import type { PatientListFeatureSalience } from "./patientListFeatureSalience";
import { featureDistinguishes } from "./patientListFeatureSalience";
import { PatientMasterRow } from "./masterListModules/PatientMasterRow";
import { PatientMasterEmptyState } from "./masterListModules/PatientMasterEmptyState";
import { PatientMasterPagination } from "./masterListModules/PatientMasterPagination";

export interface PatientsMasterListProps {
	readonly patients: Patient[];
	readonly selectedPatientId: string | null;
	readonly onSelectPatient: (patientId: string) => void;
	readonly patientInsightById?: Map<string, Dashboard["patientInsights"][number]>;
	readonly patientInsightRiskLabels?: Record<string, string>;
	readonly featureSalience: PatientListFeatureSalience;
	readonly money: (amountRub: number) => string;
	readonly pagination: {
		visibleItems: Patient[];
		displayedCount: number;
		totalCount: number;
		hasMore: boolean;
		loadMore: (step?: number) => void;
		loadAll: () => void;
	};
	readonly onOpenVisit: (patient: Patient) => void;
	readonly onBookAppointment: (patient: Patient) => void;
	readonly onOpenPatientCard: (patient: Patient) => void;
	readonly onOpenCreatePatient: () => void;
	readonly onClearSearch: () => void;
	readonly query: string;
}

// Virtualization: contentVisibility: "auto" containIntrinsicSize: "1px 64px" (useDomListPagination)
export function PatientsMasterList({
	patients, selectedPatientId, onSelectPatient, patientInsightById,
	patientInsightRiskLabels, featureSalience, money, pagination,
	onOpenVisit, onBookAppointment, onOpenPatientCard, onOpenCreatePatient,
	onClearSearch, query,
}: PatientsMasterListProps) {
	const [rowMenuPatientId, setRowMenuPatientId] = useState<string | null>(null);
	const rowMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
				setRowMenuPatientId(null);
			}
		};
		if (rowMenuPatientId) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [rowMenuPatientId]);

	return (
		<div className="patient-list max-md:gap-2 max-md:flex-1 max-md:h-full hidden md:flex">
			{pagination.visibleItems.map((patient) => {
				const insight = patientInsightById?.get(patient.id);
				const isSelected = selectedPatientId === patient.id;
				const riskDistinguishes = insight
					? featureDistinguishes(insight.riskLevel, featureSalience.prevailingRiskLevel)
					: false;
				const nextActionDistinguishes = insight
					? featureDistinguishes((insight.nextBestAction as any) ?? null, featureSalience.prevailingNextAction)
					: false;

				return (
					<PatientMasterRow
						key={patient.id}
						patient={patient}
						isSelected={isSelected}
						insight={insight}
						riskDistinguishes={riskDistinguishes}
						nextActionDistinguishes={nextActionDistinguishes}
						patientInsightRiskLabels={patientInsightRiskLabels}
						money={money}
						isRowMenuOpen={rowMenuPatientId === patient.id}
						rowMenuRef={rowMenuRef}
						onToggleRowMenu={() => setRowMenuPatientId((prev) => (prev === patient.id ? null : patient.id))}
						onCloseRowMenu={() => setRowMenuPatientId(null)}
						onSelectPatient={onSelectPatient}
						onOpenVisit={onOpenVisit}
						onBookAppointment={onBookAppointment}
						onOpenPatientCard={onOpenPatientCard}
					/>
				);
			})}

			<PatientMasterPagination
				displayedCount={pagination.displayedCount}
				totalCount={pagination.totalCount}
				hasMore={pagination.hasMore}
				onLoadMore={pagination.loadMore}
				onLoadAll={pagination.loadAll}
			/>

			{patients.length === 0 && (
				<PatientMasterEmptyState
					query={query}
					onOpenCreatePatient={onOpenCreatePatient}
					onClearSearch={onClearSearch}
				/>
			)}
		</div>
	);
}

export default PatientsMasterList;
