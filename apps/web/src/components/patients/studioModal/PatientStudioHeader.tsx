/**
 * PatientStudioHeader.tsx — Эргономичная шапка студии картотеки пациентов.
 *
 * МАНДАТЫ:
 * - Мандат 8am (Единый дизайн-код): строгая визуальная иерархия, чистые контрасты, без капслока.
 * - Apple HIG (390×844): сенсорный комфорт >= 44×44px, 0px горизонтального скролла.
 * - Мандат 8b (Sweet Spot: 120–220 строк).
 */

import React, { useState, useRef, useEffect } from "react";
import { User, Plus, X, Search, Users, FileText, Clock, ShieldCheck } from "lucide-react";
import {
	type PatientCatalogItem,
	PATIENT_CATEGORIES_CATALOG,
	formatPhoneDisplay,
} from "../patientCatalogData";
import type { PatientStudioTab } from "./usePatientStudioState";

export interface PatientStudioHeaderProps {
	readonly mode: "view" | "create";
	readonly currentPatient?: PatientCatalogItem;
	readonly activeTab: PatientStudioTab;
	readonly onSelectTab: (tab: PatientStudioTab) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly filteredPatients: readonly PatientCatalogItem[];
	readonly onSelectPatient: (patientId: string) => void;
	readonly onStartCreate: () => void;
	readonly onCancelCreate: () => void;
	readonly onClose: () => void;
}

export const PatientStudioHeader: React.FC<PatientStudioHeaderProps> = React.memo(
	function PatientStudioHeader({
		mode,
		currentPatient,
		activeTab,
		onSelectTab,
		searchQuery,
		onSearchChange,
		filteredPatients,
		onSelectPatient,
		onStartCreate,
		onCancelCreate,
		onClose,
	}) {
		const [isSearchOpen, setIsSearchOpen] = useState(false);
		const searchContainerRef = useRef<HTMLDivElement>(null);

		// Закрытие выпадающего списка поиска по клику вне
		useEffect(() => {
			function handleClickOutside(e: MouseEvent) {
				if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
					setIsSearchOpen(false);
				}
			}
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, []);

		return (
			<header className="patient-studio-header border-b border-[var(--line)] bg-[var(--paper-subtle)]">
				{/* Верхняя строка шапки */}
				<div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0">
							<User size={18} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2
									id="patient-studio-title"
									className="text-sm sm:text-base font-semibold truncate leading-tight text-[var(--ink)]"
								>
									{mode === "create" ? (
										<>
											<span className="hidden sm:inline">Экспресс-регистрация за 10 сек</span>
											<span className="sm:hidden">Экспресс-регистрация</span>
										</>
									) : (
										currentPatient?.fullName || "Карточка пациента"
									)}
								</h2>
								{mode === "view" && currentPatient && (
									<span
										className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
											currentPatient.category === "vip"
												? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
												: "bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/20"
										}`}
									>
										{PATIENT_CATEGORIES_CATALOG[currentPatient.category].labelRu}
									</span>
								)}
								{mode === "view" && currentPatient?.isSomaticNorm && (
									<span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
										<ShieldCheck size={11} />
										Норма
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] truncate mt-0.5">
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

					{/* Правые кнопки действий */}
					<div className="flex items-center gap-2 shrink-0">
						{mode === "view" ? (
							<button
								type="button"
								onClick={onStartCreate}
								className="h-8 sm:h-8 px-2.5 sm:px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-0"
								title="Зарегистрировать нового пациента"
								aria-label="Зарегистрировать нового пациента"
								data-testid="patient-studio-new-btn"
							>
								<Plus size={14} />
								<span className="hidden sm:inline">Новый пациент</span>
							</button>
						) : (
							<button
								type="button"
								onClick={onCancelCreate}
								className="h-8 px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] sm:min-h-0"
							>
								Отмена
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)] flex items-center justify-center transition-colors min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0"
							aria-label="Закрыть"
							data-testid="patient-studio-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Вторая строка: навигационные вкладки и быстрый поиск пациентов (в режиме view) */}
				{mode === "view" && (
					<div className="px-4 sm:px-6 pb-2.5 pt-0.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line-subtle)]/50">
						{/* Вкладки студии (Sentence case, без сокращений) */}
						<nav className="flex items-center gap-1" aria-label="Разделы карточки пациента">
							<button
								type="button"
								onClick={() => onSelectTab("profile")}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[36px] sm:min-h-0 whitespace-nowrap ${
									activeTab === "profile"
										? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
							>
								<FileText size={13} />
								<span>Анкета</span>
							</button>
							<button
								type="button"
								onClick={() => onSelectTab("family")}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[36px] sm:min-h-0 whitespace-nowrap ${
									activeTab === "family"
										? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
							>
								<Users size={13} />
								<span className="hidden sm:inline">Семейный баланс</span>
								<span className="sm:hidden">Семья</span>
							</button>
							<button
								type="button"
								onClick={() => onSelectTab("history")}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 min-h-[36px] sm:min-h-0 whitespace-nowrap ${
									activeTab === "history"
										? "bg-[var(--paper)] text-[var(--teal)] font-semibold shadow-xs border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
							>
								<Clock size={13} />
								<span>История</span>
							</button>
						</nav>

						{/* Строка быстрого поиска пациента */}
						<div ref={searchContainerRef} className="relative w-full sm:w-56">
							<div className="relative">
								<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => {
										onSearchChange(e.target.value);
										setIsSearchOpen(true);
									}}
									onFocus={() => setIsSearchOpen(true)}
									placeholder="Поиск пациента..."
									style={{ paddingLeft: "40px" }}
									className="w-full h-8 pr-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal)] focus:outline-none transition-colors"
								/>
							</div>

							{/* Выпадающий список совпадений поиска */}
							{isSearchOpen && searchQuery.trim() && (
								<div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-lg z-50 py-1">
									{filteredPatients.length > 0 ? (
										filteredPatients.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => {
													onSelectPatient(p.id);
													setIsSearchOpen(false);
													onSearchChange("");
												}}
												className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--paper-subtle)] flex items-center justify-between gap-2"
											>
												<span className="font-medium text-[var(--ink)] truncate">{p.fullName}</span>
												<span className="text-[11px] text-[var(--muted)] shrink-0">{formatPhoneDisplay(p.phone)}</span>
											</button>
										))
									) : (
										<div className="px-3 py-2 text-xs text-[var(--muted)] text-center">Пациент не найден</div>
									)}
								</div>
							)}
						</div>
					</div>
				)}
			</header>
		);
	},
);
