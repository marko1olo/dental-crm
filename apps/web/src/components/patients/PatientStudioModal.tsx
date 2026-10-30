/**
 * PatientStudioModal.tsx — Каноническая студия картотеки пациентов, экспресс-регистрации
 * у стойки ресепшн и семейного баланса в DENTE CRM.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): экспресс-регистрация за 10 секунд (ФИО + телефон).
 *   Кнопка «Сохранить» НИКОГДА не блокируется (disabled={false}). Ноль требований паспорта до кресла врача.
 * - Мандат 8n (Семейный баланс в 1 клик): единый семейный кошелек родственников, покрытие долгов без бюрократии.
 * - Мандат 8am (Единый дизайн-код): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран!
 * - Apple HIG (390×844): стиль iOS Contacts, нативный Bottom Sheet, сенсорные зоны >= 44×44px, 0px horizontal scroll.
 * - Мандат 8b (Sweet Spot: 350–480 строк).
 */

import React, { useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	User,
	Phone,
	Calendar,
	Users,
	Wallet,
	ShieldCheck,
	AlertCircle,
	Check,
	ChevronDown,
	ChevronUp,
	Search,
	Plus,
	X,
	Clock,
	FileText,
	ArrowRightLeft,
} from "lucide-react";
import {
	type PatientCatalogItem,
	type PatientCategory,
	type FamilyMember,
	type PatientFamilyGroup,
	PATIENT_CATEGORIES_CATALOG,
	FAMILY_ROLE_LABELS,
	DEMO_PATIENT_CATALOG,
	DEMO_FAMILY_GROUPS,
	formatPhoneDisplay,
	formatKopecksToRub,
	calculateFamilyBalanceKopecks,
	transferFamilyBalance,
	validateExpressPatientRegistration,
} from "./patientCatalogData";
import { showToast } from "../GlobalToast";

export interface PatientStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | null;
	readonly initialMode?: "view" | "edit" | "create";
	readonly onSavePatient?: (patient: PatientCatalogItem) => void;
	readonly onNewAppointment?: (patientId: string) => void;
	readonly className?: string;
}

