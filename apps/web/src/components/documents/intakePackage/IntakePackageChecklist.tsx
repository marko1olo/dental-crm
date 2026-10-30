/**
 * IntakePackageChecklist.tsx
 *
 * Интерактивный чеклист бланков первичного и клинического пакета документов.
 *
 * Инварианты Apple HIG & Мандата 8am:
 * - Сенсорный минимум (Touch Target) >= 44x44px.
 * - Чистые статусы готовности, zero-jargon.
 * - Плавные переходы, карточки без горизонтального дрифта.
 */

import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { Check, FileText } from "lucide-react";
import React from "react";
import type { ClinicalItem } from "./types";

export interface IntakePackageChecklistProps {
	readonly items: readonly ClinicalItem[];
	readonly documentsByKind: Map<DocumentKind, GeneratedDocument[]>;
	readonly missingCount: number;
	readonly onOpenDocument?: ((documentId: string) => void) | undefined;
	readonly onCreateDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onSelectDocumentKind?: ((kind: DocumentKind) => void) | undefined;
}

export function IntakePackageChecklist({
	items,
	documentsByKind,
	missingCount,
	onOpenDocument,
	onCreateDocument,
	onSelectDocumentKind,
}: IntakePackageChecklistProps): React.JSX.Element {
	return (
		<div className="space-y-2.5">
			<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] px-1">
				<span>Состав пакета документов:</span>
				<span className="font-medium">
					{missingCount === 0 ? "Все бланки готовы" : `Не оформлено: ${missingCount}`}
				</span>
			</div>

			<div className="grid grid-cols-1 gap-2.5" data-testid="package-checklist-items">
				{items.map((item) => {
					const docs = documentsByKind.get(item.kind) ?? [];
					const isReady = docs.length > 0;
					const Icon = item.icon || FileText;

					return (
						<div
							key={item.kind}
							className="p-3 sm:p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--teal,#0d9488)]/40 transition"
							data-testid={`package-item-${item.kind}`}
						>
							<div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
								<div
									className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
										isReady
											? "bg-emerald-500/10 text-emerald-600"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
									}`}
								>
									<Icon size={18} />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-1.5">
										<span className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)] leading-tight">
											{item.title}
										</span>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] shrink-0 font-medium">
											{item.statutoryRef}
										</span>
									</div>
									<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] line-clamp-2 mt-0.5">
										{item.description}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 shrink-0 sm:self-center">
								{isReady ? (
									<button
										type="button"
										onClick={() => docs[0]?.id && onOpenDocument?.(docs[0].id)}
										className="secondary-button min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 hover:border-[var(--teal,#0d9488)] transition cursor-pointer"
										data-testid={`btn-open-ready-${item.kind}`}
									>
										<Check size={14} className="text-emerald-600" />
										<span>Оформлен</span>
									</button>
								) : (
									<button
										type="button"
										onClick={() => {
											if (onCreateDocument) onCreateDocument(item.kind);
											else if (onSelectDocumentKind) onSelectDocumentKind(item.kind);
										}}
										className="secondary-button min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] transition cursor-pointer"
										data-testid={`btn-open-form-${item.kind}`}
									>
										<span>Открыть</span>
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
