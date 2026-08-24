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
	Search,
	User,
	UserCheck,
	UserX,
	Wallet,
	X,
} from "lucide-react";
import type { Patient } from "@dental/shared";
import {
	searchPatientsQuick,
	type SearchablePatient,
	type SearchMatchHighlightPart,
} from "./patientSearchEngine";
import { openWhatsAppChat } from "../../store/telephonyStore";

export interface PatientSearchModalProps {
	readonly isOpen: boolean;
	readonly patients: readonly Patient[];
	readonly onClose: () => void;
	readonly onSelectPatientForBooking?: ((patient: Patient) => void) | undefined;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
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
}: PatientSearchModalProps) {
	const [rawQuery, setRawQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

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
			setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
		}
	}, [isOpen]);

	const searchResults = useMemo(() => {
		return searchPatientsQuick(patients, debouncedQuery, 25);
	}, [patients, debouncedQuery]);

	if (!isOpen) return null;

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, searchResults.length - 1)));
		} else if (e.key === "Enter" && searchResults[selectedIndex]) {
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
				className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-150"
				data-testid="patient-search-modal"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleKeyDown}
			>
				{/* Search Input Bar */}
				<div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50">
					<Search className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 ml-1" />
					<input
						ref={inputRef}
						type="text"
						value={rawQuery}
						onChange={(e) => setRawQuery(e.target.value)}
						placeholder="Поиск по телефону (916, +7 925), фамилии (Иван, Смир) или карте..."
						className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 text-sm font-semibold placeholder:text-slate-400 outline-none border-none"
						data-testid="patient-search-input"
					/>
					{rawQuery && (
						<button
							type="button"
							onClick={() => setRawQuery("")}
							className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
							title="Очистить"
						>
							<X className="w-4 h-4" />
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
					>
						Esc
					</button>
				</div>

				{/* Results Header / Count */}
				<div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-950/30 flex items-center justify-between text-xs text-slate-500 font-medium">
					<span>
						Найдено пациентов: <strong className="text-slate-800 dark:text-slate-200">{searchResults.length}</strong>
					</span>
					<span className="text-[11px] opacity-75">↑↓ навигация · Enter выбор</span>
				</div>

				{/* Search Results List */}
				<div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
					{searchResults.length === 0 ? (
						<div className="py-12 text-center text-slate-400 space-y-2">
							<UserX className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
							<p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
								Пациенты не найдены
							</p>
							<p className="text-xs">
								Проверьте номер телефона или напишите первые буквы фамилии
							</p>
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
											? "bg-teal-50 dark:bg-teal-950/40 border border-teal-500/30 shadow-xs"
											: "hover:bg-slate-50 dark:hover:bg-slate-800/50"
									}`}
									data-testid={`patient-search-result-${patient.id}`}
								>
									{/* Patient Info */}
									<div className="space-y-1 min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
												<User className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
												<RenderHighlightedParts parts={item.fullNameHighlights} />
											</span>

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

										<div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
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

									{/* 1-Click Action Buttons */}
									<div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
										{patient.phone && (
											<button
												type="button"
												onClick={() => openWhatsAppChat(patient.phone!, "Здравствуйте! Напоминаем о записи в стоматологию.")}
												className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer"
												title="Открыть чат в WhatsApp"
												aria-label="WhatsApp"
											>
												<MessageSquare className="w-4 h-4" />
											</button>
										)}

										{onOpenPatientCard && (
											<button
												type="button"
												onClick={() => {
													onOpenPatientCard(patient.id);
													onClose();
												}}
												className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer min-h-[40px]"
												title="Открыть медицинскую карту пациента"
											>
												<FileText className="w-3.5 h-3.5" />
												<span className="hidden sm:inline">Карта</span>
											</button>
										)}

										{onSelectPatientForBooking && (
											<button
												type="button"
												onClick={() => {
													onSelectPatientForBooking(patient);
													onClose();
												}}
												className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer min-h-[40px]"
												title="Записать пациента на прием"
											>
												<CalendarPlus className="w-4 h-4" />
												<span>Записать</span>
											</button>
										)}
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
