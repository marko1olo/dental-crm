/**
 * PatientCreationExtraSection.tsx — Прогрессивное раскрытие дополнительных клинических и административных данных.
 * Согласно Мандатам 8e и 8n: регистрация требует ровно 2 поля (ФИО + Телефон).
 * Все остальные поля (ДР, представитель, источник, соматика, паспорт) свернуты по умолчанию.
 */

import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import React, { useState } from "react";
import { PatientCreationExtraFields } from "./PatientCreationExtraFields";

export interface PatientCreationExtraSectionProps {
	readonly form: any;
	readonly updatePatientCoreDraft?: any;
}

export function PatientCreationExtraSection({ form }: PatientCreationExtraSectionProps) {
	const shouldAutoOpen =
		form.isChild ||
		Boolean(form.patientAdministrativeProfileDraft.isAnonymous) ||
		!form.isEmergencyOrPrimary ||
		form.showDocFields ||
		Boolean(form.effectiveBirthDate);

	const [isExpanded, setIsExpanded] = useState<boolean>(shouldAutoOpen);
	const isOpen = isExpanded || shouldAutoOpen;

	return (
		<details
			className="create-patient-doc-section mt-1 pt-2 border-t border-[var(--glass-border)]"
			open={isOpen}
			onToggle={(e) => {
				const openState = (e.currentTarget as HTMLDetailsElement).open;
				setIsExpanded(openState);
			}}
		>
			<summary
				className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 cursor-pointer select-none list-none"
				onClick={(e) => {
					e.preventDefault();
					setIsExpanded((prev) => !prev);
				}}
				data-testid="patient-creation-toggle-extra-section-btn"
			>
				<SlidersHorizontal size={14} className="shrink-0" aria-hidden="true" />
				{isOpen ? (
					<ChevronDown size={14} className="shrink-0" aria-hidden="true" />
				) : (
					<ChevronRight size={14} className="shrink-0" aria-hidden="true" />
				)}
				<span>
					{isOpen
						? "Скрыть дополнительные данные"
						: "Дополнительные данные (дата рождения, соматика, документы)"}
				</span>
			</summary>

			<PatientCreationExtraFields form={form} />
		</details>
	);
}
