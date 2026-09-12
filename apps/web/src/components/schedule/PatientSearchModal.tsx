/**
 * PatientSearchModal.tsx — Instant Reception Patient Quick Search & 1-Click Booking Modal.
 *
 * Provides:
 * - 150ms debounced live search by phone digits («916», «+7 925»), surname («Иван», «Смир»), card number;
 * - Match visual highlighting;
 * - Patient status & balance badges (debt, advance);
 * - 1-Click action triggers (Quick Booking, Open Patient Card, WhatsApp / Call).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	CalendarPlus,
	CreditCard,
	FileText,
	MessageSquare,
	Phone,
	Plus,
	Search,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	UserX,
	Wallet,
	X,
} from "lucide-react";
import type { Patient } from "@dental/shared";
import {
	parseSearchQueryForQuickPatient,
	searchPatientsQuick,
	type QuickPatientPrefill,
	type SearchablePatient,
	type SearchMatchHighlightPart,
} from "./patientSearchEngine";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { showToast, type ToastType } from "../GlobalToast";

export interface PatientSearchModalProps {
	readonly isOpen: boolean;
	readonly patients: readonly Patient[];
	readonly onClose: () => void;
	readonly onSelectPatientForBooking?: ((patient: Patient) => void) | undefined;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
	readonly onQuickCreatePatient?: ((prefilled: QuickPatientPrefill) => void) | undefined;
	readonly onQuickBookNewPatient?: ((patient: Patient) => void) | undefined;
	readonly showToastFn?: ((message: string, type?: ToastType) => void) | undefined;
}

function RenderHighlightedParts({ parts }: { parts: readonly SearchMatchHighlightPart[] }) {
	return (
		<span>
			{parts.map((part, index) =>
				part.isMatch ? (
					<mark
						key={`${index}-${part.text}`}
						className="bg-amber-200 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
					>
						{part.text}
					</mark>
				) : (
					<span key={`${index}-${part.text}`}>{part.text}</span>
				),
			)}
		</span>
	);
}

export function PatientSearchModal({
	isOpen,
	patients,
	onClose,
	onSelectPatientForBooking,
	onOpenPatientCard,
	onQuickCreatePatient,
	onQuickBookNewPatient,
	showToastFn,
}: PatientSearchModalProps) {
	const notify = showToastFn ?? showToast;
	const [rawQuery, setRawQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isInlineQuickCreate, setIsInlineQuickCreate] = useState(false);
	const [quickFullName, setQuickFullName] = useState("");
	const [quickPhone, setQuickPhone] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const quickNameRef = useRef<HTMLInputElement>(null);

	// 150ms Debounce for lightning responsiveness without stutter
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(rawQuery);
			setSelectedIndex(0);
		}, 150);
		return () => clearTimeout(timer);
	}, [rawQuery]);

	// Auto-focus input on open
	useEffect(() => {
		if (isOpen) {
			setRawQuery("");
			setDebouncedQuery("");
			setSelectedIndex(0);
			setIsInlineQuickCreate(false);
			setQuickFullName("");
			setQuickPhone("");
			setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
		}
	}, [isOpen]);

	const searchResults = useMemo(() => {
		return searchPatientsQuick(patients, debouncedQuery, 25);
	}, [patients, debouncedQuery]);

	if (!isOpen) return null;

	const handleQuickCreate = () => {
		const prefilled = parseSearchQueryForQuickPatient(rawQuery);
		setQuickFullName(prefilled.fullName);
		setQuickPhone(prefilled.phone);
		setIsInlineQuickCreate(true);
		if (onQuickCreatePatient) {
			onQuickCreatePatient(prefilled);
		}
		setTimeout(() => {
			quickNameRef.current?.focus();
		}, 50);
	};

	const handleQuickSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmedName = quickFullName.trim() || rawQuery.trim() || "Новый пациент";
		const trimmedPhone = quickPhone.trim() || null;

		const newPatient: Patient = {
			id: `quick-${Date.now()}`,
			organizationId: "00000000-0000-0000-0000-000000000000",
			status: "active",
			fullName: trimmedName,
			phone: trimmedPhone,
			birthDate: null,
			email: null,
			notes: null,
			administrativeProfile: null,
			balanceRub: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		if (onSelectPatientForBooking) {
			onSelectPatientForBooking(newPatient);
		} else if (onQuickBookNewPatient) {
			onQuickBookNewPatient(newPatient);
		}
		if (onQuickCreatePatient) {
			onQuickCreatePatient({ fullName: trimmedName, phone: trimmedPhone || "" });
		}
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			if (isInlineQuickCreate) {
				setIsInlineQuickCreate(false);
			} else {
				onClose();
			}
		} else if (e.key === "ArrowDown" && !isInlineQuickCreate) {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
		} else if (e.key === "ArrowUp" && !isInlineQuickCreate) {
			e.preventDefault();
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, searchResults.length - 1)));
		} else if (e.key === "Enter" && !isInlineQuickCreate && searchResults[selectedIndex]) {
			e.preventDefault();
			const target = searchResults[selectedIndex].patient;
			if (onSelectPatientForBooking) {
				onSelectPatientForBooking(target);
				onClose();
			} else if (onOpenPatientCard) {
				onOpenPatientCard(target.id);
				onClose();
			}
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Мгновенный поиск пациента"
			onClick={onClose}
		>
			<div
				className="bg-[var(--paper)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--line)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
				data-testid="patient-search-modal"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleKeyDown}
			>
				{/* Search Input Bar */}
				<div className="p-3 border-b border-[var(--line)] flex items-center gap-3 bg-[var(--paper-soft)]">
					<Search className="w-5 h-5 text-[var(--teal,var(--brand-primary))] shrink-0 ml-1" />
					<input
						ref={inputRef}
						type="text"
						value={rawQuery}
						onChange={(e) => setRawQuery(e.target.value)}
						placeholder="Поиск по телефону (916, +7 925), фамилии (Иван, Смир) или карте..."
						className="flex-1 bg-transparent text-[var(--ink)] text-sm font-semibold placeholder:text-[var(--muted)] outline-none border-none"
						data-testid="patient-search-input"
					/>
					{rawQuery && (
						<button
							type="button"
							onClick={() => setRawQuery("")}
							className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-[var(--muted)] hover:text-[var(--ink)] rounded-xl hover:bg-[var(--paper)] transition-colors cursor-pointer shrink-0"
							title="Очистить"
							aria-label="Очистить поиск"
						>
							<X className="w-4 h-4" />
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer shadow-2xs shrink-0"
						aria-label="Закрыть окно поиска (Esc)"
						title="Закрыть (Esc)"
					>
						Esc
					</button>
				</div>

				{/* 1-Click Fast Check-in & Patient Creation Toolbar - Zero Dead-Ends (Mandate 8e, 8n) */}
				<div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-teal-500/10 dark:bg-teal-950/30 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2 text-xs font-semibold text-teal-950 dark:text-teal-200 min-w-0">
						<UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="truncate">Пациента нет в базе или новый визит?</span>
					</div>
					<button
						type="button"
						data-testid="search-modal-quick-create-btn"
						onClick={handleQuickCreate}
						className="h-9 min-h-[36px] min-w-[44px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
						title="+ Быстрый пациент за 5 сек: ФИО + Телефон"
					>
						<Plus className="w-4 h-4" />
						<span>+ Быстрый пациент за 5 сек: ФИО + Телефон</span>
					</button>
				</div>

				{/* Inline Quick Patient Form - Zero Dead-Ends & Anti-Matryoshka (Depth strictly 1) */}
				{isInlineQuickCreate && (
					<form
						onSubmit={handleQuickSubmit}
						className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-200/60 dark:border-teal-800/60 space-y-3 animate-in fade-in duration-150"
						data-testid="quick-patient-inline-form"
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-xs font-bold text-teal-950 dark:text-teal-200">
								<UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Быстрое создание пациента: ФИО + Телефон</span>
							</div>
							<button
								type="button"
								data-testid="quick-patient-cancel-btn"
								onClick={() => setIsInlineQuickCreate(false)}
								className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
							>
								Свернуть
							</button>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
									ФИО пациента <span className="text-rose-500">*</span>
								</label>
								<input
									ref={quickNameRef}
									type="text"
									data-testid="quick-patient-fullname-input"
									value={quickFullName}
									onChange={(e) => setQuickFullName(e.target.value)}
									placeholder="Иванов Иван Иванович"
									className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500"
									autoFocus
								/>
							</div>
							<div>
								<label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
									Телефон <span className="text-rose-500">*</span>
								</label>
								<input
									type="tel"
									data-testid="quick-patient-phone-input"
									value={quickPhone}
									onChange={(e) => setQuickPhone(e.target.value)}
									placeholder="+7 (___) ___-__-__"
									className="w-full h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
								/>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 pt-1">
							<button
								type="button"
								data-testid="quick-patient-cancel-action-btn"
								onClick={() => setIsInlineQuickCreate(false)}
								className="h-9 px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--paper-soft)] rounded-xl transition-colors cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="submit"
								data-testid="quick-patient-submit-btn"
								className="h-9 px-4 text-xs font-bold rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
							>
								<CalendarPlus className="w-4 h-4" />
								<span>+ Создать и записать на приём</span>
							</button>
						</div>
					</form>
				)}

				{/* Results Header / Count */}
				<div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] font-medium">
					<span>
						Найдено пациентов: <strong className="text-[var(--ink)]">{searchResults.length}</strong>
					</span>
					<span className="text-[11px] opacity-75">↑↓ навигация · Enter выбор</span>
				</div>

				{/* Search Results List */}
				<div className="flex-1 overflow-y-auto divide-y divide-[var(--line)] p-1">
					{searchResults.length === 0 ? (
						<div className="py-12 px-4 text-center text-slate-400 space-y-3">
							<UserX className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
							<p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
								Пациенты не найдены
							</p>
							<p className="text-xs">
								{rawQuery
									? `По запросу «${rawQuery}» ничего не найдено`
									: "Проверьте номер телефона или напишите первые буквы фамилии"}
							</p>
							<div className="pt-2">
								<button
									type="button"
									data-testid="search-modal-empty-quick-btn"
									onClick={handleQuickCreate}
									className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
								>
									<Plus className="w-4 h-4" />
									<span>Зарегистрировать за 5 сек: «{rawQuery.trim() || "Новый пациент"}»</span>
								</button>
							</div>
						</div>
					) : (
						searchResults.map((item, index) => {
							const { patient } = item;
							const patientRecord = patient as Record<string, any>;
							const isSelected = index === selectedIndex;
							const balance = typeof patientRecord.balanceRub === "number" ? patientRecord.balanceRub : 0;

							return (
								<div
									key={patient.id}
									onClick={() => {
										if (onSelectPatientForBooking) {
											onSelectPatientForBooking(patient);
											onClose();
										} else if (onOpenPatientCard) {
											onOpenPatientCard(patient.id);
											onClose();
										}
									}}
									onMouseEnter={() => setSelectedIndex(index)}
									className={`p-3 rounded-xl transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
										isSelected
											? "bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 shadow-xs"
											: "hover:bg-[var(--paper-soft)]"
									}`}
									data-testid={`patient-search-result-${patient.id}`}
								>
									{/* Patient Info */}
									<div className="space-y-1 min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 truncate">
												<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
												<RenderHighlightedParts parts={item.fullNameHighlights} />
											</span>

											{item.isFuzzy && (
												<span
													className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0 inline-flex items-center gap-1"
													title="Возможно опечатка в запросе"
													data-testid="fuzzy-match-badge"
												>
													<Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
													<span>Возможно, вы имели в виду: {item.suggestedName || patient.fullName}</span>
												</span>
											)}

											{balance < 0 ? (
												<span
													className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 shrink-0"
													title="Задолженность"
												>
													Долг: {Math.abs(balance).toLocaleString("ru-RU")} ₽
												</span>
											) : balance > 0 ? (
												<span
													className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shrink-0"
													title="Аванс"
												>
													Аванс: {balance.toLocaleString("ru-RU")} ₽
												</span>
											) : null}
										</div>

										<div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
											{patient.phone ? (
												<span className="font-mono flex items-center gap-1">
													<Phone className="w-3 h-3 text-slate-400 shrink-0" />
													<RenderHighlightedParts parts={item.phoneHighlights} />
												</span>
											) : (
												<span className="text-slate-400">Нет телефона</span>
											)}

											{patient.birthDate && (
												<span>
													{new Date(patient.birthDate).toLocaleDateString("ru-RU")}
												</span>
											)}

											{(patient as SearchablePatient).cardNumber && (
												<span className="flex items-center gap-1 font-mono">
													<CreditCard className="w-3 h-3 text-slate-400" />
													{item.cardHighlights ? (
														<RenderHighlightedParts parts={item.cardHighlights} />
													) : (
														`№${(patient as SearchablePatient).cardNumber}`
													)}
												</span>
											)}
										</div>
									</div>

									{/* 1-Click Action Buttons: WhatsApp, Card, Booking */}
									<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
										<button
											type="button"
											data-testid={`quick-wa-patient-${patient.id}`}
											onClick={() => {
												if (patient.phone) {
													openWhatsAppChat(patient.phone, "Здравствуйте! Напоминаем о записи в стоматологию.");
												} else {
													notify(
														"У пациента не указан номер телефона. Заполните телефон в карточке пациента.",
														"warning",
													);
												}
											}}
											disabled={false}
											className={`h-9 min-h-[44px] min-w-[44px] px-2.5 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 ${
												patient.phone
													? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
													: "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
											}`}
											title={
												patient.phone
													? "WhatsApp напоминание"
													: "Номер телефона не указан (нажмите для подсказки)"
											}
											aria-label="WhatsApp напоминание"
										>
											<MessageSquare className="w-4 h-4" />
										</button>

										<button
											type="button"
											data-testid={`quick-open-card-${patient.id}`}
											onClick={() => {
												if (onOpenPatientCard) {
													onOpenPatientCard(patient.id);
												}
												onClose();
											}}
											className="h-9 min-h-[36px] min-w-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
											title="Открыть карту"
											aria-label="Открыть карту"
										>
											<FileText className="w-4 h-4" />
											<span className="hidden sm:inline">Открыть карту</span>
										</button>

										<button
											type="button"
											data-testid={`quick-book-patient-${patient.id}`}
											onClick={() => {
												if (onSelectPatientForBooking) {
													onSelectPatientForBooking(patient);
												}
												onClose();
											}}
											className="h-9 min-h-[36px] min-w-[44px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,var(--brand-primary))] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
											title="+ Записать на приём"
											aria-label="+ Записать на приём"
										>
											<CalendarPlus className="w-4 h-4" />
											<span>+ Записать на приём</span>
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}

