import type { ChangeEvent } from "react";
import React from "react";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { formatPhoneNumber } from "../../utils/inputSanitation";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type TextFieldChangeEvent = ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

export interface PatientCoreEditorFormProps {
	readonly patientCoreDraft: PatientCoreDraft;
	readonly updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
}

export function PatientCoreEditorForm({
	patientCoreDraft,
	updatePatientCoreDraft,
}: PatientCoreEditorFormProps) {
	return (
		<div className="patient-core-form-grid">
			<label>
				ФИО пациента
				<input
					autoComplete="name"
					value={patientCoreDraft.fullName}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientCoreDraft("fullName", event.target.value)
					}
					placeholder="Фамилия Имя Отчество"
				/>
			</label>
			<label>
				Дата рождения
				<input
					type="date"
					autoComplete="bday"
					value={patientCoreDraft.birthDate}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientCoreDraft("birthDate", event.target.value)
					}
				/>
			</label>
			<label>
				Телефон
				<input
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={patientCoreDraft.phone}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientCoreDraft(
							"phone",
							formatPhoneNumber(event.target.value),
						)
					}
					placeholder="+7..."
				/>
			</label>
			<label>
				Email
				<input
					type="email"
					autoComplete="email"
					value={patientCoreDraft.email}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientCoreDraft("email", event.target.value)
					}
					placeholder="patient@mail.ru"
				/>
			</label>

			<div
				className="form-span-2"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<span
						style={{
							fontSize: "12px",
							fontWeight: 700,
							color: "var(--muted)",
						}}
					>
						Заметки и особенности обслуживания
					</span>
					<SmartMicrophoneButton
						context="general"
						onResult={(t) => {
							const prev = patientCoreDraft.notes || "";
							updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
						}}
					/>
				</div>
				<textarea
					value={patientCoreDraft.notes}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientCoreDraft("notes", event.target.value)
					}
					placeholder="Особые пожелания, сервисные примечания, скидки, семья"
					rows={2}
					style={{
						width: "100%",
						padding: "8px 12px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						fontSize: "13px",
						resize: "vertical",
						background: "var(--paper)",
						color: "var(--ink)",
						boxSizing: "border-box",
					}}
				/>

				{/* 3 Semantic Categories of Quick Chips (Safety, Comfort, Finance & Service) */}
				<div className="quick-chips-group">
					<div className="quick-chips-group-title flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
						<span className="w-1.5 h-1.5 rounded-full bg-rose-500/80 inline-block shrink-0" aria-hidden="true" />
						<span>Аллергии и соматический статус:</span>
					</div>
					<div className="quick-chips-wrap flex flex-wrap gap-1.5 max-w-full">
						{[
							"Аллергия на латекс",
							"Аллергия на анестезию",
							"Бронхиальная астма",
							"Гипертония",
							"Сахарный диабет",
							"Антикоагулянты",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								className="quick-chip quick-chip-somatic max-w-[200px] truncate"
								title={`+ ${chip}`}
								onClick={() => {
									const currentVal = patientCoreDraft.notes.trim();
									const chipLower = chip.toLowerCase();
									if (currentVal.toLowerCase().includes(chipLower))
										return;
									const newVal = currentVal
										? `${currentVal}, ${chipLower}`
										: chipLower;
									updatePatientCoreDraft("notes", newVal);
								}}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>

				<div className="quick-chips-group">
					<div className="quick-chips-group-title flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
						<span className="w-1.5 h-1.5 rounded-full bg-teal-500/80 inline-block shrink-0" aria-hidden="true" />
						<span>Особенности приёма и комфорт:</span>
					</div>
					<div className="quick-chips-wrap flex flex-wrap gap-1.5 max-w-full">
						{[
							"Боится уколов",
							"Дентофобия / тревожный",
							"Рвотный рефлекс",
							"Ортодонтический пациент",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								className="quick-chip quick-chip-comfort max-w-[200px] truncate"
								title={`+ ${chip}`}
								onClick={() => {
									const currentVal = patientCoreDraft.notes.trim();
									const chipLower = chip.toLowerCase();
									if (currentVal.toLowerCase().includes(chipLower))
										return;
									const newVal = currentVal
										? `${currentVal}, ${chipLower}`
										: chipLower;
									updatePatientCoreDraft("notes", newVal);
								}}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>

				<div className="quick-chips-group">
					<div className="quick-chips-group-title flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
						<span className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 inline-block shrink-0" aria-hidden="true" />
						<span>Сервис и финансовый статус:</span>
					</div>
					<div className="quick-chips-wrap flex flex-wrap gap-1.5 max-w-full">
						{[
							"VIP",
							"Семейный счёт",
							"Согласовать скидку",
							"Контроль расчётов",
							"Высокий средний чек",
							"Уточнять явку",
							"Звонить заранее",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								className="quick-chip quick-chip-finance max-w-[200px] truncate"
								title={`+ ${chip}`}
								onClick={() => {
									const currentVal = patientCoreDraft.notes.trim();
									const chipLower = chip.toLowerCase();
									if (currentVal.toLowerCase().includes(chipLower))
										return;
									const newVal = currentVal
										? `${currentVal}, ${chipLower}`
										: chipLower;
									updatePatientCoreDraft("notes", newVal);
								}}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
