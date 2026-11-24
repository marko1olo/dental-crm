import React, { lazy, Suspense } from "react";
import { Award, Tag } from "lucide-react";
import { EmkServicesSection } from "../emk/EmkServicesSection";
import { Icd10ClinicalSelector } from "../../diagnostics/Icd10ClinicalSelector";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";
import type { VisitEmkServicesBillingProps } from "./types";
import type { LinkedChairsideLabOrderInfo } from "../../orthopedics/OrthopedicsChairsidePanel";

const OrthopedicsChairsidePanel = lazy(() =>
	import("../../orthopedics/OrthopedicsChairsidePanel").then((m) => ({
		default: m.OrthopedicsChairsidePanel,
	})),
);

interface LabOrderRecord extends LinkedChairsideLabOrderInfo {
	patientId?: string | number | undefined;
}

interface AppointmentWithLab {
	id?: string | number | undefined;
	patientId?: string | number | undefined;
	labOrder?: LinkedChairsideLabOrderInfo | undefined;
}

export function VisitEmkServicesBilling({
	openVisitId,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activePatient,
	dashboard,
	effectiveActiveTooth,
}: VisitEmkServicesBillingProps) {
	const { hasDentalLab } = useWorkspaceProfile();
	const linkedLabOrder: LinkedChairsideLabOrderInfo | undefined = React.useMemo(() => {
		const appts: AppointmentWithLab[] = Array.isArray(dashboard?.appointments)
			? (dashboard.appointments as AppointmentWithLab[])
			: [];
		const currentAppt = appts.find((a) => String(a?.id) === String(openVisitId));
		if (currentAppt?.labOrder) {
			return {
				...currentAppt.labOrder,
				id: currentAppt.labOrder.id ? String(currentAppt.labOrder.id) : undefined,
			};
		}
		if (activePatient?.id) {
			const patientApptWithLab = appts.find(
				(a) => String(a?.patientId) === String(activePatient.id) && a?.labOrder,
			);
			if (patientApptWithLab?.labOrder) {
				return {
					...patientApptWithLab.labOrder,
					id: patientApptWithLab.labOrder.id ? String(patientApptWithLab.labOrder.id) : undefined,
				};
			}
			const labOrders: LabOrderRecord[] = Array.isArray(dashboard?.labOrders)
				? (dashboard.labOrders as LabOrderRecord[])
				: [];
			const foundOrder = labOrders.find(
				(lo) => String(lo?.patientId) === String(activePatient.id),
			);
			if (foundOrder) {
				return {
					...foundOrder,
					id: foundOrder.id ? String(foundOrder.id) : undefined,
				};
			}
		}
		return undefined;
	}, [dashboard?.appointments, dashboard?.labOrders, openVisitId, activePatient?.id]);

	return (
		<div className="space-y-4 w-full min-w-0" data-testid="emk-treatment-section">
			{hasDentalLab && (
				<Suspense fallback={null}>
					<details
						open={Boolean(linkedLabOrder)}
						className="group border-t border-[var(--line)] pt-2 bg-transparent"
						data-testid="emk-orthopedics-details"
					>
						<summary className="cursor-pointer text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
							<span className="flex items-center gap-1.5">
								<Award size={14} className="text-amber-500" />
								<span>Ортопедический протокол и заказ в лабораторию (ЗТЛ)</span>
							</span>
						</summary>
						<div className="pt-2">
							<OrthopedicsChairsidePanel
								key={`ortho-${activePatient?.id ?? "anon"}-${effectiveActiveTooth ?? "all"}-${linkedLabOrder?.id ?? "new"}`}
								patientId={activePatient?.id}
								activeToothFdi={effectiveActiveTooth ?? undefined}
								initialLabOrder={linkedLabOrder}
								isLocked={isLocked}
							/>
						</div>
					</details>
				</Suspense>
			)}

			<EmkServicesSection
				visitId={openVisitId}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
				activePatient={activePatient}
				activeDoctorName={dashboard?.activeDoctor?.fullName}
				clinicLegalName={
					(dashboard?.activeDoctor as { clinicName?: string } | undefined)?.clinicName ||
					((dashboard as Record<string, unknown> | null | undefined)?.organization as { name?: string } | undefined)?.name ||
					"ООО «ДЕНТЕ»"
				}
			/>

			<div className="pt-2">
				<details
					className="group border-t border-[var(--line)] mt-3 pt-2 bg-transparent"
					data-testid="emk-icd10-selector-details"
				>
					<summary className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-between py-1 select-none">
						<span className="flex items-center gap-1.5">
							<Tag size={14} className="text-emerald-500" />
							<span>Клинический классификатор МКБ-10 (Стоматология)</span>
						</span>
					</summary>
					<div className="pt-2">
						<Icd10ClinicalSelector
							selectedTooth={effectiveActiveTooth}
							onSelect={(item, tooth) => {
								const toothSuffix = tooth ? ` (зуб ${tooth})` : "";
								updateVisitNoteField("diagnosis", `${item.code} ${item.titleRu}${toothSuffix}`);
							}}
						/>
					</div>
				</details>
			</div>
		</div>
	);
}
