/**
 * tabs/registry/DocumentRowActionMenu.tsx
 * Dropdown menu for additional document actions (Mandate 8b <= 120 lines)
 */

import React from "react";
import { FileSignature, MoreHorizontal, Shield } from "lucide-react";
import type { DocumentRowProps } from "./documentRegistryTypes";
import { DocumentRowExportActions } from "./DocumentRowExportActions";

export const DocumentRowActionMenu: React.FC<DocumentRowProps & { actionContext: string }> = React.memo(
	function DocumentRowActionMenu(props) {
		const {
			document,
			actionContext,
			openDocActionMenuId,
			setOpenDocActionMenuId,
			documentAuditFactsLoadingId,
			loadDocumentAuditFacts,
		} = props;

		const isOpen = openDocActionMenuId === document.id;
		const isAuditLoading = documentAuditFactsLoadingId === document.id;
		const closeMenu = () => setOpenDocActionMenuId(null);

		return (
			<div className="relative inline-block">
				<button
					className="tactile-doc-btn tactile-doc-btn--icon doc-link document-row-actions-btn min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 inline-flex items-center justify-center px-1.5"
					type="button"
					onClick={() => setOpenDocActionMenuId(isOpen ? null : document.id)}
					aria-label={`Дополнительные действия с документом: ${actionContext}`}
					title="Дополнительные действия"
					aria-expanded={isOpen}
				>
					<MoreHorizontal size={15} aria-hidden="true" />
				</button>

				{isOpen && (
					<div className="document-row-actions-dropdown absolute right-0 top-[calc(100%+4px)] z-50 min-w-[220px] shadow-lg bg-[var(--paper)] border border-[var(--line)] rounded-xl p-1 flex flex-col gap-0.5">
						<button
							className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
							type="button"
							onClick={() => { closeMenu(); void loadDocumentAuditFacts(document.id); }}
							disabled={isAuditLoading}
							aria-busy={isAuditLoading || undefined}
							aria-label={`Журнал проверки: ${actionContext}`}
							data-testid={`btn-audit-doc-${document.id}`}
						>
							<Shield size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
							<span>{isAuditLoading ? "Загрузка журнала..." : "Журнал проверки документа"}</span>
						</button>

						{document.status === "issued" && !document.cryptoSignaturePkcs7 && !document.doctorSignedAt && (
							<button
								className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--primary,#0d9488)] font-semibold hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
								type="button"
								onClick={() => { closeMenu(); void loadDocumentAuditFacts(document.id); }}
								aria-label={`Подписать ЭЦП: ${actionContext}`}
							>
								<FileSignature size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
								<span>Подписать ЭЦП</span>
							</button>
						)}

						<DocumentRowExportActions {...props} onClose={closeMenu} />
					</div>
				)}
			</div>
		);
	},
);
