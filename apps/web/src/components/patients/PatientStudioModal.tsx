/**
 * PatientStudioModal.tsx — Каноническая студия картотеки пациентов, экспресс-регистрации
 * за стойкой ресепшн и семейного баланса DENTE CRM (SSOT).
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия персонала): экспресс-регистрация за 10 секунд (ФИО + телефон).
 *   Кнопка «Сохранить» НИКОГДА не блокируется (disabled={false}). Ноль бюрократических барьеров.
 * - Мандат 8n (Семейный баланс в 1 клик): единый семейный кошелек родственников, покрытие долгов.
 * - Мандат 8am (Единый дизайн-код): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран!
 * - Apple HIG (390×844): стиль iOS Contacts, нативный Bottom Sheet, сенсорные зоны >= 44×44px, 0px horizontal scroll.
 * - Мандат 8b / 8zi (Sweet Spot: 400–480 строк).
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	User, Plus, X, Search, Users, FileText, Clock, ShieldCheck, HeartPulse,
	AlertCircle, ChevronDown, ChevronUp, Check, Calendar, ArrowRightLeft, CheckCircle2,
} from "lucide-react";
import {
	type PatientCatalogItem, type PatientCategory, type FamilyMember, type PatientFamilyGroup,
	PATIENT_CATEGORIES_CATALOG, FAMILY_ROLE_LABELS, DEMO_PATIENT_CATALOG, DEMO_FAMILY_GROUPS,
	formatKopecksToRub, formatPhoneDisplay, calculateFamilyBalanceKopecks, transferFamilyBalance,
	validateExpressPatientRegistration,
} from "./patientCatalogData";
import { showToast } from "../GlobalToast";
import "./styles/patientStudio.css";

export type PatientStudioTab = "express" | "profile" | "family" | "history";

export interface PatientStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | null;
	readonly initialMode?: "view" | "edit" | "create";
	readonly onSavePatient?: (patient: PatientCatalogItem) => void;
	readonly onNewAppointment?: (patientId: string) => void;
	readonly className?: string;
}

export const PatientStudioModal: React.FC<PatientStudioModalProps> = React.memo(
	function PatientStudioModal({
		isOpen,
		onClose,
		initialPatientId,
		initialMode = "view",
		onSavePatient,
		onNewAppointment,
	}) {
		// 1. Состояние картотеки и режимов
		const [patients, setPatients] = useState<PatientCatalogItem[]>(DEMO_PATIENT_CATALOG);
		const [families, setFamilies] = useState<PatientFamilyGroup[]>(DEMO_FAMILY_GROUPS);
		const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || DEMO_PATIENT_CATALOG[0]?.id || "pat-001");
		const [mode, setMode] = useState<"view" | "create">(initialMode === "create" ? "create" : "view");
		const [activeTab, setActiveTab] = useState<PatientStudioTab>(initialMode === "create" ? "express" : "profile");
		const [searchQuery, setSearchQuery] = useState("");
		const [isSearchOpen, setIsSearchOpen] = useState(false);
		const [showDocFields, setShowDocFields] = useState(false);
		const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);

		// 2. Поля экспресс-регистрации за 10 секунд (Мандат 8e: только ФИО и телефон обязательны)
		const [draftName, setDraftName] = useState("");
		const [draftPhone, setDraftPhone] = useState("");
		const [draftBirthDate, setDraftBirthDate] = useState("");
		const [draftCategory, setDraftCategory] = useState<PatientCategory>("primary");
		const [draftIsSomaticNorm, setDraftIsSomaticNorm] = useState(true);
		const [draftNotes, setDraftNotes] = useState("");
		const [draftPassportSeries, setDraftPassportSeries] = useState("");
		const [draftPassportNumber, setDraftPassportNumber] = useState("");
		const [draftSnils, setDraftSnils] = useState("");

		const nameInputRef = useRef<HTMLInputElement>(null);
		const phoneInputRef = useRef<HTMLInputElement>(null);
		const searchContainerRef = useRef<HTMLDivElement>(null);

		const currentPatient = useMemo(() => {
			return patients.find((p) => p.id === selectedPatientId) || patients[0];
		}, [patients, selectedPatientId]);

		const currentFamily = useMemo(() => {
			if (!currentPatient?.familyId) return null;
			return families.find((f) => f.familyId === currentPatient.familyId) || null;
		}, [currentPatient, families]);

		const filteredPatients = useMemo(() => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return patients;
			return patients.filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q));
		}, [patients, searchQuery]);

		useEffect(() => {
			function handleClickOutside(e: MouseEvent) {
				if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
					setIsSearchOpen(false);
				}
			}
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, []);

		const handleStartCreate = useCallback(() => {
			setDraftName(""); setDraftPhone(""); setDraftBirthDate(""); setDraftCategory("primary");
			setDraftIsSomaticNorm(true); setDraftNotes(""); setDraftPassportSeries(""); setDraftPassportNumber("");
			setDraftSnils(""); setShowDocFields(false); setGuidanceMessage(null);
			setMode("create"); setActiveTab("express");
			setTimeout(() => nameInputRef.current?.focus(), 50);
		}, []);

		const handleSelectPatient = useCallback((id: string) => {
			setSelectedPatientId(id); setMode("view"); setActiveTab("profile");
			setIsSearchOpen(false); setSearchQuery("");
		}, []);

		// Мандат 8e: сохранение никогда не блокируется. При нехватке ФИО/телефона мягкая подсветка фокусом.
		const handleSave = useCallback(() => {
			if (mode === "create") {
				const validation = validateExpressPatientRegistration({ fullName: draftName, phone: draftPhone });
				if (!validation.isValid) {
					setGuidanceMessage(validation.guidanceMessage || "Укажите имя и телефон");
					if (validation.errorField === "fullName") nameInputRef.current?.focus();
					else if (validation.errorField === "phone") phoneInputRef.current?.focus();
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
					isSomaticNorm: draftIsSomaticNorm,
					notes: draftNotes.trim() || undefined,
					passport: draftPassportSeries || draftPassportNumber ? { series: draftPassportSeries, number: draftPassportNumber } : undefined,
					snils: draftSnils || undefined,
				};
				setPatients((prev) => [newPatient, ...prev]);
				setSelectedPatientId(newPatient.id);
				setMode("view"); setActiveTab("profile"); setGuidanceMessage(null);
				showToast(`Пациент ${newPatient.fullName} успешно зарегистрирован`, "success");
				onSavePatient?.(newPatient);
			} else {
				showToast("Данные карты пациента сохранены", "success");
				if (currentPatient) onSavePatient?.(currentPatient);
			}
		}, [mode, draftName, draftPhone, draftBirthDate, draftCategory, draftIsSomaticNorm, draftNotes, draftPassportSeries, draftPassportNumber, draftSnils, currentPatient, onSavePatient]);

		// Мандат 8n: покрытие долга за счет родственника в 1 клик
		const handlePayDebtFromRelative = useCallback((payer: FamilyMember) => {
			if (!currentFamily || !currentPatient || currentPatient.balanceKopecks >= 0) return;
			const debt = Math.abs(currentPatient.balanceKopecks);
			const pay = Math.min(debt, Math.max(0, payer.balanceKopecks));
			if (pay <= 0) {
				showToast(`На счёте родственника ${payer.fullName} нет доступного аванса`, "warning");
				return;
			}
			const result = transferFamilyBalance({
				fromMemberId: payer.id, toMemberId: currentPatient.id, amountKopecks: pay, members: currentFamily.members,
			});
			if (result.success) {
				setFamilies((prev) => prev.map((f) => (f.familyId === currentFamily.familyId ? { ...f, members: result.updatedMembers } : f)));
				setPatients((prev) => prev.map((p) => (p.id === currentPatient.id ? { ...p, balanceKopecks: p.balanceKopecks + pay } : p)));
				showToast(result.message, "success");
			} else {
				showToast(result.message, "error");
			}
		}, [currentFamily, currentPatient]);

		if (!isOpen) return null;
		const familyBalance = currentFamily ? calculateFamilyBalanceKopecks(currentFamily.members) : 0;

		const modalContent = (
			<div className="patient-studio-overlay fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-x-clip" data-testid="patient-studio-modal">
				<div className="patient-studio-card w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="patient-studio-title">
					{/* Apple HIG iOS Handle для смартфона (390×844) */}
					<div className="sm:hidden pt-2 pb-1 flex justify-center"><div className="w-9 h-1 bg-[var(--line-strong)] rounded-full" /></div>

					{/* 1-Строчная эргономичная шапка студии (Мандат 8am) */}
					<header className="patient-studio-header border-b border-[var(--line)] bg-[var(--paper-subtle)] px-4 sm:px-6 py-3">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-9 h-9 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0"><User size={18} /></div>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<h2 id="patient-studio-title" className="text-sm sm:text-base font-semibold break-words whitespace-normal leading-tight text-[var(--ink)]">
											{mode === "create" ? "Экспресс-регистрация за 10 сек" : currentPatient?.fullName || "Карточка пациента"}
										</h2>
										{mode === "view" && currentPatient && (
											<span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${currentPatient.category === "vip" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20"}`}>
												{PATIENT_CATEGORIES_CATALOG[currentPatient.category].labelRu}
											</span>
										)}
										{mode === "view" && currentPatient?.isSomaticNorm && (
											<span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<ShieldCheck size={11} /> Норма
											</span>
										)}
									</div>
									<p className="text-xs text-[var(--muted)] break-words whitespace-normal mt-0.5">{mode === "create" ? "Только ФИО и телефон • Без бюрократии" : formatPhoneDisplay(currentPatient?.phone)}</p>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{mode === "view" ? (
									<button type="button" onClick={handleStartCreate} className="h-8 px-2.5 sm:px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-0" data-testid="patient-studio-new-btn">
										<Plus size={14} /><span className="hidden sm:inline">Новый пациент</span>
									</button>
								) : (
									<button type="button" onClick={() => { setMode("view"); setActiveTab("profile"); }} className="h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] sm:min-h-0">Отмена</button>
								)}
								<button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)] flex items-center justify-center transition-colors min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0" aria-label="Закрыть" data-testid="patient-studio-close-btn"><X size={18} /></button>
							</div>
						</div>

						{mode === "view" && (
							<div className="mt-2.5 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line-subtle)]/50">
								<nav className="flex items-center gap-1" aria-label="Разделы карточки пациента">
									<button type="button" onClick={() => setActiveTab("profile")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px] sm:min-h-0 ${activeTab === "profile" ? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]" : "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)]"}`}><FileText size={13} /><span>Анкета</span></button>
									<button type="button" onClick={() => setActiveTab("family")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px] sm:min-h-0 ${activeTab === "family" ? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]" : "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)]"}`}><Users size={13} /><span className="hidden sm:inline">Семейный баланс</span><span className="sm:hidden">Семья</span></button>
									<button type="button" onClick={() => setActiveTab("history")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px] sm:min-h-0 ${activeTab === "history" ? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]" : "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)]"}`}><Clock size={13} /><span>История</span></button>
								</nav>
								<div ref={searchContainerRef} className="relative w-full sm:w-56">
									<div className="relative">
										<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
										<input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }} onFocus={() => setIsSearchOpen(true)} placeholder="Поиск пациента..." style={{ paddingLeft: "40px" }} className="w-full h-8 pr-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none transition-colors" />
									</div>
									{isSearchOpen && searchQuery.trim() && (
										<div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-lg z-50 py-1">
											{filteredPatients.length > 0 ? filteredPatients.map((p) => (
												<button key={p.id} type="button" onClick={() => handleSelectPatient(p.id)} className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--paper-subtle)] flex items-center justify-between gap-2">
													<span className="font-medium text-[var(--ink)] truncate">{p.fullName}</span><span className="text-[11px] text-[var(--muted)] shrink-0">{formatPhoneDisplay(p.phone)}</span>
												</button>
											)) : <div className="px-3 py-2 text-xs text-[var(--muted)] text-center">Пациент не найден</div>}
										</div>
									)}
								</div>
							</div>
						)}
					</header>

					{/* Скроллируемое тело студии */}
					<div className="patient-studio-body flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
						{mode === "create" ? (
							<div className="space-y-4" data-testid="patient-express-registration-form">
								{guidanceMessage && (
									<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
										<AlertCircle size={16} className="shrink-0" /><span>{guidanceMessage}</span>
									</div>
								)}
								<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3.5">
									<div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-[var(--muted)]">Обязательные данные для приёма (10 секунд)</h3><span className="text-[11px] text-[var(--teal)] font-medium">Без бюрократии</span></div>
									<div className="space-y-3">
										<div>
											<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Фамилия, Имя и Отчество <span className="text-red-500">*</span></label>
											<input ref={nameInputRef} type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Иванов Алексей Сергеевич" className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none" data-testid="express-patient-name-input" />
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div>
												<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Мобильный телефон <span className="text-red-500">*</span></label>
												<input ref={phoneInputRef} type="tel" value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="+7 (999) 000-00-00" className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none" data-testid="express-patient-phone-input" />
											</div>
											<div>
												<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Дата рождения (по желанию)</label>
												<input type="date" value={draftBirthDate} onChange={(e) => setDraftBirthDate(e.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none" />
											</div>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
											<div>
												<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Категория пациента</label>
												<div className="flex items-center gap-1.5">
													{(["primary", "regular", "vip"] as const).map((cat) => (
														<button key={cat} type="button" onClick={() => setDraftCategory(cat)} className={`flex-1 h-9 px-2 text-xs font-medium rounded-lg border transition-colors ${draftCategory === cat ? cat === "vip" ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold" : "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] font-semibold" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>
															{cat === "primary" ? "Первичный" : cat === "regular" ? "Постоянный" : "VIP"}
														</button>
													))}
												</div>
											</div>
											<div>
												<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Соматический статус</label>
												<button type="button" onClick={() => setDraftIsSomaticNorm(!draftIsSomaticNorm)} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${draftIsSomaticNorm ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
													<div className="flex items-center gap-1.5">{draftIsSomaticNorm ? <ShieldCheck size={14} /> : <HeartPulse size={14} />}<span>{draftIsSomaticNorm ? "✓ Соматически здоров" : "Особый статус"}</span></div>
													<span className="text-[10px] text-[var(--muted)]">1 клик</span>
												</button>
											</div>
										</div>
										<div>
											<label className="block text-xs font-medium mb-1 text-[var(--ink-secondary)]">Клинические заметки / Жалобы</label>
											<input type="text" value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="Острая боль, консультация ортодонта..." className="w-full h-10 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none" />
										</div>
									</div>
								</div>
								<div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--paper-subtle)]">
									<button type="button" onClick={() => setShowDocFields((prev) => !prev)} className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--paper)] transition-colors min-h-[44px] sm:min-h-0">
										<span>Паспорт и СНИЛС (строго опционально после приёма)</span>{showDocFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
									</button>
									{showDocFields && (
										<div className="p-4 pt-1 space-y-3 border-t border-[var(--line)] bg-[var(--paper)]">
											<p className="text-[11px] text-[var(--muted)]">Пациент может заполнить паспортные данные в зоне ожидания или после осмотра.</p>
											<div className="grid grid-cols-2 gap-2.5">
												<input type="text" placeholder="Серия паспорта" value={draftPassportSeries} onChange={(e) => setDraftPassportSeries(e.target.value)} className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]" />
												<input type="text" placeholder="Номер паспорта" value={draftPassportNumber} onChange={(e) => setDraftPassportNumber(e.target.value)} className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]" />
											</div>
											<input type="text" placeholder="СНИЛС (000-000-000 00)" value={draftSnils} onChange={(e) => setDraftSnils(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] text-xs text-[var(--ink)]" />
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="space-y-4" data-testid="patient-studio-detail-view">
								{(activeTab === "profile" || activeTab === "family") && (
									<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${currentPatient.category === "vip" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20"}`}>
													{PATIENT_CATEGORIES_CATALOG[currentPatient.category].labelRu}
												</span>
												{currentPatient.isSomaticNorm && (
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
														<ShieldCheck size={12} /> Соматически здоров
													</span>
												)}
											</div>
											<div className="text-right">
												<span className="text-xs text-[var(--muted)] block">Баланс пациента</span>
												<span className={`text-base font-bold ${currentPatient.balanceKopecks < 0 ? "text-red-500" : currentPatient.balanceKopecks > 0 ? "text-emerald-500" : "text-[var(--ink)]"}`} data-testid="patient-studio-balance">
													{formatKopecksToRub(currentPatient.balanceKopecks)}
												</span>
											</div>
										</div>
										{currentPatient.allergies.length > 0 && (
											<div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
												<AlertCircle size={14} className="shrink-0" /><span>Аллергия: {currentPatient.allergies.join(", ")}</span>
											</div>
										)}
										{currentPatient.notes && <p className="text-xs text-[var(--ink-secondary)] bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">{currentPatient.notes}</p>}
									</div>
								)}

								{(activeTab === "profile" || activeTab === "family") && (
									<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3" data-testid="patient-family-balance-section">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0"><Users size={15} /></div>
												<div>
													<h3 className="text-xs font-semibold text-[var(--ink)] leading-tight">Семейный доступ и кошелек</h3>
													{currentFamily && <p className="text-[11px] text-[var(--muted)]">{currentFamily.familyName}</p>}
												</div>
											</div>
											{currentFamily && (
												<div className="text-right">
													<span className="text-[11px] text-[var(--muted)] block">Общий баланс семьи</span>
													<span className={`text-xs sm:text-sm font-bold ${familyBalance < 0 ? "text-red-500" : familyBalance > 0 ? "text-emerald-500" : "text-[var(--ink)]"}`}>{formatKopecksToRub(familyBalance)}</span>
												</div>
											)}
										</div>
										{currentFamily ? (
											<div className="space-y-2">
												{currentFamily.members.map((member) => {
													const isCurrent = member.patientId === currentPatient.id;
													const hasAdvance = member.balanceKopecks > 0;
													const hasDebt = currentPatient.balanceKopecks < 0;
													return (
														<div key={member.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${isCurrent ? "bg-[var(--paper)] border-[var(--teal)]/30 ring-1 ring-[var(--teal)]/10" : "bg-[var(--paper)] border-[var(--line)]"}`}>
															<div className="min-w-0 flex-1">
																<div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
																	<span className="text-xs font-semibold text-[var(--ink)] leading-snug">{member.fullName}</span>
																	<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper-subtle)] border border-[var(--line)] text-[var(--muted)] shrink-0">{FAMILY_ROLE_LABELS[member.role]}</span>
																	{isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--teal)]/10 text-[var(--teal)] font-medium shrink-0">Текущий</span>}
																</div>
																<span className="text-[11px] text-[var(--muted)] block mt-0.5">{formatPhoneDisplay(member.phone)}</span>
															</div>
															<div className="flex items-center gap-2 shrink-0">
																<span className={`text-xs font-bold ${member.balanceKopecks < 0 ? "text-red-500" : member.balanceKopecks > 0 ? "text-emerald-500" : "text-[var(--ink)]"}`}>{formatKopecksToRub(member.balanceKopecks)}</span>
																{hasDebt && !isCurrent && hasAdvance && (
																	<button type="button" onClick={() => handlePayDebtFromRelative(member)} className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-subtle)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0" title="Покрыть долг за счёт аванса родственника" data-testid={`pay-from-relative-${member.id}`}>
																		<ArrowRightLeft size={12} className="text-[var(--teal)]" /><span>Оплатить</span>
																	</button>
																)}
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-center"><p className="text-xs text-[var(--muted)]">Пациент не привязан к семейной группе.</p></div>
										)}
									</div>
								)}

								{activeTab === "history" && (
									<div className="p-4 rounded-2xl bg-[var(--paper-subtle)] border border-[var(--line)] space-y-3">
										<div className="flex items-center gap-2"><Clock size={16} className="text-[var(--teal)]" /><h3 className="text-xs font-semibold text-[var(--ink)]">История приёмов и плановых осмотров</h3></div>
										<div className="space-y-2.5">
											{currentPatient.lastVisitDate && (
												<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
													<div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /><div><span className="text-xs font-medium text-[var(--ink)] block">Завершенный приём</span><span className="text-[11px] text-[var(--muted)]">{currentPatient.doctorName || "Лечащий врач"}</span></div></div>
													<span className="text-xs font-medium text-[var(--muted)]">{currentPatient.lastVisitDate}</span>
												</div>
											)}
											{currentPatient.nextAppointmentDate && (
												<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--teal)]/30 flex items-center justify-between">
													<div className="flex items-center gap-2"><Calendar size={15} className="text-[var(--teal)]" /><div><span className="text-xs font-semibold text-[var(--ink)] block">Запланированный визит</span><span className="text-[11px] text-[var(--muted)]">{currentPatient.notes || "Плановое лечение"}</span></div></div>
													<span className="text-xs font-semibold text-[var(--teal)]">{currentPatient.nextAppointmentDate}</span>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Floating Bottom Bar: РОВНО ОДНА Primary CTA кнопка #0d9488 — ВСЕГДА кликабельна (Мандат 8e, 8am) */}
					<footer className="patient-studio-footer px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-strong)]/90 backdrop-blur-md flex items-center justify-between gap-3">
						<div className="text-xs text-[var(--muted)] truncate hidden sm:block">
							{mode === "create" ? "✓ Экспресс-регистрация за 10 секунд" : `Врач: ${currentPatient?.doctorName || "Не назначен"}`}
						</div>
						<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
							{mode === "view" && onNewAppointment && currentPatient && (
								<button type="button" onClick={() => onNewAppointment(currentPatient.id)} className="h-11 sm:h-9 px-3.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors min-h-[44px] sm:min-h-0 flex items-center gap-1.5">
									<Calendar size={14} className="text-[var(--muted)]" /><span>Записать на приём</span>
								</button>
							)}
							<button type="button" onClick={handleSave} disabled={false} className="h-11 sm:h-9 px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-hover)] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial" data-testid="patient-studio-primary-cta">
								<Check size={16} /><span>{mode === "create" ? "Зарегистрировать пациента" : "Сохранить карту пациента"}</span>
							</button>
						</div>
					</footer>
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
	},
);

export default PatientStudioModal;
