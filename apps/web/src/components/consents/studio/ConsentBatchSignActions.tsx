/**
 * apps/web/src/components/consents/studio/ConsentBatchSignActions.tsx
 *
 * Панель реестра медицинских бланков и пакетного выбора для подписания в 1 клик.
 * Обеспечивает 100% автономию врача (Мандат 8e): выбор всего пакета или отдельных бланков.
 * Поддерживает чистый адаптив: горизонтальный ряд чипов на смартфонах и вертикальный на ПК.
 */

import React from "react";
import {
	CheckSquare,
	Square,
	CheckCircle2,
	Clock,
	FileSignature,
} from "lucide-react";
import type {
	ConsentDocumentId,
	ConsentDocumentItem,
	ConsentSignStatus,
} from "../consentCatalogData";

export interface ConsentBatchSignActionsProps {
	readonly documents: readonly ConsentDocumentItem[];
	readonly activeDocId: ConsentDocumentId;
	readonly selectedIds: Set<ConsentDocumentId>;
	readonly signRecords: Record<string, {
		status: ConsentSignStatus;
		signedAt?: string;
		signatureSvg?: string;
		integrityHash?: string;
	}>;
	readonly onSelectDoc: (id: ConsentDocumentId) => void;
	readonly onToggleSelected: (id: ConsentDocumentId) => void;
	readonly onToggleAll: () => void;
}

export const ConsentBatchSignActions: React.FC<ConsentBatchSignActionsProps> = ({
	documents,
	activeDocId,
	selectedIds,
	signRecords,
	onSelectDoc,
	onToggleSelected,
	onToggleAll,
}) => {
	const allSelected = selectedIds.size === documents.length;

	return (
		<aside className="w-full md:w-80 shrink-0 p-3 md:p-4 bg-[var(--paper-soft,#f8fafc)]/50 flex flex-col gap-2">
			{/* Верхняя строка управления пакетом */}
			<div className="flex items-center justify-between px-1">
				<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted,#64748b)]">
					Бланки к визиту ({selectedIds.size}/{documents.length})
				</span>
				<button
					type="button"
					onClick={onToggleAll}
					className="text-[11px] text-[var(--teal,#0d9488)] hover:underline font-medium min-h-[28px] flex items-center cursor-pointer bg-transparent border-0 p-0"
				>
					{allSelected ? "Снять все" : "Выбрать все"}
				</button>
			</div>

			{/* Список бланков (горизонтальный на мобилке, вертикальный на десктопе) */}
			<div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
				{documents.map((doc) => {
					const rec = signRecords[doc.id] || { status: "pending" };
					const isSelected = doc.id === activeDocId;
					const isInPackage = selectedIds.has(doc.id);
					const isSigned = rec.status !== "pending";

					return (
						<div
							key={doc.id}
							onClick={() => onSelectDoc(doc.id)}
							className={`group flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all shrink-0 w-[270px] md:w-full min-h-[48px] cursor-pointer ${
								isSelected
									? "border-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]/20"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)]"
							}`}
						>
							<div
								onClick={(e) => {
									e.stopPropagation();
									onToggleSelected(doc.id);
								}}
								className="mt-0.5 text-[var(--ink-muted,#64748b)] hover:text-[var(--teal,#0d9488)] min-h-[28px] min-w-[28px] flex items-center justify-center -ml-1 cursor-pointer shrink-0"
								title={isInPackage ? "Исключить из пакета" : "Включить в пакет"}
							>
								{isInPackage ? (
									<CheckSquare size={18} className="text-[var(--teal,#0d9488)]" />
								) : (
									<Square size={18} className="text-[var(--ink-muted,#94a3b8)]" />
								)}
							</div>

							<div className="min-w-0 flex-1">
								<div className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-snug line-clamp-2">
									{doc.title}
								</div>
								<div className="text-[11px] text-[var(--ink-muted,#64748b)] truncate mt-0.5">
									{isSigned
										? rec.status === "signed_paper"
											? "Подписано на бумаге"
											: "Подписано на планшете"
										: "Ожидает подписи"}
								</div>
							</div>

							<div className="shrink-0 mt-0.5">
								{isSigned ? (
									<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
								) : (
									<Clock size={16} className="text-[var(--ink-muted,#94a3b8)]" />
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Юридический статус ЭЦП */}
			<div className="mt-auto hidden md:flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink-muted,#64748b)]">
				<FileSignature size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span>Юридическая сила ЭЦП по ст. 5 63-ФЗ. Пакетная подпись в 1 клик.</span>
			</div>
		</aside>
	);
};