export const PatientStudioModal: React.FC<PatientStudioModalProps> = React.memo(function PatientStudioModal({
	isOpen,
	onClose,
	initialPatientId,
	initialMode = "view",
	onSavePatient,
	onNewAppointment,
}) {
	const [patients, setPatients] = useState<PatientCatalogItem[]>(DEMO_PATIENT_CATALOG);
	const [families, setFamilies] = useState<PatientFamilyGroup[]>(DEMO_FAMILY_GROUPS);
	const [selectedPatientId, setSelectedPatientId] = useState<string>(
		initialPatientId || DEMO_PATIENT_CATALOG[0].id,
	);
	const [mode, setMode] = useState<"view" | "create">(initialMode === "create" ? "create" : "view");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [showDocFields, setShowDocFields] = useState<boolean>(false);
	const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);

	// Форма экспресс-регистрации
	const [draftName, setDraftName] = useState<string>("");
	const [draftPhone, setDraftPhone] = useState<string>("");
	const [draftBirthDate, setDraftBirthDate] = useState<string>("");
	const [draftCategory, setDraftCategory] = useState<PatientCategory>("primary");
	const [draftNotes, setDraftNotes] = useState<string>("");
	const [draftPassportSeries, setDraftPassportSeries] = useState<string>("");
	const [draftPassportNumber, setDraftPassportNumber] = useState<string>("");
	const [draftSnils, setDraftSnils] = useState<string>("");

	const nameInputRef = useRef<HTMLInputElement>(null);
	const phoneInputRef = useRef<HTMLInputElement>(null);

	// Текущий выбранный пациент
	const currentPatient = useMemo(() => {
		return patients.find((p) => p.id === selectedPatientId) || patients[0];
	}, [patients, selectedPatientId]);

	// Семейная группа текущего пациента
	const currentFamily = useMemo(() => {
		if (!currentPatient?.familyId) return null;
		return families.find((f) => f.familyId === currentPatient.familyId) || null;
	}, [currentPatient, families]);

	// Фильтрованный список пациентов для быстрого переключения
	const filteredPatients = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return patients;
		return patients.filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q));
	}, [patients, searchQuery]);

	// Переключение в режим экспресс-регистрации
	const handleStartCreate = useCallback(() => {
		setDraftName("");
		setDraftPhone("");
		setDraftBirthDate("");
		setDraftCategory("primary");
		setDraftNotes("");
		setDraftPassportSeries("");
		setDraftPassportNumber("");
		setDraftSnils("");
		setShowDocFields(false);
		setGuidanceMessage(null);
		setMode("create");
		setTimeout(() => nameInputRef.current?.focus(), 50);
	}, []);

	// Мягкое сохранение (Мандат 8e: кнопка никогда не disabled!)
	const handleSave = useCallback(() => {
		if (mode === "create") {
			const validation = validateExpressPatientRegistration({ fullName: draftName, phone: draftPhone });
			if (!validation.isValid) {
				setGuidanceMessage(validation.guidanceMessage || "Заполните обязательные поля");
				if (validation.errorField === "fullName") {
					nameInputRef.current?.focus();
				} else if (validation.errorField === "phone") {
					phoneInputRef.current?.focus();
				}
				return;
			}

			const newPatient: PatientCatalogItem = {
				id: `pat-${Date.now()}`,
				fullName: draftName.trim(),
				phone: draftPhone.trim(),
				birthDate: draftBirthDate || undefined,
				category: draftCategory,
				balanceKopecks: 0,
				allergies: [],
				isSomaticNorm: true,
				notes: draftNotes.trim() || undefined,
				passport: draftPassportSeries || draftPassportNumber
					? { series: draftPassportSeries, number: draftPassportNumber }
					: undefined,
				snils: draftSnils || undefined,
			};

			setPatients((prev) => [newPatient, ...prev]);
			setSelectedPatientId(newPatient.id);
			setMode("view");
			setGuidanceMessage(null);
			showToast(`Пациент ${newPatient.fullName} успешно зарегистрирован`, "success");
			onSavePatient?.(newPatient);
		} else {
			showToast("Данные пациента сохранены", "success");
			onSavePatient?.(currentPatient);
		}
	}, [
		mode,
		draftName,
		draftPhone,
		draftBirthDate,
		draftCategory,
		draftNotes,
		draftPassportSeries,
		draftPassportNumber,
		draftSnils,
		currentPatient,
		onSavePatient,
	]);

	// Покрытие задолженности с баланса родственника в 1 клик (Мандат 8n)
	const handlePayDebtFromRelative = useCallback((payer: FamilyMember) => {
		if (!currentFamily || !currentPatient || currentPatient.balanceKopecks >= 0) return;
		const debtAmount = Math.abs(currentPatient.balanceKopecks);
		const payAmount = Math.min(debtAmount, Math.max(0, payer.balanceKopecks));

		if (payAmount <= 0) {
			showToast(`На счёте родственника ${payer.fullName} нет доступного аванса`, "warning");
			return;
		}

		const result = transferFamilyBalance({
			fromMemberId: payer.id,
			toMemberId: currentPatient.id,
			amountKopecks: payAmount,
			members: currentFamily.members,
		});

		if (result.success) {
			setFamilies((prev) =>
				prev.map((f) => (f.familyId === currentFamily.familyId ? { ...f, members: result.updatedMembers } : f)),
			);
			setPatients((prev) =>
				prev.map((p) => (p.id === currentPatient.id ? { ...p, balanceKopecks: p.balanceKopecks + payAmount } : p)),
			);
			showToast(result.message, "success");
		} else {
			showToast(result.message, "error");
		}
	}, [currentFamily, currentPatient]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="patient-studio-overlay fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-x-clip"
			data-testid="patient-studio-modal"
		>
			<div
				className="patient-studio-card w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-studio-title"
			>
				{/* Apple HIG iOS Handle for mobile */}
				<div className="sm:hidden pt-2 pb-1 flex justify-center">
					<div className="w-9 h-1 bg-[var(--line-strong)] rounded-full" />
				</div>

				{/* 1-Строчная Шапка студии */}
				<header className="patient-studio-header px-4 sm:px-6 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-subtle)]">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-8 h-8 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0">
							<User size={18} />
						</div>
						<div className="min-w-0">
							<h2 id="patient-studio-title" className="text-sm sm:text-base font-semibold truncate leading-tight">
								{mode === "create" ? (
									<>
										<span className="hidden sm:inline">Экспресс-регистрация за 10 сек</span>
										<span className="sm:hidden">Экспресс-регистрация</span>
									</>
								) : (
									currentPatient?.fullName
								)}
							</h2>
							<p className="text-xs text-[var(--muted)] truncate">
								{mode === "create" ? (
									<>
										<span className="hidden sm:inline">Только ФИО и телефон • Без бюрократии</span>
										<span className="sm:hidden">Только ФИО и телефон</span>
									</>
								) : (
									formatPhoneDisplay(currentPatient?.phone)
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{mode === "view" ? (
							<button
								type="button"
								onClick={handleStartCreate}
								className="h-8 px-2.5 sm:px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] flex items-center gap-1.5 transition-colors"
								data-testid="patient-studio-new-btn"
							>
								<Plus size={14} />
								<span className="hidden sm:inline">Новый пациент</span>
							</button>
						) : (
							<button
								type="button"
								onClick={() => setMode("view")}
								className="hidden sm:inline-flex h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
							>
								Отмена
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)] flex items-center justify-center transition-colors"
							aria-label="Закрыть"
							data-testid="patient-studio-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Основное тело */}
				<div className="patient-studio-body flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
					{mode === "create" ? (
						/* Режим экспресс-регистрации (Мандат 8e) */
						<div className="space-y-4" data-testid="patient-express-registration-form">
							{guidanceMessage && (
								<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
									<AlertCircle size={16} className="shrink-0" />
									<span>{guidanceMessage}</span>
								</div>
							)}

							<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
								<h3 className="text-xs font-semibold text-[var(--muted)]">
									Обязательные данные для приёма (10 секунд)
								</h3>
								<div className="space-y-2.5">
									<div>
										<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
											Фамилия, Имя и Отчество <span className="text-red-500">*</span>
										</label>
										<input
											ref={nameInputRef}
											type="text"
											value={draftName}
											onChange={(e) => setDraftName(e.target.value)}
											placeholder="Иванов Алексей Сергеевич"
											className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm focus:border-[var(--teal)] focus:outline-none"
											data-testid="express-patient-name-input"
										/>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										<div>
											<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
												Мобильный телефон <span className="text-red-500">*</span>
											</label>
											<input
												ref={phoneInputRef}
												type="tel"
												value={draftPhone}
												onChange={(e) => setDraftPhone(e.target.value)}
												placeholder="+7 (999) 000-00-00"
												className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm focus:border-[var(--teal)] focus:outline-none"
												data-testid="express-patient-phone-input"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">
												Дата рождения (по желанию)
											</label>
											<input
												type="date"
												value={draftBirthDate}
												onChange={(e) => setDraftBirthDate(e.target.value)}
												className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm focus:border-[var(--teal)] focus:outline-none"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Сворачиваемая секция бюрократических данных */}
							<div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--paper-subtle)]">
								<button
									type="button"
									onClick={() => setShowDocFields((prev) => !prev)}
									className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--paper)]"
								>
									<span>Паспорт, СНИЛС и полис (строго опционально после приёма)</span>
									{showDocFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>
								{showDocFields && (
									<div className="p-4 pt-0 space-y-3 border-t border-[var(--line)] bg-[var(--paper)]">
										<p className="text-[11px] text-[var(--muted)]">
											Пациент может заполнить документы в зоне ожидания или после осмотра.
										</p>
										<div className="grid grid-cols-2 gap-2.5">
											<input
												type="text"
												placeholder="Серия паспорта"
												value={draftPassportSeries}
												onChange={(e) => setDraftPassportSeries(e.target.value)}
												className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs"
											/>
											<input
												type="text"
												placeholder="Номер паспорта"
												value={draftPassportNumber}
												onChange={(e) => setDraftPassportNumber(e.target.value)}
												className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs"
											/>
										</div>
										<input
											type="text"
											placeholder="СНИЛС (000-000-000 00)"
											value={draftSnils}
											onChange={(e) => setDraftSnils(e.target.value)}
											className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs"
										/>
									</div>
								)}
							</div>
						</div>
					) : (
						/* Режим просмотра карточки пациента (Apple HIG iOS Contacts style) */
						<div className="space-y-4" data-testid="patient-studio-detail-view">
							{/* Карточка статуса и баланса */}
							<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span
											className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
												currentPatient.category === "vip"
													? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
													: "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20"
											}`}
										>
											{PATIENT_CATEGORIES_CATALOG[currentPatient.category].labelRu}
										</span>
										{currentPatient.isSomaticNorm && (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<ShieldCheck size={12} />
												Соматически здоров
											</span>
										)}
									</div>
									<div className="text-right">
										<span className="text-xs text-[var(--muted)] block">Баланс пациента</span>
										<span
											className={`text-base font-bold ${
												currentPatient.balanceKopecks < 0
													? "text-red-500"
													: currentPatient.balanceKopecks > 0
													? "text-emerald-500"
													: "text-[var(--ink)]"
											}`}
											data-testid="patient-studio-balance"
										>
											{formatKopecksToRub(currentPatient.balanceKopecks)}
										</span>
									</div>
								</div>

								{/* Клинические заметки и аллергии */}
								{currentPatient.allergies.length > 0 && (
									<div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
										<AlertCircle size={14} className="shrink-0" />
										<span>Аллергия: {currentPatient.allergies.join(", ")}</span>
									</div>
								)}

								{currentPatient.notes && (
									<p className="text-xs text-[var(--ink-secondary)] bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
										{currentPatient.notes}
									</p>
								)}
							</div>

							{/* Семейный доступ и общий баланс родственников (Мандат 8n) */}
							<div
								className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3"
								data-testid="patient-family-balance-section"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Users size={16} className="text-[var(--teal)]" />
										<h3 className="text-xs font-semibold text-[var(--ink)]">
											Семейный доступ и кошелек
										</h3>
									</div>
									{currentFamily && (
										<span className="text-xs font-medium text-[var(--teal)]">
											Общий баланс семьи: {formatKopecksToRub(calculateFamilyBalanceKopecks(currentFamily.members))}
										</span>
									)}
								</div>

								{currentFamily ? (
									<div className="space-y-2">
										{currentFamily.members.map((member) => (
											<div
												key={member.id}
												className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2"
											>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold truncate">{member.fullName}</span>
														<span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-subtle)] border border-[var(--line)] text-[var(--muted)]">
															{FAMILY_ROLE_LABELS[member.role]}
														</span>
													</div>
													<span className="text-[11px] text-[var(--muted)] block">
														{formatPhoneDisplay(member.phone)}
													</span>
												</div>

												<div className="flex items-center gap-2 shrink-0">
													<span
														className={`text-xs font-bold ${
															member.balanceKopecks < 0 ? "text-red-500" : "text-emerald-500"
														}`}
													>
														{formatKopecksToRub(member.balanceKopecks)}
													</span>

													{/* Кнопка списания в 1 клик если у текущего пациента долг, а у родственника аванс */}
													{currentPatient.balanceKopecks < 0 &&
														member.patientId !== currentPatient.id &&
														member.balanceKopecks > 0 && (
															<button
																type="button"
																onClick={() => handlePayDebtFromRelative(member)}
																className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-subtle)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1"
																title="Покрыть долг за счёт аванса родственника"
																data-testid={`pay-from-relative-${member.id}`}
															>
																<ArrowRightLeft size={12} />
																<span>Оплатить</span>
															</button>
														)}
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-xs text-[var(--muted)]">
										Пациент не привязан к семейной группе. Вы можете объединить карты родственников для общего баланса.
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Floating Bottom Bar со стеклянным размытием и РОВНО ОДНОЙ Primary CTA (Мандат 8am) */}
				<footer className="patient-studio-footer px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-strong)]/90 backdrop-blur-md flex items-center justify-between gap-3">
					<div className="text-xs text-[var(--muted)] truncate hidden sm:block">
						{mode === "create" ? "✓ Экспресс-регистрация без бюрократии" : `Лечащий врач: ${currentPatient.doctorName || "Не назначен"}`}
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						{mode === "view" && onNewAppointment && (
							<button
								type="button"
								onClick={() => onNewAppointment(currentPatient.id)}
								className="h-11 sm:h-9 px-3 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors min-h-[44px] sm:min-h-0 flex items-center gap-1.5"
							>
								<Calendar size={14} />
								<span>Записать на приём</span>
							</button>
						)}

						{/* РОДНО ОДНА Primary CTA кнопка #0d9488 — ВСЕГДА кликабельна (Мандат 8e, 8am) */}
						<button
							type="button"
							onClick={handleSave}
							disabled={false}
							className="h-11 sm:h-9 px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-hover)] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial"
							data-testid="patient-studio-primary-cta"
						>
							<Check size={16} />
							<span>{mode === "create" ? "Зарегистрировать пациента" : "Сохранить данные пациента"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
});

export default PatientStudioModal;
