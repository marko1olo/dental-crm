/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS TOOLBAR (КОМПАКТНЫЙ ТУЛБАР КАТАЛОГА ДОКУМЕНТОВ КЛИНИКИ)
 * 1-Row Compact Bar (36–44px) | Apple HIG / DENTE Design Tokens
 * Strict Lucide Icons | Zero Emojis | Mandates 8d, 8e, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	ClipboardCheck,
	FileCheck,
	FileText,
	Printer,
	Search,
	X,
} from "lucide-react";
import type { DocumentsToolbarProps } from "./types";
import type { DocumentCategoryTab } from "../components/documents/DocumentNavTabs";

const CATEGORY_TABS: Array<{ key: DocumentCategoryTab; label: string }> = [
	{ key: "all", label: "Все бланки" },
	{ key: "intake", label: "Договоры и ИДС" },
	{ key: "clinical", label: "Клинические" },
	{ key: "finance_tax", label: "Финансы и 3-НДФЛ" },
	{ key: "certificates_sanpin", label: "СанПиН и справки" },
];

export const DocumentsToolbar: React.FC<DocumentsToolbarProps> = ({
	activePatient,
	patientIssuedDocsCount,
	patientDraftDocsCount,
	activeCategoryTab,
	onSelectCategoryTab,
	searchQuery,
	onSearchChange,
	onOpenAutoclaveLog,
	onOpenPrimaryIntakePackage,
	onDirectPrintPrimaryIntake,
	navCategoryCounts,
	className = "",
}) => {
	return (
		<header
			className={`documents-main-toolbar flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 mb-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xs ${className}`}
			aria-label="Панель управления документами клиники"
		>
			{/* Левый остров: Пациент, статус бланков и Segmented Bar */}
			<div className="flex items-center gap-2.5 flex-wrap min-w-0">
				{/* Пациент и бейджи */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] truncate max-w-[200px]">
							{activePatient ? activePatient.fullName : "Пациенты клиники"}
						</span>
						<span
							className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]"
							title="Количество выданных документов"
						>
							{patientIssuedDocsCount}
						</span>
						{patientDraftDocsCount > 0 && (
							<span
								className="text-[11px] font-medium px-1.5 py-0.2 rounded-full bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
								title="Черновики бланков"
							>
								{patientDraftDocsCount} черн.
							</span>
						)}
					</div>
				</div>

				{/* Сегментированный переключатель категорий (Apple HIG Segmented Bar) */}
				<nav
					className="documents-category-segmented-bar inline-flex items-center p-0.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] gap-0.5 shrink-0"
					aria-label="Фильтр по категориям документов"
				>
					{CATEGORY_TABS.map((cat) => {
						const count = navCategoryCounts ? navCategoryCounts[cat.key] : undefined;
						const isActive = activeCategoryTab === cat.key;
						return (
							<button
								key={cat.key}
								type="button"
								onClick={() => onSelectCategoryTab(cat.key)}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
									isActive
										? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold shadow-2xs border border-[var(--line,#e2e8f0)]"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-transparent"
								}`}
							>
								<span>{cat.label}</span>
								{typeof count === "number" && (
									<span
										className={`text-[10px] px-1.5 py-0.2 rounded-full ${
											isActive
												? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]"
												: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
										}`}
									>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</nav>
			</div>

			{/* Правый остров: Канонический поиск с padding-left >= 38px + Кнопки действий */}
			<div className="flex items-center gap-2 shrink-0">
				{/* Поисковое поле по стандарту Mandate Search Input */}
				<div className="dente-search-wrap relative flex items-center">
					<Search
						size={15}
						className="absolute left-3 text-[var(--muted,#64748b)] pointer-events-none"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск бланка или шаблона..."
						style={{ paddingLeft: "38px", paddingRight: searchQuery ? "32px" : "12px" }}
						className="h-8 w-48 sm:w-60 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#64748b)] focus:outline-none focus:border-[var(--teal,#0d9488)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]/15 transition-all"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="icon-button absolute right-2 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer w-6 h-6 min-w-0 min-h-0 border-none bg-transparent"
							title="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>

				{/* Быстрая печать первичного пакета */}
				<button
					type="button"
					onClick={onOpenPrimaryIntakePackage}
					data-testid="btn-print-primary-intake-package"
					className="primary-button h-8 px-3 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
					title="Распечатать пакет первичного приёма (Договор + ИДС + Персданные + Анкета)"
				>
					<Printer size={14} />
					<span>Распечатать пакет первичного приёма</span>
				</button>

				{/* Журнал стерилизации и автоклавирования (Тест-якорь) */}
				<button
					type="button"
					onClick={onOpenAutoclaveLog}
					className="secondary-button documents-open-autoclave-log-257-btn h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
					data-testid="documents-open-autoclave-log-257-btn"
					title="Открыть журнал контроля стерилизации и автоклавирования"
				>
					<FileCheck size={14} className="text-[var(--teal,#0d9488)]" />
					<span className="hidden sm:inline">Журнал автоклавирования</span>
				</button>
			</div>
		</header>
	);
};
