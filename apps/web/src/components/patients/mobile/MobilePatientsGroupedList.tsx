/**
 * Dental CRM — Dedicated Mobile Patient Registry & Grouped Inset Cards
 * Compliant with Apple Health / iOS Settings HIG (§2.3 in MOBILE_DESIGN_APPLE_HIG.md)
 */
import { Plus, Search, Users } from "lucide-react";
import React, { useMemo, useState } from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { EmptyState } from "../../EmptyState";
import { MobilePatientCardItem } from "./MobilePatientCardItem";
import { MobilePatientsHeaderBar } from "./MobilePatientsHeaderBar";
import { extractAllergy } from "./patientFormatters";
import type { MobilePatientFilter, MobilePatientsGroupedListProps } from "./types";

export { calculateAge, extractAllergy, extractSomaticNote, formatAgeRu } from "./patientFormatters";

export function MobilePatientsGroupedList({
	patients,
	selectedPatientId,
	onSelectPatient,
	onCreatePatient,
	onOpenTactileSearch,
	patientInsightById,
	query,
	onQueryChange,
	onClearQuery,
	showLostPatientsOnly = false,
	onToggleLostPatients,
	isLoadingLost = false,
	money,
}: MobilePatientsGroupedListProps): React.JSX.Element {
	const [activeFilter, setActiveFilter] = useState<MobilePatientFilter>("all");

	const countAll = patients.length;
	const countAllergy = useMemo(() => patients.filter((p) => Boolean(extractAllergy(p.notes))).length, [patients]);
	const countDebt = useMemo(() => {
		return patients.filter((p) => {
			const insight = patientInsightById?.get(p.id);
			return (insight?.balanceDueRub || (p.balanceRub < 0 ? -p.balanceRub : 0)) > 0;
		}).length;
	}, [patients, patientInsightById]);

	const displayItems = useMemo(() => {
		if (activeFilter === "allergy") return patients.filter((p) => Boolean(extractAllergy(p.notes)));
		if (activeFilter === "debt") {
			return patients.filter((p) => {
				const insight = patientInsightById?.get(p.id);
				return (insight?.balanceDueRub || (p.balanceRub < 0 ? -p.balanceRub : 0)) > 0;
			});
		}
		return patients;
	}, [patients, activeFilter, patientInsightById]);

	return (
		<div className="mobile-patients-container" data-testid="mobile-patients-container">
			<MobilePatientsHeaderBar
				query={query}
				onQueryChange={onQueryChange}
				onClearQuery={onClearQuery}
				activeFilter={activeFilter}
				onSelectFilter={setActiveFilter}
				countAll={countAll}
				countAllergy={countAllergy}
				countDebt={countDebt}
				showLostPatientsOnly={showLostPatientsOnly}
				onToggleLostPatients={onToggleLostPatients}
				isLoadingLost={isLoadingLost}
				onOpenTactileSearch={onOpenTactileSearch}
			/>

			{displayItems.length > 0 ? (
				<div className="mobile-grouped-inset-card" data-testid="mobile-grouped-inset-card">
					{displayItems.map((p) => (
						<MobilePatientCardItem
							key={p.id}
							patient={p}
							isSelected={selectedPatientId === p.id}
							insight={patientInsightById?.get(p.id)}
							money={money}
							onSelectPatient={onSelectPatient}
						/>
					))}
				</div>
			) : (
				<div className="mobile-patients-empty-wrap">
					<EmptyState
						icon={!query.trim() ? <Users size={32} /> : <Search size={28} />}
						title={!query.trim() ? "В картотеке пока нет пациентов" : "Пациент не найден"}
						description={!query.trim() ? "Зарегистрируйте первого пациента кнопкой ниже." : `По запросу «${query.trim()}» ничего не найдено.`}
						action={query.trim() ? (
							<button type="button" className="secondary-button min-h-[44px] px-4 font-semibold" onClick={() => { triggerHaptic("light"); onClearQuery(); }}>
								Сбросить поиск
							</button>
						) : undefined}
					/>
				</div>
			)}

			<button
				type="button"
				className="mobile-patients-fab"
				onClick={() => { triggerHaptic("medium"); onCreatePatient(); }}
				aria-label="Зарегистрировать нового пациента"
				data-testid="mobile-fab-create-patient"
			>
				<Plus size={20} className="shrink-0" aria-hidden="true" />
				<span>Новый пациент</span>
			</button>
		</div>
	);
}
