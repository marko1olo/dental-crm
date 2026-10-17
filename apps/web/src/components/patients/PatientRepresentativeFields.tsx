import React, { type ChangeEvent } from "react";
import { formatPhoneNumber, formatRussianPassport } from "../../utils/inputSanitation";
import type { PatientAdministrativeProfileDraft } from "./patientsViewModules";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

const RELATIONSHIP_QUICK_OPTIONS = [
	{ label: "Мама", value: "Мать", recipient: "Законному представителю (мать)" },
	{ label: "Папа", value: "Отец", recipient: "Законному представителю (отец)" },
	{ label: "Опекун", value: "Опекун", recipient: "Законному представителю (опекун)" },
] as const;

interface PatientRepresentativeFieldsProps {
	draft: PatientAdministrativeProfileDraft;
	updateDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
	onRepresentativePhoneChange?: (event: TextFieldChangeEvent) => void;
}

export const PatientRepresentativeFields: React.FC<PatientRepresentativeFieldsProps> = ({
	draft, updateDraft, onRepresentativePhoneChange,
}) => {
	const handleSelectRelationship = (value: string, defaultRecipient: string) => {
		updateDraft("legalRepresentativeRelationship", value);
		if (!draft.preferredDocumentRecipient?.trim()) {
			updateDraft("preferredDocumentRecipient", defaultRecipient);
		}
	};

	return (
		<>
			<label>
				ФИО представителя
				<input
					autoComplete="off"
					value={draft.legalRepresentativeFullName}
					onChange={(e: TextFieldChangeEvent) => updateDraft("legalRepresentativeFullName", e.target.value)}
					placeholder="ФИО представителя"
				/>
			</label>
			<label>
				<span className="flex items-center justify-between gap-1 flex-wrap">
					<span>Кем приходится</span>
				</span>
				<div className="flex items-center gap-1.5 flex-wrap my-0.5" role="group" aria-label="Быстрый выбор родства представителя">
					{RELATIONSHIP_QUICK_OPTIONS.map((opt) => {
						const isSelected =
							draft.legalRepresentativeRelationship === opt.value ||
							draft.legalRepresentativeRelationship?.toLowerCase() === opt.value.toLowerCase();
						return (
							<button
								key={opt.value}
								type="button"
								onClick={(e) => { e.preventDefault(); handleSelectRelationship(opt.value, opt.recipient); }}
								className={`min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center ${
									isSelected
										? "bg-teal-500/15 text-[var(--teal)] border-[var(--teal)] shadow-xs font-bold"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-hover)]"
								}`}
								data-testid={`admin-rep-chip-${opt.value.toLowerCase()}`}
							>
								{opt.label}
							</button>
						);
					})}
				</div>
				<input
					autoComplete="off"
					value={draft.legalRepresentativeRelationship}
					onChange={(e: TextFieldChangeEvent) => updateDraft("legalRepresentativeRelationship", e.target.value)}
					placeholder="Родитель, опекун"
				/>
			</label>
			<label>
				Паспорт представителя
				<input
					autoComplete="off"
					value={draft.legalRepresentativeIdentityDocument}
					onChange={(e: TextFieldChangeEvent) => updateDraft("legalRepresentativeIdentityDocument", formatRussianPassport(e.target.value))}
					placeholder="Паспорт / доверенность"
				/>
			</label>
			<label>
				Телефон представителя
				<input
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={draft.legalRepresentativePhone}
					onChange={onRepresentativePhoneChange || ((e: TextFieldChangeEvent) => updateDraft("legalRepresentativePhone", formatPhoneNumber(e.target.value)))}
					placeholder="+7..."
				/>
			</label>
			<label className="form-span-2">
				Кому выдавать документы
				<input
					autoComplete="off"
					value={draft.preferredDocumentRecipient}
					onChange={(e: TextFieldChangeEvent) => updateDraft("preferredDocumentRecipient", e.target.value)}
					placeholder="Пациенту лично / представителю / доверенному лицу"
				/>
			</label>
			<p className="field-note form-span-2">Получатель документов печатается в договоре, согласии и акте.</p>
			<label className="form-span-2">
				Основание обработки персональных данных
				<input
					autoComplete="off"
					value={draft.dataProcessingBasisNote}
					onChange={(e: TextFieldChangeEvent) => updateDraft("dataProcessingBasisNote", e.target.value)}
					placeholder="Согласие пациента, согласие представителя, договор"
				/>
			</label>
			<p className="field-note form-span-2">Основание печатается в согласии на обработку персональных данных.</p>
		</>
	);
};
