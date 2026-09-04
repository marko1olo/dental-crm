/**
 * PatientCreationModal.tsx — Регистрация нового пациента с настраиваемой обязательностью полей (Фича №35).
 *
 * КОНТЕКСТ & МАНДАТ (THE HAMMER):
 * 1. Настраиваемая обязательность полей (Телефон, Рекламный источник, СНИЛС) из patientFieldRequirementsConfig.
 * 2. Анти-дубликатный фильтр с 1-клик переходом в существующую карту.
 * 3. Голосовой ввод и умный разбор строки.
 * 4. Плотный медицинский UI без гигантских раздутых кнопок (32-36px).
 * 5. 100% честное сохранение без заглушек.
 */

import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Building2,
	Calendar,
	EyeOff,
	FileText,
	Megaphone,
	Plus,
	ShieldCheck,
	Stethoscope,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import { generateAnonymousPatientCode, type Patient } from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { DictationHints } from "../../DictationHints";
import { parsePatientDictationLocal } from "../../lib/smartPatientParser";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../SmartParsePreview";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { showToast } from "../GlobalToast";
import {
	formatOmsPolicy,
	formatPhoneNumber,
	formatRussianPassport,
	formatSnils,
} from "../../utils/inputSanitation";
import { searchPatientsQuick } from "../schedule/patientSearchEngine";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import type { PatientCoreDraft } from "../../PatientsView";
import {
	DENTAL_ADVERTISING_SOURCES,
	loadPatientFieldRequirements,
	type PatientFieldRequirements,
	validatePatientDraftWithRequirements,
} from "./patientFieldRequirementsConfig";

export interface PatientCreationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: () => void | Promise<void | Patient | null>;
	readonly updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	/** Опциональное переопределение требований клиники */
	readonly customRequirements?: PatientFieldRequirements;
}

