import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, UserPlus, X } from "lucide-react";
import { DictationHints } from "../../DictationHints";
import { parsePatientDictationLocal } from "../../lib/smartPatientParser";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../SmartParsePreview";
import { usePatientStore } from "../../store/patientStore";
import {
	formatOmsPolicy,
	formatPhoneNumber,
	formatRussianPassport,
	formatSnils,
} from "../../utils/inputSanitation";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import type { PatientCoreDraft } from "../../PatientsView";

export interface CreatePatientModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly createPatient: () => void | Promise<void>;
	readonly updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
}

export function CreatePatientModal({
	isOpen,
	onClose,
	createPatient,
	updatePatientCoreDraft,
}: CreatePatientModalProps) {
	const {
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	} = usePatientStore();

	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);
	const [showHints, setShowHints] = useState(false);
	const [showDocFields, setShowDocFields] = useState(false);

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

	const patientNameReady = (newPatientName ?? "").trim().length > 0;
	const patientCreatePhoneIssue =
		(newPatientPhone ?? "").trim().length > 0 &&
		(newPatientPhone ?? "").replace(/\D/g, "").length < 5;
	const patientCreateReady =
		patientNameReady && !patientCreatePhoneIssue && !isPatientCreating;

	const patientCreateGuidance = !patientNameReady
		? "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже."
		: patientCreatePhoneIssue
			? "Телефон пациента слишком короткий. Исправьте номер или очистите поле."
			: null;

	const handleCreate = async () => {
		if (!patientCreateReady) return;
		try {
			await createPatient();
			onClose();
		} catch {
			// Toast/error handling is managed by createPatient in usePatientLogic
		}
	};

	const handleQuickCreateKeyDown = (
		event: ReactKeyboardEvent<HTMLInputElement>,
	) => {
		if (event.key !== "Enter") return;
		event.preventDefault();
		if (!patientCreateReady) return;
		void handleCreate();
	};

	const modalContent = (
		<div
			className="create-patient-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-patient-modal-title"
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
								Регистрация амбулаторной карточки
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
								{patientNameReady ? (
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
								className="create-patient-input"
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
					</div>

					{/* Phone & Birth Date grid */}
					<div className="create-patient-grid-2">
						<div className="create-patient-form-field">
							<label
								htmlFor="patient-create-phone"
								className="create-patient-label"
							>
								Телефон
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
								className="create-patient-input"
							/>
						</div>

						<div className="create-patient-form-field">
							<label
								htmlFor="patient-create-birth-date"
								className="create-patient-label"
							>
								Дата рождения
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
								className="create-patient-input"
							/>
						</div>
					</div>

					{/* Collapsible Documents Section (СНИЛС, ОМС/ДМС, Паспорт) */}
					<div className="create-patient-doc-section mt-3 pt-3 border-t border-[var(--line)]">
						<button
							type="button"
							className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[44px] bg-transparent border-0 cursor-pointer"
							onClick={() => setShowDocFields(!showDocFields)}
						>
							<FileText size={15} aria-hidden="true" />
							<span>{showDocFields ? "Скрыть реквизиты документов" : "+ Добавить СНИЛС, ОМС или Паспорт"}</span>
						</button>

						{showDocFields && (
							<div className="create-patient-grid-2 mt-2 gap-3">
								<div className="create-patient-form-field">
									<label htmlFor="patient-create-snils" className="create-patient-label">
										СНИЛС
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
										className="create-patient-input"
									/>
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
										Паспорт РФ
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
										className="create-patient-input"
									/>
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
							className="primary-button quick-create-action"
							onClick={handleCreate}
							disabled={!patientCreateReady}
							aria-busy={isPatientCreating || undefined}
							aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}
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
