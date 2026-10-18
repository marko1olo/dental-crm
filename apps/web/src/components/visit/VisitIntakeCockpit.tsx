import React, { useState, useMemo } from "react";
import { showToast } from "../GlobalToast";
import {
	IntakeQueueAndSearchSection,
	IntakeSomaticCheckboxesGrid,
	IntakeVitalSignsBar,
	IntakeCockpitHeader,
	IntakeCockpitTriageSection,
	createDefaultHealthyIntakeSomaticState,
	createDefaultNormalVitalSigns,
} from "./intakeCockpitModules";
import type {
	IntakeSomaticQuestionnaireState,
	IntakeVitalSignsState,
	VisitIntakeCockpitProps,
} from "./intakeCockpitModules/intakeCockpitTypes";

export {
	IntakeQueueAndSearchSection,
	IntakeSomaticCheckboxesGrid,
	IntakeVitalSignsBar,
	IntakeCockpitHeader,
	IntakeCockpitTriageSection,
};
export * from "./intakeCockpitModules/intakeCockpitTypes";

export function VisitIntakeCockpit({
	dashboard,
	activeDoctor,
	onSelectPatient,
	onEmergencyIntake,
}: VisitIntakeCockpitProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [queueFilter, setQueueFilter] = useState<"all" | "waiting" | "my_doctor">("all");
	const [vitals, setVitals] = useState<IntakeVitalSignsState>(createDefaultNormalVitalSigns);
	const [somaticState, setSomaticState] = useState<IntakeSomaticQuestionnaireState>(
		createDefaultHealthyIntakeSomaticState,
	);
	const [isChairsideTriageOpen, setIsChairsideTriageOpen] = useState(false);

	const todayAppointments = useMemo(() => {
		const list = dashboard?.appointments || [];
		const todayIso = (dashboard as any)?.todayIso || new Date().toISOString().slice(0, 10);
		return list
			.filter((app: any) => {
				const appDate = (app.startsAt || "").slice(0, 10);
				return !appDate || appDate === todayIso;
			})
			.sort((a: any, b: any) => (a.startsAt || "").localeCompare(b.startsAt || ""));
	}, [dashboard?.appointments, (dashboard as any)?.todayIso]);

	const handleStartNextInQueue = () => {
		const waiting = todayAppointments.find((a: any) => {
			const s = String(a.status || "").toLowerCase();
			return s === "arrived" || s === "waiting" || s === "in_progress";
		});
		if (waiting && waiting.patientId) {
			onSelectPatient(waiting.patientId, waiting.id);
			showToast(`Открыт приём: ${(waiting as any).patientName || "Пациент"}`, "success");
			return;
		}
		if (todayAppointments.length > 0 && todayAppointments[0]?.patientId) {
			onSelectPatient(todayAppointments[0].patientId, todayAppointments[0].id);
			showToast(`Открыт приём: ${(todayAppointments[0] as any)?.patientName || "Пациент"}`, "success");
			return;
		}
		const allPatients = dashboard?.patients || [];
		if (allPatients.length > 0 && allPatients[0]) {
			onSelectPatient(allPatients[0].id);
			showToast(`Открыта карта: ${allPatients[0].fullName}`, "info");
			return;
		}
		showToast("Нет пациентов в очереди", "warning");
	};

	return (
		<div
			className="dente-intake-cockpit max-w-7xl mx-auto p-3 sm:p-5 flex flex-col gap-4 text-[var(--ink)]"
			data-testid="visit-intake-cockpit"
		>
			<IntakeCockpitHeader
				activeDoctor={activeDoctor}
				hasAppointments={todayAppointments.length > 0}
				onStartNextInQueue={handleStartNextInQueue}
				isChairsideTriageOpen={isChairsideTriageOpen}
				onToggleChairsideTriage={() => setIsChairsideTriageOpen((prev) => !prev)}
				onEmergencyIntake={onEmergencyIntake}
			/>

			{isChairsideTriageOpen && (
				<IntakeCockpitTriageSection
					vitals={vitals}
					setVitals={setVitals}
					somaticState={somaticState}
					setSomaticState={setSomaticState}
				/>
			)}

			<section className="rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs overflow-hidden">
				<IntakeQueueAndSearchSection
					dashboard={dashboard as any}
					activeDoctor={activeDoctor}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					queueFilter={queueFilter}
					setQueueFilter={setQueueFilter}
					onSelectPatient={onSelectPatient}
				/>
			</section>
		</div>
	);
}
