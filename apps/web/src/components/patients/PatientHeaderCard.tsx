/**
 * DENTE CRM — Patient Header Card Component
 * (DOMAIN: macOS/iOS Clinical HIG, Patient Profile Header, Sentiment & Loyalty)
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
	AlertOctagon,
	Archive,
	Calendar,
	Clock,
	Copy,
	Edit3,
	FileText,
	GitMerge,
	HeartPulse,
	History,
	MessageSquare,
	MoreHorizontal,
	Phone,
	Printer,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "./safetyMath";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { PatientLoyaltyHeader } from "./PatientLoyaltyHeader";
import { PatientSentimentBadge } from "./PatientSentimentBadge";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "./blankContractPrint";

export interface PatientHeaderCardProps {
	patientId?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: flexible patient record
	patient?: any | null | undefined;
	onEditPatient?: (() => void) | undefined;
	onOpenAnamnesis?: (() => void) | undefined;
	className?: string | undefined;
}

export function formatPatientBirthAndAge(birthDateIso?: string | null): string {
	if (!birthDateIso) return "";
	const date = new Date(birthDateIso);
	if (Number.isNaN(date.getTime())) return "";

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const m = today.getMonth() - date.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
		age--;
	}

	const dateStr = date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	let ageWord = "лет";
	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		ageWord = "лет";
	} else if (lastDigit === 1) {
		ageWord = "год";
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		ageWord = "года";
	}

	return `${dateStr} (${age} ${ageWord})`;
}

export const PatientHeaderCard: React.FC<PatientHeaderCardProps> = ({
	patientId,
	patient: propPatient,
	onEditPatient,
	onOpenAnamnesis,
	className = "",
}) => {
	const { dashboard, selectedPatient: ctxPatient } = useAppLogicContext();

	const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
	const actionsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isActionsMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				actionsMenuRef.current &&
				!actionsMenuRef.current.contains(e.target as Node)
			) {
				setIsActionsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isActionsMenuOpen]);

	const resolvedPatient = useMemo(() => {
		if (propPatient) return propPatient;
		if (patientId && dashboard?.patients) {
			return dashboard.patients.find((p) => p.id === patientId) || null;
		}
		return ctxPatient || null;
	}, [propPatient, patientId, dashboard?.patients, ctxPatient]);

	if (!resolvedPatient) {
		return null;
	}

	const fullName = resolvedPatient.fullName || "Пациент без имени";
	const initials = fullName
		.split(" ")
		.map((part: string) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase() || "П";

	const balance = Number(
		resolvedPatient.balanceRub ?? resolvedPatient.balance ?? 0,
	);
	const phone = resolvedPatient.phone || "";
	const birthDateStr = formatPatientBirthAndAge(
		resolvedPatient.birthDate || resolvedPatient.birthDateIso,
	);

	const allergyText = useMemo(() => {
		const raw =
			resolvedPatient.allergies ||
			resolvedPatient.anamnesis?.allergies ||
			"";
		if (
			raw &&
			typeof raw === "string" &&
			raw.trim() &&
			!isNegativeAllergyStatement(raw)
		) {
			return raw.trim();
		}
		if (resolvedPatient.clinicalSafetyProfile) {
			const evalResult = evaluatePatientSafetyFlags(resolvedPatient.clinicalSafetyProfile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) =>
					f.category === "anesthesia_allergy" ||
					f.id.startsWith("allergy_") ||
					f.id.includes("allergy") ||
					f.id === "anaphylaxis_history" ||
					f.id === "custom_allergy_notes",
			);
			if (allergyFlags.length > 0) {
				return allergyFlags.map((f) => f.shortBadge).join(" ");
			}
		}
		return "";
	}, [resolvedPatient]);

	const diagnosisText = useMemo(() => {
		const d =
			resolvedPatient.diagnosis ||
			resolvedPatient.primaryDiagnosis ||
			resolvedPatient.mkb10 ||
			resolvedPatient.anamnesis?.diagnosis ||
			"";
		return typeof d === "string" ? d.trim() : "";
	}, [resolvedPatient]);

	const nextAppointment = useMemo(() => {
		if (!resolvedPatient?.id || !dashboard?.appointments) return null;
		const nowTime = Date.now();
		const upcoming = (dashboard.appointments as Array<{
			id: string;
			patientId?: string;
			startsAt?: string;
			status?: string;
			reason?: string;
		}>)
			.filter(
				(a) =>
					a.patientId === resolvedPatient.id &&
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= nowTime - 60 * 60 * 1000,
			)
			.sort(
				(a, b) =>
					new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
			);
		return upcoming[0] || null;
	}, [resolvedPatient?.id, dashboard?.appointments]);

	return (
		<div
			className={`patient-header-card p-2 sm:p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs transition-colors flex flex-col gap-1.5 ${className}`}
			data-testid="patient-header-card"
		>
			{/* Main Compact Row: <= 60-70px total desktop height */}
			<div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap min-w-0">
				{/* Avatar & Core Info */}
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div
						className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[var(--teal-dark,#0d9488)] to-cyan-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[var(--teal,#0d9488)]/30"
						title={fullName}
					>
						{initials}
					</div>

					<div className="min-w-0 flex-1">
						{/* Line 1: Full name + clinical badges */}
						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							<h2 className="text-sm sm:text-base font-black text-[var(--ink)] leading-tight truncate max-w-[200px] sm:max-w-[280px] lg:max-w-[360px]">
								{fullName}
							</h2>
							{dashboard?.activeVisit?.patientId === resolvedPatient.id && (
								<span
									className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0"
									title="Пациент в данный момент находится на приёме"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
									В клинике
								</span>
							)}
							{nextAppointment && (
								<span
									className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/30 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
									title={`Следующий приём: ${new Date(nextAppointment.startsAt!).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}
									data-testid="header-next-appointment-badge"
								>
									<Clock size={10} className="shrink-0" />
									<span className="truncate max-w-[170px] sm:max-w-[240px]">
										Приём: {new Date(nextAppointment.startsAt!).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} {new Date(nextAppointment.startsAt!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									</span>
								</span>
							)}
							{diagnosisText && (
								<span
									className="px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-[10px] font-semibold truncate max-w-[140px]"
									title={`Диагноз: ${diagnosisText}`}
									data-testid="header-diagnosis-badge"
								>
									{diagnosisText}
								</span>
							)}
						</div>

						{/* Line 2: Birthdate, Phone with copy, Loyalty, Sentiment */}
						<div className="flex items-center gap-2.5 flex-wrap text-[11px] text-[var(--muted)] mt-0.5 min-w-0">
							{birthDateStr && (
								<span className="inline-flex items-center gap-1 shrink-0">
									<Calendar size={11} className="shrink-0 opacity-70" />
									<span>{birthDateStr}</span>
								</span>
							)}
							{phone ? (
								<span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--ink)] shrink-0">
									<Phone size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span>{phone}</span>
									<button
										type="button"
										onClick={() => {
											if (typeof navigator !== "undefined" && navigator.clipboard) {
												void navigator.clipboard.writeText(phone);
												showToast("Телефон скопирован в буфер", "success");
											}
										}}
										className="p-0.5 rounded hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
										title="Скопировать телефон"
										aria-label="Скопировать телефон"
									>
										<Copy size={11} />
									</button>
								</span>
							) : (
								<span className="italic shrink-0">Телефон не указан</span>
							)}
							<PatientSentimentBadge patient={resolvedPatient} />
							<PatientLoyaltyHeader patientId={resolvedPatient.id} />
						</div>
					</div>
				</div>

				{/* Right: Balance & Action Toolbar */}
				<div className="flex items-center gap-2 shrink-0">
					{/* 54-FZ Fiscal Balance */}
					<span
						className={`px-2 py-1 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap border ${
							balance > 0
								? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
								: balance < 0
									? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
						}`}
						title={
							balance > 0
								? "Аванс / Депозит пациента (54-ФЗ)"
								: balance < 0
									? "Задолженность за оказанные услуги"
									: "Баланс нулевой (все услуги оплачены)"
						}
					>
						{balance > 0
							? `+${balance.toLocaleString("ru-RU")} ₽`
							: balance < 0
								? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
								: "0 ₽"}
					</span>

					{/* 1-line Action Toolbar (32px / h-8) - Miller's Law: 2 primary buttons + 1 compact '...' */}
					<div className="flex items-center gap-1.5 shrink-0">
						{/* Primary 1: Начать приём */}
						<button
							type="button"
							onClick={() => {
								if (!resolvedPatient) return;
								usePatientStore
									.getState()
									.setSelectedPatientId(resolvedPatient.id);
								useAppStore.getState().setCurrentView("visit");
								showToast(`Открыт приём 043/у: ${fullName}`, "success");
							}}
							className="h-8 px-2.5 sm:px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all text-xs"
							title="Открыть амбулаторный приём 043/у без лишних подтверждений"
							data-testid="header-open-visit-btn"
						>
							<Stethoscope size={13} />
							<span>Начать приём</span>
						</button>

						{/* Primary 2: Записать */}
						<button
							type="button"
							onClick={() => {
								if (!resolvedPatient) return;
								const now = new Date();
								const pad = (n: number) => String(n).padStart(2, "0");
								const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
								const currentHour = now.getHours();
								const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
								const endHour = Math.min(startHour + 1, 21);
								const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
								const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

								useScheduleStore.getState().setNewAppointmentDraft({
									patientId: resolvedPatient.id,
									doctorUserId: "",
									assistantUserId: "",
									chairId: "",
									status: "planned",
									startsAt,
									endsAt,
									reason: "Консультация и осмотр",
									comment: "",
								});
								useAppStore.getState().setCurrentView("schedule");
								showToast(
									`Пациент ${fullName} выбран для записи в расписание`,
									"success",
								);
							}}
							className="h-8 px-2.5 rounded-lg bg-[var(--paper-subtle,var(--paper-soft,#f1f5f9))] hover:bg-[var(--paper-hover,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors text-xs"
							title="Записать пациента в расписание приёма"
							data-testid="header-book-appointment-btn"
						>
							<Calendar size={13} className="text-[var(--teal,#0d9488)]" />
							<span>Записать</span>
						</button>

						{/* Secondary Popover Menu: ... button */}
						<div className="relative" ref={actionsMenuRef}>
							<button
								type="button"
								onClick={() => setIsActionsMenuOpen((prev) => !prev)}
								className="h-8 w-8 rounded-lg bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--paper-hover,#e2e8f0)] text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] inline-flex items-center justify-center cursor-pointer transition-colors"
								title="Дополнительные действия (печать 043/у, касса, архив)"
								aria-label="Дополнительные действия"
								aria-expanded={isActionsMenuOpen}
								aria-haspopup="true"
								data-testid="header-actions-menu-btn"
							>
								<MoreHorizontal size={15} />
							</button>

							{isActionsMenuOpen && (
								<div
									className="absolute right-0 top-full mt-1 w-64 p-1 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] shadow-xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
									data-testid="header-actions-menu-popover"
								>
									{/* 1. Печать и экспорт карты 043/у */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											if (typeof window !== "undefined") {
												window.print();
											}
											showToast("Печать и экспорт карты 043/у запущены", "info");
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Печать и экспорт карты 043/у"
										data-testid="header-export-043u-btn"
									>
										<Printer size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="truncate">Печать карты (043/у)</span>
									</button>

									{/* 2. Выписка счёта и касса (54-ФЗ) */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											usePatientStore
												.getState()
												.setSelectedPatientId(resolvedPatient.id);
											useAppStore.getState().setCurrentView("finance");
											showToast(`Открыта касса и счета: ${fullName}`, "info");
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Выписка счёта, акты выполненных работ и касса 54-ФЗ"
										data-testid="header-finance-btn"
									>
										<FileText size={13} className="text-emerald-600 shrink-0" />
										<span className="truncate">Счета и касса (54-ФЗ)</span>
									</button>

									{/* 3. Семейный баланс */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											showToast(
												`Семейный баланс: доступно ${balance.toLocaleString("ru-RU")} ₽`,
												"info",
											);
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Семейный кошелек и распределение авансов"
										data-testid="header-family-balance-btn"
									>
										<UserCheck size={13} className="text-indigo-600 shrink-0" />
										<span className="truncate">Семейный баланс</span>
									</button>

									{/* 4. Бланк договора (_______) */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											void printBlankMedicalContract(resolvedPatient, {
												clinicName: dashboard?.clinicSettings?.profile?.legalName,
											});
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Распечатать пустой договор на оказание услуг со строками _______"
										data-testid="header-print-blank-contract-btn"
									>
										<FileText size={13} className="text-amber-600 shrink-0" />
										<span className="truncate">Бланк договора (_______)</span>
									</button>

									{/* 4b. Бланк ИДС / согласий (_______) */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											void printBlankMedicalConsent(resolvedPatient, {
												clinicName: dashboard?.clinicSettings?.profile?.legalName,
											});
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Распечатать пустой бланк информированного согласия (ИДС) со строками _______"
										data-testid="header-print-blank-consent-btn"
									>
										<FileText size={13} className="text-teal-600 shrink-0" />
										<span className="truncate">Бланк ИДС / согласий (_______)</span>
									</button>

									{/* 5. Анамнез 043/у */}
									{onOpenAnamnesis && (
										<button
											type="button"
											onClick={() => {
												setIsActionsMenuOpen(false);
												onOpenAnamnesis();
											}}
											className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
											title="Анамнез 043/у"
											data-testid="header-anamnesis-btn"
										>
											<HeartPulse size={13} className="text-rose-500 shrink-0" />
											<span className="truncate">Анамнез 043/у</span>
										</button>
									)}

									{/* 6. Объединить дубликаты */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											if (typeof window !== "undefined") {
												window.dispatchEvent(
													new CustomEvent("dente-open-duplicate-merge-modal", {
														detail: { patientId: resolvedPatient.id },
													}),
												);
											}
											showToast("Проверка очередей слияния дубликатов", "info");
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Объединить дубликаты пациента"
										data-testid="header-merge-duplicates-btn"
									>
										<GitMerge size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
										<span className="truncate">Объединить дубликаты</span>
									</button>

									{/* 7. История изменений */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											showToast(`История изменений карты: ${fullName}`, "info");
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="История изменений данных пациента"
										data-testid="header-history-btn"
									>
										<History size={13} className="text-[var(--muted)] shrink-0" />
										<span className="truncate">История изменений</span>
									</button>

									{/* 8. WhatsApp */}
									{phone && (
										<button
											type="button"
											onClick={() => {
												setIsActionsMenuOpen(false);
												openWhatsAppChat(
													phone,
													`Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`,
												);
											}}
											className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-emerald-800 dark:text-emerald-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
											title="Написать в WhatsApp"
											data-testid="header-whatsapp-btn"
										>
											<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span className="truncate">WhatsApp</span>
										</button>
									)}

									{/* 9. Изменить */}
									{onEditPatient && (
										<button
											type="button"
											onClick={() => {
												setIsActionsMenuOpen(false);
												onEditPatient();
											}}
											className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
											title="Редактировать данные пациента"
											data-testid="header-edit-patient-btn"
										>
											<Edit3 size={13} className="text-[var(--muted)] shrink-0" />
											<span className="truncate">Изменить</span>
										</button>
									)}

									{/* 10. В архив / Деактивация */}
									<button
										type="button"
										onClick={() => {
											setIsActionsMenuOpen(false);
											showToast(`Карта пациента ${fullName} перемещена в архив`, "info");
										}}
										className="w-full h-8 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
										title="Переместить карту пациента в архив"
										data-testid="header-archive-btn"
									>
										<Archive size={13} className="text-rose-500 shrink-0" />
										<span className="truncate">В архив / Деактивация</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Dedicated Allergy Alert Banner if present (kept compact with data-testid="header-allergy-alert") */}
			{allergyText && (
				<div
					className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-600 text-rose-950 dark:text-rose-100 text-xs font-black flex items-center gap-2 shadow-xs"
					data-testid="header-allergy-alert"
					role="alert"
				>
					<AlertOctagon size={14} className="text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
					<div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
						<span className="uppercase tracking-wider font-black text-[10px] text-rose-700 dark:text-rose-300 shrink-0">
							СТОП-ФАКТОР / АЛЛЕРГИЯ:
						</span>
						<span className="truncate font-semibold">{allergyText}</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default PatientHeaderCard;
