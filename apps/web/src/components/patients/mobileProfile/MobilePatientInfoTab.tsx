/**
 * DENTE CRM — Mobile Patient Info Tab (Медкарта & Анамнез)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, Mandate 8b <= 120 lines)
 */

import type { Patient } from "@dental/shared";
import React from "react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { MobilePatientToothQuadrantSelector } from "./MobilePatientToothQuadrantSelector";

export interface MobilePatientInfoTabProps {
	patient: Patient;
	patientCoreDraft?: any;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
	onApplySomaticNorm: () => void;
}

export const MobilePatientInfoTab: React.FC<MobilePatientInfoTabProps> = ({
	patient,
	patientCoreDraft,
	updatePatientCoreDraft,
	onApplySomaticNorm,
}) => {
	const phone = patient.phone || "";
	const adminProfile = (patient as any).administrativeProfile;

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-card">
			<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
				<h3 className="text-xs font-bold text-[var(--muted)] m-0">Паспортные данные и контакты</h3>
				<div className="grid grid-cols-1 gap-2 text-xs">
					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Телефон:</span>
						<span className="font-mono font-bold text-[var(--ink)]">{phone ? formatPhoneNumber(phone) : "Не указан"}</span>
					</div>
					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Email:</span>
						<span className="font-mono font-semibold text-[var(--ink)]">{patient.email || "Не указан"}</span>
					</div>
					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Пол:</span>
						<span className="font-semibold text-[var(--ink)]">{patient.gender === "male" ? "Мужской" : patient.gender === "female" ? "Женский" : "Не указан"}</span>
					</div>
					{adminProfile?.snils && (
						<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)] font-medium">СНИЛС:</span>
							<span className="font-mono font-bold text-[var(--ink)]">{adminProfile.snils}</span>
						</div>
					)}
					{adminProfile?.address && (
						<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)] font-medium">Адрес:</span>
							<span className="font-medium text-[var(--ink)] text-right truncate max-w-[200px]">{adminProfile.address}</span>
						</div>
					)}
				</div>
			</div>

			<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-bold text-[var(--muted)] m-0">Клинические заметки и анамнез</h3>
					<button type="button" onClick={onApplySomaticNorm} className="text-xs font-bold text-[var(--teal)] underline cursor-pointer">
						+ Норма
					</button>
				</div>
				<textarea
					rows={3}
					className="w-full p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-all resize-none"
					value={patientCoreDraft?.notes ?? patient.notes ?? ""}
					onChange={(e) => updatePatientCoreDraft?.("notes", e.target.value)}
					placeholder="Клинические особенности, аллергии, дентофобия..."
					data-testid="mobile-patient-notes-textarea"
				/>
				<div className="flex items-center gap-1.5 flex-wrap">
					{["Дентофобия", "Тошнотный рефлекс", "VIP", "Высокий чек"].map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => {
								const current = patientCoreDraft?.notes ?? patient.notes ?? "";
								if (!current.toLowerCase().includes(chip.toLowerCase())) {
									updatePatientCoreDraft?.("notes", current ? `${current}, ${chip}` : chip);
								}
							}}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-[11px] font-semibold border border-[var(--line)] cursor-pointer active:scale-95 transition-all"
						>
							+ {chip}
						</button>
					))}
				</div>
			</div>

			<MobilePatientToothQuadrantSelector />
		</div>
	);
};
MobilePatientInfoTab.displayName = "MobilePatientInfoTab";