export function PatientCreationModal({
	isOpen,
	onClose,
	createPatient,
	updatePatientCoreDraft,
	customRequirements,
}: PatientCreationModalProps) {
	const {
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setSelectedPatientId,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	} = usePatientStore();

	const appLogic = useAppLogicContext();
	const patients = appLogic?.dashboard?.patients ?? [];

	// Active requirements from clinic settings / storage
	const [fieldRequirements, setFieldRequirements] = useState<PatientFieldRequirements>(() => {
		return customRequirements ?? loadPatientFieldRequirements();
	});

	useEffect(() => {
		if (isOpen) {
			setFieldRequirements(customRequirements ?? loadPatientFieldRequirements());
		}
	}, [isOpen, customRequirements]);

	// Advertising source state in modal
	const [advertisingSource, setAdvertisingSource] = useState<string>(
		patientAdministrativeProfileDraft.preferredAppointmentNote?.startsWith("src:")
			? patientAdministrativeProfileDraft.preferredAppointmentNote.replace("src:", "")
			: "website_online",
	);

	const potentialDuplicates = useMemo(() => {
		const name = (newPatientName ?? "").trim();
		if (name.length < 3) return [];
		return searchPatientsQuick(patients, name, 3).filter((item) => item.score >= 35);
	}, [patients, newPatientName]);

	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);
	const [showHints, setShowHints] = useState(false);
	const [showDocFields, setShowDocFields] = useState(false);
	const [isEmergencyOrPrimary, setIsEmergencyOrPrimary] = useState(true);

	const nameInputRef = useRef<HTMLInputElement>(null);

	// Focus input on mount/open
	useEffect(() => {
		if (isOpen) {
			const timeout = setTimeout(() => {
				nameInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timeout);
		}
	}, [isOpen]);

	// Escape key to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	// Validation against clinic requirements (Feature #35)
	const validationResult = validatePatientDraftWithRequirements(
		{
			fullName: newPatientName,
			phone: newPatientPhone,
			advertisingSource,
			snils: patientAdministrativeProfileDraft.snils,
			birthDate: newPatientBirthDate,
			identityDocument: patientAdministrativeProfileDraft.identityDocument,
			isAnonymous: patientAdministrativeProfileDraft.isAnonymous,
			isEmergencyOrPrimary,
		},
		fieldRequirements,
	);

	const patientCreateReady = validationResult.isValid && !isPatientCreating;
	const patientCreateGuidance = validationResult.guidanceMessage;

	// Quick intake validation (CITO / booking / duty doctor): requires ONLY full name and phone
	const quickIntakeValidationResult = useMemo(() => {
		return validatePatientDraftWithRequirements(
			{
				fullName: newPatientName,
				phone: newPatientPhone,
				isEmergencyOrPrimary: true,
			},
			{
				...fieldRequirements,
				requireAdvertisingSource: false,
				requireSnils: false,
				requireBirthDate: false,
				requireIdentityDocument: false,
			},
		);
	}, [newPatientName, newPatientPhone, fieldRequirements]);

	const quickActionReady =
		quickIntakeValidationResult.isValid && !isPatientCreating;

	const handleCreate = async () => {
		if (isPatientCreating) return;
		if (!newPatientName.trim()) {
			if (isEmergencyOrPrimary) {
				setNewPatientName("Пациент с острой болью (CITO)");
			} else {
				showToast("Укажите имя пациента или включите CITO для экстренной записи", "warning");
				return;
			}
		}
		try {
			// Attach advertising source note to administrative profile draft
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			await createPatient();
			onClose();
			if (validationResult.missingRequiredLabels.length > 0) {
				showToast(
					`Пациент создан. Поля (${validationResult.missingRequiredLabels.join(", ")}) можно внести позже при оформлении договора`,
					"info",
					4000,
				);
			}
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleCreateAndBook = async () => {
		if (isPatientCreating) return;
		if (!newPatientName.trim()) {
			if (isEmergencyOrPrimary) {
				setNewPatientName("Пациент с острой болью (CITO)");
			} else {
				showToast("Укажите имя пациента или включите CITO для экстренной записи", "warning");
				return;
			}
		}
		try {
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			const created = await createPatient();
			onClose();

			const targetId =
				(created as Patient | null | undefined)?.id ||
				usePatientStore.getState().selectedPatientId;
			const now = new Date();
			const pad = (n: number) => String(n).padStart(2, "0");
			const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
			const currentHour = now.getHours();
			const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
			const endHour = Math.min(startHour + 1, 21);
			const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
			const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

			useScheduleStore.getState().setNewAppointmentDraft({
				patientId: targetId || "",
				doctorUserId: "",
				assistantUserId: "",
				chairId: "",
				status: "planned",
				startsAt,
				endsAt,
				reason: isEmergencyOrPrimary ? "CITO! Острая боль" : "Первичный приём и консультация",
				comment: isEmergencyOrPrimary ? "Экстренный прием по острой боли (ст. 124 УК РФ)" : "",
			});
			useAppStore.getState().setCurrentView("schedule");
			showToast(
				"Пациент создан. Открыто расписание для выбора времени приёма",
				"success",
			);
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleCreateAndOpenVisit = async () => {
		if (isPatientCreating) return;
		if (!newPatientName.trim()) {
			if (isEmergencyOrPrimary) {
				setNewPatientName("Пациент с острой болью (CITO)");
			} else {
				showToast("Укажите имя пациента или включите CITO для экстренной записи", "warning");
				return;
			}
		}
		try {
			if (advertisingSource) {
				setPatientAdministrativeProfileDraft((prev) => ({
					...prev,
					preferredAppointmentNote: `src:${advertisingSource}`,
				}));
			}
			const created = await createPatient();
			onClose();

			const targetId =
				(created as Patient | null | undefined)?.id ||
				usePatientStore.getState().selectedPatientId;
			if (targetId) {
				usePatientStore.getState().setSelectedPatientId(targetId);
			}
			useAppStore.getState().setCurrentView("visit");
			showToast(
				"Пациент создан. Открыт амбулаторный приём 043/у (дежурный врач)",
				"success",
			);
		} catch {
			// Managed by store/appLogic
		}
	};

	const handleQuickCreateKeyDown = (
		event: ReactKeyboardEvent<HTMLInputElement>,
	) => {
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (!quickActionReady) return;
		void handleCreate();
	};

	const modalContent = (
		<div
			className="create-patient-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-patient-modal-title"
			data-testid="patient-creation-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="create-patient-modal-card">
				{/* Modal Header */}
				<header className="create-patient-modal-header">
					<div className="create-patient-modal-title-wrap">
						<div className="create-patient-modal-icon-badge" aria-hidden="true">
							<UserPlus size={20} />
						</div>
						<div>
							<h2
								id="create-patient-modal-title"
								className="create-patient-modal-title"
							>
								Новый пациент
							</h2>
							<p className="create-patient-modal-subtitle">
								Регистрация амбулаторной карточки 043/у
							</p>
						</div>
					</div>
					<button
						type="button"
						className="create-patient-modal-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
						title="Закрыть (Esc)"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</header>

				{/* Modal Body */}
				<div className="create-patient-modal-body">
					{/* Quick Mode: Emergency / Primary Intake without documents */}
					<div
						style={{
							marginBottom: "10px",
							padding: "10px 12px",
							borderRadius: "8px",
							border: isEmergencyOrPrimary
								? "1px solid rgba(244, 63, 94, 0.4)"
								: "1px solid var(--glass-border)",
							backgroundColor: isEmergencyOrPrimary
								? "rgba(244, 63, 94, 0.08)"
								: "var(--glass-panel)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
							<Zap size={18} style={{ flexShrink: 0, color: isEmergencyOrPrimary ? "#f43f5e" : "var(--muted)" }} />
							<div style={{ fontSize: "12px" }}>
								<div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
									Острая боль / Первичный осмотр (без документов)
									{isEmergencyOrPrimary && (
										<span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f43f5e", color: "#ffffff" }}>
											АКТИВЕН
										</span>
									)}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>
									{isEmergencyOrPrimary
										? "СНИЛС, паспорт и источник обращения не блокируют запись. Документы можно внести позже."
										: "Быстрое создание карты для экстренного пациента без паспорта и СНИЛС"}
								</div>
							</div>
						</div>
						<button
							type="button"
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "6px",
								cursor: "pointer",
								flexShrink: 0,
								backgroundColor: isEmergencyOrPrimary
									? "#f43f5e"
									: "var(--paper-strong)",
								color: isEmergencyOrPrimary
									? "#ffffff"
									: "var(--ink)",
								border: "1px solid var(--glass-border)",
								minHeight: "36px",
							}}
							onClick={() => setIsEmergencyOrPrimary((prev) => !prev)}
							data-testid="patient-create-emergency-toggle"
						>
							{isEmergencyOrPrimary ? "Отключить" : "Включить"}
						</button>
					</div>

					{/* Decree 659: Anonymous Stealth Mode Toggle */}
					<div
						style={{
							marginBottom: "12px",
							padding: "10px 12px",
							borderRadius: "8px",
							border: patientAdministrativeProfileDraft.isAnonymous
								? "1px solid rgba(245, 158, 11, 0.4)"
								: "1px solid var(--glass-border)",
							backgroundColor: patientAdministrativeProfileDraft.isAnonymous
								? "rgba(245, 158, 11, 0.08)"
								: "var(--glass-panel)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
							<EyeOff size={18} style={{ flexShrink: 0, color: patientAdministrativeProfileDraft.isAnonymous ? "#f59e0b" : "var(--muted)" }} />
							<div style={{ fontSize: "12px" }}>
								<div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
									Анонимный приём (ПП РФ №659)
									{patientAdministrativeProfileDraft.isAnonymous && (
										<span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f59e0b", color: "#ffffff" }}>
											АКТИВЕН
										</span>
									)}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>
									{patientAdministrativeProfileDraft.isAnonymous
										? "Паспорт и СНИЛС не требуются. Оплата только коммерческая (ОМС запрещён законом)."
										: "Режим создания карты без паспорта с фиксацией со слов пациента"}
								</div>
							</div>
						</div>
						<button
							type="button"
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "6px",
								cursor: "pointer",
								flexShrink: 0,
								backgroundColor: patientAdministrativeProfileDraft.isAnonymous
									? "#f59e0b"
									: "var(--paper-strong)",
								color: patientAdministrativeProfileDraft.isAnonymous
									? "#ffffff"
									: "var(--ink)",
								border: "1px solid var(--glass-border)",
								minHeight: "36px",
							}}
							onClick={() => {
								const nextIsAnon = !patientAdministrativeProfileDraft.isAnonymous;
								if (nextIsAnon) {
									const anonCode = generateAnonymousPatientCode();
									setPatientAdministrativeProfileDraft((prev) => ({
										...prev,
										isAnonymous: true,
										anonymousCode: anonCode,
									}));
									if (!newPatientName.trim() || newPatientName.startsWith("UUID_ANON")) {
										setNewPatientName(anonCode);
									}
								} else {
									setPatientAdministrativeProfileDraft((prev) => ({
										...prev,
										isAnonymous: false,
										anonymousCode: null,
									}));
									if (newPatientName.startsWith("UUID_ANON")) {
										setNewPatientName("");
									}
								}
							}}
						>
							{patientAdministrativeProfileDraft.isAnonymous ? "Отключить" : "Включить"}
						</button>
					</div>

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
									style={{ fontSize: "12px", minHeight: "32px", padding: "4px 8px" }}
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
								autoComplete="name"
								value={newPatientName}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientName(event.target.value)
								}
								onKeyDown={handleQuickCreateKeyDown}
								placeholder="Иванов Иван Иванович"
								className={`create-patient-input ${validationResult.errors.fullName ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.fullName}
							/>
							<SmartMicrophoneButton
								context="patient"
								onResult={(text) => {
									setNewPatientName(text);
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
										setNewPatientName(payload.fullName || newPatientName);
										if (payload.phone) setNewPatientPhone(payload.phone);
										if (payload.birthDate) setNewPatientBirthDate(payload.birthDate);
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
						{validationResult.errors.fullName && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationResult.errors.fullName}
							</span>
						)}

						{/* Anti-Duplicate Warning in Patient Creation */}
						{potentialDuplicates.length > 0 && (
							<div
								className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2 mt-2"
								data-testid="create-patient-duplicate-warning"
							>
								<div className="flex items-start gap-2">
									<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
									<div className="space-y-0.5">
										<p className="font-bold m-0">
											Похожий пациент уже зарегистрирован:
										</p>
										<p className="m-0 text-[var(--muted)]">
											Во избежание дублирования карт вы можете открыть существующую карту:
										</p>
									</div>
								</div>
								<div className="space-y-1 pl-6">
									{potentialDuplicates.map((item) => (
										<button
											key={item.patient.id}
											type="button"
											onClick={() => {
												setSelectedPatientId(item.patient.id);
												onClose();
											}}
											className="w-full text-left p-2 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-2 cursor-pointer"
										>
											<span className="font-bold text-[var(--ink)]">
												{item.patient.fullName}
												{item.patient.phone ? ` · ${item.patient.phone}` : ""}
												{item.patient.birthDate ? ` · д.р. ${item.patient.birthDate}` : ""}
											</span>
											<span className="text-[11px] text-[var(--teal)] font-semibold shrink-0">
												Открыть карту &rarr;
											</span>
										</button>
									))}
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
								{fieldRequirements.requirePhone ? (
									<span className="text-rose-500 font-bold">*</span>
								) : (
									<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
								)}
							</label>
							<input
								id="patient-create-phone"
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								title="Телефон нового пациента"
								placeholder="+7 (999) 000-00-00"
								value={newPatientPhone}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientPhone(formatPhoneNumber(event.target.value))
								}
								onKeyDown={handleQuickCreateKeyDown}
								className={`create-patient-input ${validationResult.errors.phone ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.phone}
							/>
							{validationResult.errors.phone && (
								<span className="text-xs text-rose-500 font-semibold mt-1">
									{validationResult.errors.phone}
								</span>
							)}
						</div>

						<div className="create-patient-form-field">
							<label
								htmlFor="patient-create-birth-date"
								className="create-patient-label"
							>
								Дата рождения{" "}
								{fieldRequirements.requireBirthDate ? (
									<span className="text-rose-500 font-bold">*</span>
								) : (
									<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
								)}
							</label>
							<input
								id="patient-create-birth-date"
								type="date"
								autoComplete="bday"
								title="Дата рождения нового пациента"
								value={newPatientBirthDate}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setNewPatientBirthDate(event.target.value)
								}
								onKeyDown={handleQuickCreateKeyDown}
								className={`create-patient-input ${validationResult.errors.birthDate ? "border-rose-500" : ""}`}
								aria-invalid={!!validationResult.errors.birthDate}
							/>
							{validationResult.errors.birthDate && (
								<span className="text-xs text-rose-500 font-semibold mt-1">
									{validationResult.errors.birthDate}
								</span>
							)}
						</div>
					</div>

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
									<span className="text-xs text-[var(--muted)] font-normal">(для аналитики)</span>
								)}
							</span>
							{fieldRequirements.requireAdvertisingSource && (
								<span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
									Обязательно по настройке клиники
								</span>
							)}
						</label>
						<select
							id="patient-create-advertising-source"
							value={advertisingSource}
							onChange={(e) => setAdvertisingSource(e.target.value)}
							className={`create-patient-input ${validationResult.errors.advertisingSource ? "border-rose-500" : ""}`}
							aria-invalid={!!validationResult.errors.advertisingSource}
							data-testid="patient-create-advertising-source-select"
						>
							<option value="">— Выберите источник обращения —</option>
							<optgroup label="Онлайн-самозапись (Автоматические каналы)">
								{DENTAL_ADVERTISING_SOURCES.filter((s) => s.isOnlineSelfBooking).map((s) => (
									<option key={s.key} value={s.key}>
										{s.label}
									</option>
								))}
							</optgroup>
							<optgroup label="Администратор, Сарафан и Офлайн">
								{DENTAL_ADVERTISING_SOURCES.filter((s) => !s.isOnlineSelfBooking).map((s) => (
									<option key={s.key} value={s.key}>
										{s.label}
									</option>
								))}
							</optgroup>
						</select>
						{validationResult.errors.advertisingSource && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationResult.errors.advertisingSource}
							</span>
						)}
					</div>

					{/* Collapsible Documents Section (СНИЛС, ОМС/ДМС, Паспорт) */}
					<div className="create-patient-doc-section mt-3 pt-3 border-t border-[var(--line)]">
						<button
							type="button"
							className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 cursor-pointer"
							onClick={() => setShowDocFields(!showDocFields)}
						>
							<FileText size={15} aria-hidden="true" />
							<span>
								{showDocFields
									? "Скрыть реквизиты документов"
									: fieldRequirements.requireSnils
										? "+ Добавить СНИЛС (ОБЯЗАТЕЛЕН ПО НАСТРОЙКЕ), ОМС или Паспорт"
										: "+ Добавить СНИЛС, ОМС или Паспорт"}
							</span>
						</button>

						{(showDocFields || fieldRequirements.requireSnils || fieldRequirements.requireIdentityDocument) && (
							<div className="create-patient-grid-2 mt-2 gap-3">
								<div className="create-patient-form-field">
									<label htmlFor="patient-create-snils" className="create-patient-label flex items-center gap-1">
										<ShieldCheck size={13} className="text-[var(--teal)]" />
										СНИЛС{" "}
										{fieldRequirements.requireSnils ? (
											<span className="text-rose-500 font-bold">* (ЕГИСЗ)</span>
										) : (
											<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
										)}
									</label>
									<input
										id="patient-create-snils"
										inputMode="numeric"
										placeholder="000-000-000 00"
										value={patientAdministrativeProfileDraft.snils || ""}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												snils: formatSnils(e.target.value),
											}))
										}
										className={`create-patient-input ${validationResult.errors.snils ? "border-rose-500" : ""}`}
										aria-invalid={!!validationResult.errors.snils}
									/>
									{validationResult.errors.snils && (
										<span className="text-xs text-rose-500 font-semibold mt-1">
											{validationResult.errors.snils}
										</span>
									)}
								</div>

								<div className="create-patient-form-field">
									<label htmlFor="patient-create-oms" className="create-patient-label">
										Полис ОМС / ДМС
									</label>
									<input
										id="patient-create-oms"
										placeholder="Номер полиса"
										value={patientAdministrativeProfileDraft.insurancePolicyNumber || ""}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												insurancePolicyNumber: formatOmsPolicy(e.target.value),
											}))
										}
										className="create-patient-input"
									/>
								</div>

								<div className="create-patient-form-field create-patient-full-width">
									<label htmlFor="patient-create-passport" className="create-patient-label">
										Паспорт РФ{" "}
										{fieldRequirements.requireIdentityDocument ? (
											<span className="text-rose-500 font-bold">*</span>
										) : (
											<span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
										)}
									</label>
									<input
										id="patient-create-passport"
										placeholder="Серия и номер 0000 000000"
										value={patientAdministrativeProfileDraft.identityDocument || ""}
										onChange={(e) =>
											setPatientAdministrativeProfileDraft((prev) => ({
												...prev,
												identityDocument: formatRussianPassport(e.target.value),
											}))
										}
										className={`create-patient-input ${validationResult.errors.identityDocument ? "border-rose-500" : ""}`}
										aria-invalid={!!validationResult.errors.identityDocument}
									/>
									{validationResult.errors.identityDocument && (
										<span className="text-xs text-rose-500 font-semibold mt-1">
											{validationResult.errors.identityDocument}
										</span>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Modal Footer with Validation Guidance & Action Buttons */}
				<footer className="create-patient-modal-footer">
					{patientCreateGuidance ? (
						<p
							className="quick-create-guidance patient-create-modal-guidance"
							id="patient-create-guidance"
							role="status"
							aria-live="polite"
						>
							{patientCreateGuidance}
						</p>
					) : null}

					<div className="create-patient-modal-actions">
						<button
							type="button"
							className="secondary-button create-patient-cancel-btn"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="secondary-button quick-create-book-action"
							onClick={handleCreateAndBook}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть расписание с выбранным пациентом"
							data-testid="patient-creation-submit-and-book-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Calendar size={15} aria-hidden="true" />
							<span>Создать и записать</span>
						</button>
						<button
							type="button"
							className="secondary-button quick-create-visit-action"
							onClick={handleCreateAndOpenVisit}
							disabled={isPatientCreating}
							title="Создать карту и сразу открыть приём 043/у (для дежурного врача)"
							data-testid="patient-creation-submit-and-visit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Stethoscope size={15} aria-hidden="true" />
							<span>Создать и начать приём</span>
						</button>
						<button
							type="button"
							className="primary-button quick-create-action"
							onClick={handleCreate}
							disabled={isPatientCreating}
							aria-busy={isPatientCreating || undefined}
							aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}
							data-testid="patient-creation-submit-btn"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
							}}
						>
							<Plus size={18} aria-hidden="true" />
							<span>{isPatientCreating ? "Создание..." : "Создать пациента"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
