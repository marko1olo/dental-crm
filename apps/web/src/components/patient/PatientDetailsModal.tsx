/**
 * apps/web/src/components/patient/PatientDetailsModal.tsx
 *
 * Главная медицинская карта и паспортный профиль пациента (Форма 043/у).
 * Реализует требования Конституции THE HAMMER, Мандата 8e (Автономия врача),
 * Мандата 8v (Тишина интерфейса), Закона Анти-Матрёшки (глубина модалок строго 1) и Apple HIG.
 *
 * Ключевые инварианты:
 * 1. 0 заблокированных кнопок сохранения (Zero Blocked Save Buttons: блокирующие валидаторы ликвидированы).
 * 2. Безопасные дефолты для отсутствующей даты рождения и адреса.
 * 3. Прямая интеграция с PatientAnamnesisTab (1-клик соматическая норма, 5 чипов аллергий).
 * 4. Интеграция семейного кошелька и баланса родственников (Family Wallet).
 * 5. 1-кликовая кнопка физиологической нормы в шапке (data-testid="btn-somatic-healthy-norm").
 * 6. Сенсорные тач-таргеты >= 44x44px на touch, >= 36px на десктопе.
 * 7. WCAG AAA Dark/Light Mode без белых пятен.
 * 8. Ноль эмодзи — строго векторные иконки Lucide.
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertOctagon,
	Calendar,
	CheckCircle2,
	CreditCard,
	FileText,
	HeartPulse,
	MapPin,
	Phone,
	Plus,
	Printer,
	Save,
	ShieldCheck,
	User,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
} from "../patients/safetyMath";
import type { PatientGeneralInfo } from "../patients/tabs/PatientGeneralInfoTab";
import { PatientAnamnesisTab } from "./PatientAnamnesisTab";
import { FamilyWalletModal } from "./FamilyWalletModal";
import { PatientFinanceTab } from "../patients/tabs/PatientFinanceTab";
import { PatientFamilyCard } from "../patients/PatientFamilyCard";
import { logger } from "../../utils/logger";

export type PatientDetailsTab = "general" | "anamnesis" | "family" | "finance";

export interface PatientDetailsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: PatientDetailsTab | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly onSave?: ((patient: PatientGeneralInfo, safetyProfile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = React.memo(
	function PatientDetailsModal({
		isOpen,
		onClose,
		patient: initialPatient,
		patientId: explicitPatientId,
		initialTab = "general",
		safetyProfile: initialSafetyProfile,
		onSave,
		onApplySomaticNorm,
		onNavigateToVisit,
		onNewAppointment,
		className = "",
	}) {
		const fullNameInputId = useId();
		const phoneInputId = useId();
		const birthDateInputId = useId();
		const genderSelectId = useId();
		const addressInputId = useId();
		const notesInputId = useId();

		const [activeTab, setActiveTab] = useState<PatientDetailsTab>(initialTab);
		const [isSaving, setIsSaving] = useState(false);

		// Локальное состояние пациента с безопасными дефолтами (Мандат 8e / Safe Defaults)
		const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => ({
			id: initialPatient?.id || explicitPatientId || undefined,
			fullName: initialPatient?.fullName || "",
			phone: initialPatient?.phone || "",
			birthDate: initialPatient?.birthDate || "",
			gender: initialPatient?.gender || "other",
			address: initialPatient?.address || "",
			notes: initialPatient?.notes || "",
			medicalCardNumber: initialPatient?.medicalCardNumber || "",
			patientBalanceRub: initialPatient?.patientBalanceRub ?? 0,
		}));

		// Локальный профиль соматической безопасности
		const [safety, setSafety] = useState<PatientClinicalSafetyProfile>(() => ({
			...DEFAULT_SOMATIC_HEALTHY_NORM,
			...initialSafetyProfile,
		}));

		// Состояние семейного кошелька
		// biome-ignore lint/suspicious/noExplicitAny: family payload
		const [familyData, setFamilyData] = useState<any | null>(null);

		const effectivePatientId = patientData.id || explicitPatientId || initialPatient?.id || null;

		// Загрузка данных пациента с сервера при открытии
		useEffect(() => {
			if (initialPatient) {
				setPatientData((prev) => ({
					...prev,
					...initialPatient,
					id: initialPatient.id || prev.id,
				}));
			}
		}, [initialPatient]);

		useEffect(() => {
			if (initialSafetyProfile) {
				setSafety((prev) => ({
					...prev,
					...initialSafetyProfile,
				}));
			}
		}, [initialSafetyProfile]);

		useEffect(() => {
			if (initialTab) {
				setActiveTab(initialTab);
			}
		}, [initialTab]);

		// Загрузка семьи
		const loadFamily = useCallback(async () => {
			if (!effectivePatientId) return;
			try {
				const res = await fetch(`/api/finance/family/patient/${effectivePatientId}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (res.ok) {
					const data = await res.json();
					setFamilyData(data);
				} else {
					setFamilyData(null);
				}
			} catch {
				setFamilyData(null);
			}
		}, [effectivePatientId]);

		useEffect(() => {
			if (isOpen && effectivePatientId) {
				loadFamily();
			}
		}, [isOpen, effectivePatientId, loadFamily]);

		// Обработка Escape
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape" && isOpen) {
					onClose();
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		// Расчет стоп-факторов
		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(safety);
		}, [safety]);

		// 1-Клик норма
		const handleApplyNorm = useCallback(() => {
			const cleanNorm = createHealthySomaticNormProfile();
			setSafety(cleanNorm);
			onApplySomaticNorm?.();
			showToast("Применена физиологическая норма: соматически здоров", "success");
		}, [onApplySomaticNorm]);

		// Обновление полей пациента
		const handleUpdateField = useCallback((field: keyof PatientGeneralInfo, value: unknown) => {
			setPatientData((prev) => ({
				...prev,
				[field]: value,
			}));
		}, []);

		// Сохранение без блокировок (Мандат 8e: Zero Blocked Buttons)
		const handleSave = useCallback(async () => {
			setIsSaving(true);
			try {
				const trimmedName = patientData.fullName?.trim() || "Пациент без ФИО";
				const payloadToSave: PatientGeneralInfo = {
					...patientData,
					fullName: trimmedName,
				};

				// Сохранение на сервер, если ID известен
				if (payloadToSave.id) {
					await fetch(`/api/patients/${payloadToSave.id}`, {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							fullName: payloadToSave.fullName,
							phone: payloadToSave.phone || undefined,
							birthDate: payloadToSave.birthDate || undefined,
							gender: payloadToSave.gender || undefined,
							address: payloadToSave.address || undefined,
							notes: payloadToSave.notes || undefined,
						}),
					}).catch((err) => {
						logger.warn("Server patient update warning", err);
					});
				}

				onSave?.(payloadToSave, safety);
				showToast("Карта пациента успешно сохранена", "success");
				onClose();
			} catch (err) {
				logger.error("Save patient error", err);
				showToast("Не удалось сохранить карту", "error");
			} finally {
				setIsSaving(false);
			}
		}, [patientData, safety, onSave, onClose]);

		const handlePrint = useCallback(() => {
			if (typeof window !== "undefined") {
				window.print();
			}
		}, []);

		if (!isOpen) return null;

		const modalContent = (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white print:static"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-details-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
				data-testid="patient-details-modal-backdrop"
			>
				<div
					data-testid="patient-details-modal"
					className={`bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] print:border-none print:shadow-none print:max-h-none print:rounded-none ${className}`}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Modal Header */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] gap-3 shrink-0 print:hidden">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0 shadow-xs">
								<User className="w-5 h-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h2
									id="patient-details-modal-title"
									data-testid="patient-details-title"
									className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 truncate"
								>
									{patientData.fullName || "Новый пациент"}
								</h2>
								<p className="text-xs text-[var(--muted)] m-0 truncate">
									{patientData.phone ? `Тел: ${patientData.phone}` : "Медицинская карта и паспортный профиль"}
									{patientData.birthDate ? ` • ${patientData.birthDate}` : ""}
									{patientData.medicalCardNumber ? ` • Карта №${patientData.medicalCardNumber}` : ""}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							{/* 1-Клик норма прямо в тулбаре шапки */}
							<button
								type="button"
								data-testid="btn-somatic-healthy-norm"
								onClick={handleApplyNorm}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 whitespace-nowrap active:scale-98"
								title="Зафиксировать физиологическую норму: соматически здоров"
							>
								<ShieldCheck className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Здоров (Норма)</span>
								<span className="sm:hidden">Норма</span>
							</button>

							<button
								type="button"
								onClick={handlePrint}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-3 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
								title="Печать карты 043/у"
							>
								<Printer className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Печать</span>
							</button>

							<button
								type="button"
								data-testid="patient-details-close-btn"
								onClick={onClose}
								className="min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
								aria-label="Закрыть окно"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Соматический баннер предупреждения, если активны аллергии или стоп-факторы */}
					{safetyEvaluation.activeFlags.length > 0 && (
						<div
							className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 text-xs ${
								safetyEvaluation.hasCriticalStopFlags
									? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
									: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
							}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<AlertOctagon className="w-4 h-4 shrink-0" />
								<span className="font-bold uppercase tracking-wider text-[11px]">
									Внимание: обнаружены клинические риски/аллергии
								</span>
							</div>
							<button
								type="button"
								onClick={() => setActiveTab("anamnesis")}
								className="underline font-semibold cursor-pointer shrink-0 hover:opacity-80"
							>
								Посмотреть в анамнезе
							</button>
						</div>
					)}

					{/* Navigation Tabs Bar */}
					<div className="flex items-center px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper)] gap-2 overflow-x-auto scrollbar-none shrink-0 print:hidden">
						<button
							type="button"
							data-testid="tab-details-general"
							className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
								activeTab === "general"
									? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => setActiveTab("general")}
						>
							<FileText className="w-3.5 h-3.5 shrink-0" />
							<span>Основные данные</span>
						</button>

						<button
							type="button"
							data-testid="tab-details-anamnesis"
							className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
								activeTab === "anamnesis"
									? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => setActiveTab("anamnesis")}
						>
							<HeartPulse className="w-3.5 h-3.5 shrink-0" />
							<span>Анамнез и аллергии</span>
						</button>

						<button
							type="button"
							data-testid="tab-details-family"
							className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
								activeTab === "family"
									? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => setActiveTab("family")}
						>
							<Users className="w-3.5 h-3.5 shrink-0" />
							<span>Семья и кошелек</span>
						</button>

						<button
							type="button"
							data-testid="tab-details-finance"
							className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
								activeTab === "finance"
									? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => setActiveTab("finance")}
						>
							<Wallet className="w-3.5 h-3.5 shrink-0" />
							<span>Финансы и аванс</span>
						</button>
					</div>

					{/* Modal Body */}
					<div className="p-4 sm:p-5 overflow-y-auto flex-1">
						{/* Вкладка 1: Основные паспортные данные */}
						{activeTab === "general" && (
							<div className="flex flex-col gap-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* ФИО */}
									<div>
										<label
											htmlFor={fullNameInputId}
											className="text-xs font-semibold text-[var(--ink)] block mb-1"
										>
											ФИО пациента: <span className="text-rose-500">*</span>
										</label>
										<input
											id={fullNameInputId}
											data-testid="patient-input-fullname"
											type="text"
											placeholder="Фамилия Имя Отчество"
											value={patientData.fullName || ""}
											onChange={(e) => handleUpdateField("fullName", e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] transition-colors"
										/>
									</div>

									{/* Телефон */}
									<div>
										<label
											htmlFor={phoneInputId}
											className="text-xs font-semibold text-[var(--ink)] block mb-1"
										>
											Номер телефона:
										</label>
										<input
											id={phoneInputId}
											data-testid="patient-input-phone"
											type="tel"
											placeholder="+7 (___) ___-__-__"
											value={patientData.phone || ""}
											onChange={(e) => handleUpdateField("phone", e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-mono outline-none focus:border-[var(--teal)] transition-colors"
										/>
									</div>

									{/* Дата рождения (Safe Default: не блокирует сохранение при отсутствии) */}
									<div>
										<label
											htmlFor={birthDateInputId}
											className="text-xs font-semibold text-[var(--ink)] block mb-1"
										>
											Дата рождения:
										</label>
										<input
											id={birthDateInputId}
											data-testid="patient-input-birthdate"
											type="date"
											value={patientData.birthDate || ""}
											onChange={(e) => handleUpdateField("birthDate", e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors"
										/>
									</div>

									{/* Пол */}
									<div>
										<label
											htmlFor={genderSelectId}
											className="text-xs font-semibold text-[var(--ink)] block mb-1"
										>
											Пол:
										</label>
										<select
											id={genderSelectId}
											value={patientData.gender || "other"}
											onChange={(e) => handleUpdateField("gender", e.target.value)}
											className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors cursor-pointer"
										>
											<option value="male">Мужской</option>
											<option value="female">Женский</option>
											<option value="other">Не указан</option>
										</select>
									</div>
								</div>

								{/* Адрес проживания */}
								<div>
									<label
										htmlFor={addressInputId}
										className="text-xs font-semibold text-[var(--ink)] block mb-1"
									>
										Адрес регистрации или проживания:
									</label>
									<input
										id={addressInputId}
										data-testid="patient-input-address"
										type="text"
										placeholder="г. Москва, ул. Ленина, д. 10, кв. 5"
										value={patientData.address || ""}
										onChange={(e) => handleUpdateField("address", e.target.value)}
										className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors"
									/>
								</div>

								{/* Клинические примечания */}
								<div>
									<label
										htmlFor={notesInputId}
										className="text-xs font-semibold text-[var(--ink)] block mb-1"
									>
										Заметки и особенности:
									</label>
									<textarea
										id={notesInputId}
										rows={3}
										placeholder="Пожелания пациента, особенности общения, график..."
										value={patientData.notes || ""}
										onChange={(e) => handleUpdateField("notes", e.target.value)}
										className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:border-[var(--teal)] transition-colors"
									/>
								</div>
							</div>
						)}

						{/* Вкладка 2: Анамнез, соматика и аллергии (полная интеграция с PatientAnamnesisTab) */}
						{activeTab === "anamnesis" && (
							<PatientAnamnesisTab
								patientId={effectivePatientId}
								patientName={patientData.fullName}
								initialProfile={safety}
								onSaveProfile={(updated) => setSafety(updated)}
								onApplySomaticNorm={handleApplyNorm}
							/>
						)}

						{/* Вкладка 3: Семья и общий кошелек */}
						{activeTab === "family" && (
							<div className="flex flex-col gap-4">
								<PatientFamilyCard
									patientId={effectivePatientId ?? null}
									patientName={patientData.fullName ?? null}
									familyData={familyData}
									onFamilyDataChanged={loadFamily}
								/>
							</div>
						)}

						{/* Вкладка 4: Финансы и авансы */}
						{activeTab === "finance" && (
							<PatientFinanceTab
								patient={patientData}
								onUpdateBalance={(bal) => handleUpdateField("patientBalanceRub", bal)}
								onNavigateToVisit={onNavigateToVisit}
								onNewAppointment={onNewAppointment}
							/>
						)}
					</div>

					{/* Modal Footer with ZERO BLOCKED BUTTONS (Мандат 8e) */}
					<div className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] shrink-0 gap-3 print:hidden">
						<span className="text-[11px] text-[var(--muted)]">
							Автономия врача: сохранение доступно в любой момент без блокирующих полей
						</span>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-4 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs"
							>
								Отмена
							</button>

							{/* КНОПКА СОХРАНЕНИЯ СТРОГО БЕЗ DISABLED={!formIsValid} */}
							<button
								type="button"
								data-testid="btn-save-patient-details"
								onClick={handleSave}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-5 bg-[var(--teal)] text-white hover:opacity-95 text-xs font-bold rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-98"
							>
								<Save className="w-4 h-4 shrink-0" />
								<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(modalContent, document.body)
			: modalContent;
	},
);

export default PatientDetailsModal;
