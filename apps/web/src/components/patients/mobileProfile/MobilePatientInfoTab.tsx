/**
 * DENTE CRM — Mobile Patient Info Tab (Медкарта & Анамнез)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Passport Data, Clinical Notes & Comfort Chips,
 * Mobile Quadrant Dental Chart Selector (Q1..Q4).
 */

import type { Patient } from "@dental/shared";
import React, { useState } from "react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { showToast } from "../../GlobalToast";

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
	const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);

	const phone = patient.phone || "";

	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-card">
			{/* Passport & Contact Details Grouped Card */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
				<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
					Паспортные данные и контакты
				</h3>

				<div className="grid grid-cols-1 gap-2 text-xs">
					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Телефон:</span>
						<span className="font-mono font-bold text-[var(--ink)]">
							{phone ? formatPhoneNumber(phone) : "Не указан"}
						</span>
					</div>

					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Email:</span>
						<span className="font-mono font-semibold text-[var(--ink)]">
							{patient.email || "Не указан"}
						</span>
					</div>

					<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)] font-medium">Пол:</span>
						<span className="font-semibold text-[var(--ink)]">
							{patient.gender === "male"
								? "Мужской"
								: patient.gender === "female"
									? "Женский"
									: "Не указан"}
						</span>
					</div>

					{(patient as any).administrativeProfile?.snils && (
						<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)] font-medium">СНИЛС:</span>
							<span className="font-mono font-bold text-[var(--ink)]">
								{(patient as any).administrativeProfile.snils}
							</span>
						</div>
					)}

					{(patient as any).administrativeProfile?.address && (
						<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
							<span className="text-[var(--muted)] font-medium">Адрес:</span>
							<span className="font-medium text-[var(--ink)] text-right truncate max-w-[200px]">
								{(patient as any).administrativeProfile.address}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Clinical Notes Card */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
						Клинические заметки и анамнез
					</h3>
					<button
						type="button"
						onClick={onApplySomaticNorm}
						className="text-xs font-bold text-[var(--teal)] underline cursor-pointer"
					>
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

				{/* Quick Clinical Comfort Chips */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{["Дентофобия", "Тошнотный рефлекс", "VIP", "Высокий чек"].map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => {
								const current = patientCoreDraft?.notes ?? patient.notes ?? "";
								if (!current.toLowerCase().includes(chip.toLowerCase())) {
									updatePatientCoreDraft?.(
										"notes",
										current ? `${current}, ${chip}` : chip,
									);
								}
							}}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-[11px] font-semibold border border-[var(--line)] cursor-pointer active:scale-95 transition-all"
						>
							+ {chip}
						</button>
					))}
				</div>
			</div>

			{/* Mobile Quadrant Dental Chart Selector */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
						Зубная формула (Квадранты)
					</h3>
					<span className="text-[11px] text-[var(--muted)]">Взрослая (FDI)</span>
				</div>

				{/* Quadrant Switcher */}
				<div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					{([1, 2, 3, 4] as const).map((q) => (
						<button
							key={q}
							type="button"
							onClick={() => setActiveQuadrant(q)}
							className={`min-h-[36px] py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
								activeQuadrant === q
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Q{q} {q === 1 ? "18-11" : q === 2 ? "21-28" : q === 3 ? "31-38" : "48-41"}
						</button>
					))}
				</div>

				{/* Quadrant Teeth Grid (>=44x44px per tooth) */}
				<div className="grid grid-cols-4 gap-2 pt-1">
					{(activeQuadrant === 1
						? [18, 17, 16, 15, 14, 13, 12, 11]
						: activeQuadrant === 2
							? [21, 22, 23, 24, 25, 26, 27, 28]
							: activeQuadrant === 3
								? [31, 32, 33, 34, 35, 36, 37, 38]
								: [48, 47, 46, 45, 44, 43, 42, 41]
					).map((tooth) => (
						<button
							key={tooth}
							type="button"
							onClick={() => {
								showToast(`Выбран зуб ${tooth}`, "info");
							}}
							className="min-h-[46px] h-12 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-xs font-bold text-[var(--ink)]"
						>
							<span className="text-sm font-black text-teal-600 dark:text-teal-400">
								{tooth}
							</span>
							<span className="text-[10px] text-[var(--muted)] font-normal">Норма</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
