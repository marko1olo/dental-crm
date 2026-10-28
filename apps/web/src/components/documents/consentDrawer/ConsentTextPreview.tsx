import React from "react";
import type { Patient } from "@dental/shared";
import { CONSENT_OPTIONS } from "./ConsentTypeSelector";
import type { ConsentKindOption } from "./types";

export interface ConsentTextPreviewProps {
	selectedKind: ConsentKindOption;
	patient: Patient | null;
	doctorFullName?: string | null | undefined;
	clinicName?: string | undefined;
}

export const ConsentTextPreview: React.FC<ConsentTextPreviewProps> = ({
	selectedKind,
	patient,
	doctorFullName,
	clinicName = "Стоматологическая клиника",
}) => {
	const currentOption = CONSENT_OPTIONS.find((o) => o.id === selectedKind) ?? CONSENT_OPTIONS[0]!;
	const patientName = patient?.fullName || "_________________________________";
	const birthDate = patient?.birthDate || "___________";
	const doctor = doctorFullName || "Лечащий врач-стоматолог";

	return (
		<div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs max-h-56 overflow-y-auto">
			<div className="font-bold text-[var(--ink)] text-sm">{currentOption.title}</div>
			<div className="text-[var(--muted)] leading-relaxed">
				Я, <strong>{patientName}</strong>, дата рождения: <strong>{birthDate}</strong>, даю добровольное согласие
				клинике «<strong>{clinicName}</strong>» и врачу <strong>{doctor}</strong> на проведение комплекса необходимых
				медицинских вмешательств в соответствии с клинической картиной и планом лечения.
			</div>
			<div className="text-[var(--muted)] leading-relaxed">
				{currentOption.description}. Мне разъяснены цели вмешательства, вероятные клинические риски, возможные
				осложнения при сопутствующих соматических заболеваниях, альтернативные методики лечения и необходимость
				соблюдения назначений врача.
			</div>
			<div className="text-[var(--ink-subtle,#94a3b8)] text-[11px] border-t border-[var(--line)] pt-2 mt-1">
				Электронная графическая подпись пациента приравнивается к личной подписи на бумажном носителе.
			</div>
		</div>
	);
};
