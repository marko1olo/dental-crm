/**
 * PatientContactsRepresentativeStep.tsx — Layer 1: Контакты, умный голосовой ввод, опекуны/представители и рекламный источник.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - Умный разбор голосовой диктовки в ФИО, телефон и дату рождения.
 * - Анти-дубликатный фильтр с 1-клик переходом в существующую карту.
 * - Экспресс-привязка законного представителя ребёнка (<18 лет).
 * - Рекламный источник обращения по настройкам клиники.
 */

import {
	AlertTriangle,
	Baby,
	ExternalLink,
	Megaphone,
	Phone,
	Users,
} from "lucide-react";
import React, { useState } from "react";
import type { ChangeEvent } from "react";
import { DictationHints } from "../../../DictationHints";
import { parsePatientDictationLocal } from "../../../lib/smartPatientParser";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../../SmartParsePreview";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { DENTAL_ADVERTISING_SOURCES } from "../patientFieldRequirementsConfig";
import { CHILD_REPRESENTATIVE_ROLES } from "./constants";
import type { PatientContactsRepresentativeStepProps } from "./types";

export function PatientContactsRepresentativeStep({
	newPatientName,
	onNameChange,
	onQuickCreateKeyDown,
	nameInputRef,
	validationErrors,
	potentialDuplicates,
	onSelectExistingPatient,
	effectivePhone,
	onPhoneChange,
	effectiveBirthDate,
	onBirthDateChange,
	isChild,
	onToggleChild,
	parentRole,
	onParentRoleChange,
	parentName,
	onParentNameChange,
	parentPhone,
	onParentPhoneChange,
	onCopyChildPhone,
	advertisingSource,
	onAdvertisingSourceChange,
	fieldRequirements,
	isAnonymous,
	updatePatientCoreDraft,
}: PatientContactsRepresentativeStepProps) {
	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);

	return (
		<>
			{/* Full Name field with voice & smart parse preview */}
			<div className="create-patient-form-field">
				<div className="create-patient-label-row">
					<label
						htmlFor="patient-create-full-name"
						className="create-patient-label"
					>
						ФИО пациента <span className="text-rose-500 font-bold">*</span>
					</label>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<button
							type="button"
							className="create-patient-smart-parse-btn"
							onClick={() => setShowHints(!showHints)}
							title="Показать примеры голосового ввода"
							style={{
								fontSize: "12px",
								minHeight: "32px",
								padding: "4px 8px",
							}}
						>
							{showHints ? "Скрыть подсказку" : "? Подсказка"}
						</button>
						{(newPatientName ?? "").trim().length > 0 ? (
							<button
								type="button"
								className="create-patient-smart-parse-btn"
								onClick={() => {
									setSmartParsedData(
										parsePatientDictationLocal(newPatientName),
									);
									setShowSmartPreview(true);
									setShowHints(false);
								}}
								title="Разобрать строку на ФИО, телефон и дату рождения"
							>
								Разобрать строку
							</button>
						) : null}
					</div>
				</div>

				<div className="smart-input-wrapper">
					<input
						ref={nameInputRef}
						id="patient-create-full-name"
						data-testid="patient-creation-fullname-input"
						autoComplete="name"
						value={newPatientName}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onNameChange(event.target.value)
						}
						onKeyDown={onQuickCreateKeyDown}
						placeholder="Фамилия Имя Отчество"
						className={`create-patient-input ${validationErrors.fullName ? "border-rose-500" : ""}`}
						aria-invalid={!!validationErrors.fullName}
					/>
					<SmartMicrophoneButton
						context="patient"
						onResult={(text) => {
							onNameChange(text);
							const parsed = parsePatientDictationLocal(text);
							setSmartParsedData(parsed);
							setShowSmartPreview(true);
							setShowHints(false);
						}}
						style={{
							position: "absolute",
							right: "6px",
							top: "50%",
							transform: "translateY(-50%)",
						}}
					/>
					<DictationHints isVisible={showHints} type="patient" />
					<SmartParsePreview
						isVisible={showSmartPreview}
						parsedData={smartParsedData as SmartParsedPayload | null}
						rawText={newPatientName}
						type="patient"
						onApply={(payload: SmartParsedPayload) => {
							if (payload) {
								onNameChange(payload.fullName || newPatientName);
								if (payload.phone) onPhoneChange(payload.phone);
								if (payload.birthDate) onBirthDateChange(payload.birthDate);
								if (payload.notes && updatePatientCoreDraft) {
									updatePatientCoreDraft("notes", payload.notes);
								}
							}
							setShowSmartPreview(false);
						}}
						onManual={() => setShowSmartPreview(false)}
						onClose={() => setShowSmartPreview(false)}
					/>
				</div>
				{validationErrors.fullName && (
					<span className="text-xs text-rose-500 font-semibold mt-1">
						{validationErrors.fullName}
					</span>
				)}

				{/* Anti-Duplicate Warning in Patient Creation */}
				{potentialDuplicates.length > 0 && (
					<div
						className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2 mt-2"
						data-testid="create-patient-duplicate-warning"
					>
						<div className="flex items-start gap-2">
							<AlertTriangle
								size={16}
								className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
							/>
							<div className="space-y-0.5">
								<p className="font-bold m-0">
									Похожий пациент уже зарегистрирован:
								</p>
								<p className="m-0 text-[var(--muted)]">
									Во избежание дублирования карт вы можете открыть
									существующую карту:
								</p>
							</div>
						</div>
						<div className="space-y-1.5 pl-6">
							{potentialDuplicates.map((item) => {
								const p = item.patient;
								const reasonLabel =
									item.duplicateReason === "both"
										? "ФИО и Телефон"
										: item.duplicateReason === "phone"
											? "Совпадение по телефону"
											: item.duplicateReason === "fuzzy_name"
												? `Похожее ФИО (${item.score}%)`
												: "Совпадение по ФИО";

								return (
									<div
										key={p.id}
										className="w-full p-2.5 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500/60 transition-colors flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="font-bold text-[var(--ink)] truncate text-xs">
													{item.fullNameHighlights.map((part, pIdx) =>
														part.isMatch ? (
															<mark
																key={pIdx}
																className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
															>
																{part.text}
															</mark>
														) : (
															<span key={pIdx}>{part.text}</span>
														),
													)}
												</span>
												<span
													className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0"
													data-testid="duplicate-reason-badge"
												>
													{reasonLabel}
												</span>
											</div>
											<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5 flex-wrap">
												{p.phone && (
													<span className="font-mono flex items-center gap-1">
														<Phone size={10} className="shrink-0 opacity-70" />
														<span>
															{item.phoneHighlights.map((part, pIdx) =>
																part.isMatch ? (
																	<mark
																		key={pIdx}
																		className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
																	>
																		{part.text}
																	</mark>
																) : (
																	<span key={pIdx}>{part.text}</span>
																),
															)}
														</span>
													</span>
												)}
												{p.birthDate && (
													<span>д.р. {p.birthDate}</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												type="button"
												onClick={() => onSelectExistingPatient(p.id)}
												className="px-2.5 py-1 rounded-md text-xs font-semibold !bg-[var(--teal)] !text-white hover:brightness-110 transition-all cursor-pointer shadow-sm min-h-[30px]"
												data-testid="select-existing-patient-btn"
												title="Выбрать эту карту и закрыть форму создания"
											>
												Выбрать эту карту
											</button>
											<button
												type="button"
												onClick={() => {
													window.open(
														`/patients?id=${p.id}`,
														"_blank",
														"noopener,noreferrer",
													);
												}}
												className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--glass-border)] transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
												title="Открыть карту в новом окне"
												aria-label="Открыть карту в новом окне"
											>
												<ExternalLink size={13} />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Phone & Birth Date grid */}
			<div className="create-patient-grid-2">
				<div className="create-patient-form-field">
					<label
						htmlFor="patient-create-phone"
						className="create-patient-label"
					>
						Телефон{" "}
						{fieldRequirements.requirePhone && !isAnonymous ? (
							<span className="text-rose-500 font-bold">*</span>
						) : (
							<span className="text-xs text-[var(--muted)] font-normal">
								(опция)
							</span>
						)}
					</label>
					<input
						id="patient-create-phone"
						data-testid="patient-creation-phone-input"
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						title="Телефон нового пациента"
						placeholder="+7 (999) 000-00-00"
						value={effectivePhone}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onPhoneChange(formatPhoneNumber(event.target.value))
						}
						onKeyDown={onQuickCreateKeyDown}
						className={`create-patient-input ${validationErrors.phone ? "border-rose-500" : ""}`}
						aria-invalid={!!validationErrors.phone}
					/>
					{validationErrors.phone && (
						<span className="text-xs text-rose-500 font-semibold mt-1">
							{validationErrors.phone}
						</span>
					)}
				</div>

				<div className="create-patient-form-field">
					<div className="flex items-center justify-between">
						<label
							htmlFor="patient-create-birth-date"
							className="create-patient-label"
						>
							Дата рождения{" "}
							{fieldRequirements.requireBirthDate ? (
								<span className="text-rose-500 font-bold">*</span>
							) : (
								<span className="text-xs text-[var(--muted)] font-normal">
									(опция)
								</span>
							)}
						</label>
						<button
							type="button"
							onClick={onToggleChild}
							data-testid="patient-create-child-toggle"
							className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
								isChild
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--glass-border)] hover:text-[var(--ink)]"
							}`}
							title="Переключить режим ребенка (<18 лет) для привязки родителя"
						>
							<Baby size={12} className="shrink-0" />
							<span>{isChild ? "Ребёнок (<18)" : "+ Ребёнок"}</span>
						</button>
					</div>
					<input
						id="patient-create-birth-date"
						type="date"
						autoComplete="bday"
						title="Дата рождения нового пациента"
						value={effectiveBirthDate}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onBirthDateChange(event.target.value)
						}
						onKeyDown={onQuickCreateKeyDown}
						className={`create-patient-input ${validationErrors.birthDate ? "border-rose-500" : ""}`}
						aria-invalid={!!validationErrors.birthDate}
					/>
					{validationErrors.birthDate && (
						<span className="text-xs text-rose-500 font-semibold mt-1">
							{validationErrors.birthDate}
						</span>
					)}
				</div>
			</div>

			{/* 1-Click Child Parent / Guardian Binding Section (Mandate 8e, 8n) */}
			{isChild && (
				<div
					className="p-3 rounded-xl border border-teal-500/40 bg-teal-500/10 space-y-2.5 mt-2 animate-in fade-in duration-200"
					data-testid="create-patient-child-rep-section"
				>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
							<Users size={14} className="text-[var(--teal)] shrink-0" />
							<span>Привязка родителя / опекуна</span>
						</div>
						<span className="text-[11px] text-[var(--muted)]">
							Быстрое оформление • Для записи и звонков
						</span>
					</div>

					{/* 1-Click Role Chips */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{CHILD_REPRESENTATIVE_ROLES.map((item) => (
							<button
								key={item.role}
								type="button"
								data-testid={item.testId}
								onClick={() => onParentRoleChange(item.role)}
								className={`min-h-[30px] px-2.5 py-1 text-xs rounded-lg font-bold border transition cursor-pointer ${
									parentRole === item.role
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
										: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{item.label}
							</button>
						))}
					</div>

					{/* 2 Clean Inputs: Имя родителя + Телефон родителя */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div className="create-patient-form-field">
							<label
								htmlFor="patient-create-parent-name"
								className="create-patient-label text-xs"
							>
								Имя родителя
							</label>
							<input
								id="patient-create-parent-name"
								type="text"
								placeholder="Например: Анна Смирнова"
								value={parentName}
								onChange={(e) => onParentNameChange(e.target.value)}
								className="create-patient-input text-xs"
								data-testid="input-child-parent-name"
							/>
						</div>

						<div className="create-patient-form-field">
							<div className="flex items-center justify-between">
								<label
									htmlFor="patient-create-parent-phone"
									className="create-patient-label text-xs"
								>
									Телефон родителя
								</label>
								{effectivePhone && (
									<button
										type="button"
										onClick={onCopyChildPhone}
										className="text-[10px] text-[var(--teal)] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
										title="Скопировать телефон ребенка родителю"
										data-testid="btn-copy-child-phone"
									>
										Взять телефон ребёнка
									</button>
								)}
							</div>
							<input
								id="patient-create-parent-phone"
								type="tel"
								inputMode="tel"
								placeholder="+7 (999) 000-00-00"
								value={parentPhone}
								onChange={(e) => onParentPhoneChange(e.target.value)}
								className="create-patient-input text-xs"
								data-testid="input-child-parent-phone"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Marketing / Advertising Source Selection (Feature #28 & #35) */}
			<div className="create-patient-form-field mt-2">
				<label
					htmlFor="patient-create-advertising-source"
					className="create-patient-label flex items-center justify-between"
				>
					<span className="inline-flex items-center gap-1.5">
						<Megaphone size={14} className="text-[var(--teal)]" />
						Рекламный источник{" "}
						{fieldRequirements.requireAdvertisingSource ? (
							<span className="text-rose-500 font-bold">*</span>
						) : (
							<span className="text-xs text-[var(--muted)] font-normal">
								(для аналитики)
							</span>
						)}
					</span>
					{fieldRequirements.requireAdvertisingSource && (
						<span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
							Обязательно по настройке клиники
						</span>
					)}
				</label>
				<select
					id="patient-create-advertising-source"
					value={advertisingSource}
					onChange={(e) => onAdvertisingSourceChange(e.target.value)}
					className={`create-patient-input ${validationErrors.advertisingSource ? "border-rose-500" : ""}`}
					aria-invalid={!!validationErrors.advertisingSource}
					data-testid="patient-create-advertising-source-select"
				>
					<option value="">— Выберите источник обращения —</option>
					<optgroup label="Онлайн-самозапись (Автоматические каналы)">
						{DENTAL_ADVERTISING_SOURCES.filter(
							(s) => s.isOnlineSelfBooking,
						).map((s) => (
							<option key={s.key} value={s.key}>
								{s.label}
							</option>
						))}
					</optgroup>
					<optgroup label="Администратор, Сарафан и Офлайн">
						{DENTAL_ADVERTISING_SOURCES.filter(
							(s) => !s.isOnlineSelfBooking,
						).map((s) => (
							<option key={s.key} value={s.key}>
								{s.label}
							</option>
						))}
					</optgroup>
				</select>
				{validationErrors.advertisingSource && (
					<span className="text-xs text-rose-500 font-semibold mt-1">
						{validationErrors.advertisingSource}
					</span>
				)}
			</div>
		</>
	);
}
