import React from "react";
import { Tag } from "lucide-react";
import { REGISTRY_SERVICE_TAGS } from "./constants";
import type { PatientGeneralInfo } from "./types";

interface RegistryNotesCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	onToggleServiceTag: (tag: string) => void;
}

export const RegistryNotesCard: React.FC<RegistryNotesCardProps> = ({
	patient, onUpdatePatient, disabled = false, onToggleServiceTag,
}) => {
	return (
		<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2.5">
			<div className="flex items-center justify-between gap-1 flex-wrap">
				<div className="flex items-center gap-1.5">
					<Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
					<span className="text-xs font-bold text-[var(--ink)]">Служебная заметка для регистратуры:</span>
				</div>
				<span className="text-[10px] text-[var(--muted)] font-medium">Администраторы</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{REGISTRY_SERVICE_TAGS.map((tag) => {
					const active = Array.isArray(patient?.serviceAlertTags) && patient.serviceAlertTags.includes(tag);
					return (
						<button
							key={tag} type="button"
							className={`min-h-[44px] sm:min-h-[28px] text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-all border cursor-pointer inline-flex items-center gap-1 ${
								active ? "bg-amber-500 text-white border-amber-600 shadow-2xs font-bold" : "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => onToggleServiceTag(tag)} data-testid={`chip-service-tag-${tag}`} disabled={disabled}
						>
							<span>{tag}</span>
						</button>
					);
				})}
			</div>

			<textarea
				rows={2}
				className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
				value={patient?.registryNotes ?? patient?.notes ?? ""}
				onChange={(e) => {
					onUpdatePatient?.("registryNotes", e.target.value);
					onUpdatePatient?.("notes", e.target.value);
				}}
				placeholder="Особые пожелания по времени, конфликтность, звонки с напоминанием..."
				disabled={disabled} data-testid="textarea-registry-notes"
			/>
		</div>
	);
};
