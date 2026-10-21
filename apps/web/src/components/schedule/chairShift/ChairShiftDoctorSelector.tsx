import type React from "react";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import {
	type ChairDoctorShiftAssignment,
	formatDoctorShortName,
} from "../ScheduleGrid";

export interface ChairShiftDoctorSelectorProps {
	chair: ScheduleChair;
	doctors: Array<{ id: string; fullName: string; specialty?: any }>;
	popoverSelectedDocId: Record<string, string>;
	setPopoverSelectedDocId: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	chairDoctorAssignments?:
		| Record<string, ChairDoctorShiftAssignment>
		| undefined;
	dateKey: string;
	onAssignChairDoctor?:
		| ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void)
		| undefined;
}

export function ChairShiftDoctorSelector({
	chair,
	doctors,
	popoverSelectedDocId,
	setPopoverSelectedDocId,
	chairDoctorAssignments,
	dateKey,
	onAssignChairDoctor,
}: ChairShiftDoctorSelectorProps) {
	const handleSelectDoctor = (doc: {
		id: string;
		fullName: string;
		specialty?: any;
	}) => {
		setPopoverSelectedDocId((prev) => ({ ...prev, [chair.id]: doc.id }));
		if (chairDoctorAssignments?.[chair.id]) {
			const cur = chairDoctorAssignments[chair.id]!;
			const updated: ChairDoctorShiftAssignment = {
				...cur,
				doctorId: doc.id,
				doctorName: doc.fullName,
				doctorSpecialty: doc.specialty ? String(doc.specialty) : undefined,
			};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<
					Record<string, ChairDoctorShiftAssignment>
				>(storageKey, {});
				existing[chair.id] = updated;
				safeLocalStorageSetJson(storageKey, existing);
			}
			onAssignChairDoctor?.(chair.id, updated);
			showToast(
				`Дежурный врач кресла «${chair.name}» переключен на: ${formatDoctorShortName(doc.fullName)}`,
				"success",
			);
		} else {
			const initialAssignment: ChairDoctorShiftAssignment = {
				chairId: chair.id,
				chairName: chair.name,
				doctorId: doc.id,
				doctorName: doc.fullName,
				doctorSpecialty: doc.specialty ? String(doc.specialty) : undefined,
				shiftPreset: "full",
				shiftLabel: "Весь день (08:00–20:00)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [
					{
						doctorId: doc.id,
						doctorName: doc.fullName,
						doctorSpecialty: doc.specialty ? String(doc.specialty) : undefined,
						startHour: 8,
						endHour: 20,
						shiftHours: "08:00–20:00",
					},
				],
			};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<
					Record<string, ChairDoctorShiftAssignment>
				>(storageKey, {});
				existing[chair.id] = initialAssignment;
				safeLocalStorageSetJson(storageKey, existing);
			}
			onAssignChairDoctor?.(chair.id, initialAssignment);
			showToast(
				`Врач ${formatDoctorShortName(doc.fullName)} назначен на кресло «${chair.name}» (Весь день 08-20)`,
				"success",
			);
		}
	};

	return (
		<div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
			<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Выберите врача:
			</span>
			{doctors.map((doc) => {
				const currentDocId =
					popoverSelectedDocId[chair.id] ||
					chairDoctorAssignments?.[chair.id]?.doctorId ||
					(chair as any).defaultDoctorId ||
					doctors[0]?.id;
				const isDocSelected = currentDocId === doc.id;
				return (
					<button
						key={doc.id}
						type="button"
						onClick={() => handleSelectDoctor(doc)}
						className={`px-2 py-1 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-colors min-h-[32px] cursor-pointer active:scale-95 ${
							isDocSelected
								? "bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--teal)]/30"
								: "hover:bg-[var(--paper-soft)] text-[var(--ink)]"
						}`}
						data-testid={`chair-view-doc-option-${chair.id}-${doc.id}`}
					>
						<span className="truncate" title={doc.fullName}>
							{doc.fullName}
						</span>
						{(doc as any).specialty && (
							<span
								className="text-xs text-[var(--muted)] truncate ml-1 font-normal"
								title={String((doc as any).specialty)}
							>
								{String((doc as any).specialty)}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
