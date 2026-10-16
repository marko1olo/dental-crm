import React from "react";
import { AlertCircle, Calendar, FileCheck } from "lucide-react";
import { humanizeDocumentAuditText } from "../../documentAutonomy";
import { isoDateLabel } from "../../../../AppHelpers";

export interface DocumentAuditClinicalLinksSectionProps {
	facts: any;
}

export const DocumentAuditClinicalLinksSection: React.FC<DocumentAuditClinicalLinksSectionProps> = React.memo(
	function DocumentAuditClinicalLinksSection({ facts }) {
		const blockersOrWarnings = [...(facts?.blockers ?? []), ...(facts?.warnings ?? [])];

		return (
			<>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					<div className="p-2.5 px-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1">
						<div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)] uppercase">
							<Calendar className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Привязанный клинический приём</span>
						</div>
						<strong className="text-xs text-[var(--ink)]">
							{facts.visitId ? `Клинический приём № ${facts.visitId.slice(0, 8)}` : "Общеклинический документ пациента"}
						</strong>
					</div>
					<div className="p-2.5 px-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1">
						<div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)] uppercase">
							<FileCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Привязанный план лечения</span>
						</div>
						<strong className="text-xs text-[var(--ink)]">
							{facts.treatmentPlanId ? `План лечения № ${facts.treatmentPlanId.slice(0, 8)}` : "Общеклинический документ"}
						</strong>
					</div>
				</div>

				<div className="p-2.5 px-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] flex flex-col gap-1">
					<div className="flex items-center gap-1.5">
						<strong className="text-[var(--ink)]">Официальный орган:</strong>
						<span>{facts.sourceAuthority || "Минздрав России"}</span>
					</div>
					<div>
						<strong>Основание формы:</strong> {humanizeDocumentAuditText(String(facts.sourceReference || "Утвержденный бланк медицинской организации"))} · форма сверена с источником {isoDateLabel(facts.sourceCheckedAt)}
					</div>
				</div>

				{facts.taxXmlSourceSnapshotSha256 && (
					<div className="p-2.5 px-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] flex flex-col gap-1">
						<strong>Справка об оплате медицинских услуг для налогового вычета</strong>
						<div className="text-[11.5px] text-[var(--muted)]">Контрольный отпечаток данных: <code>{facts.taxXmlSourceSnapshotSha256.slice(0, 16)}</code></div>
					</div>
				)}

				{blockersOrWarnings.length > 0 && (
					<div className="flex flex-col gap-1.5">
						{blockersOrWarnings.map((note: any) => (
							<div key={String(note)} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2 px-3 rounded-lg border border-amber-500/30">
								<AlertCircle className="w-3.5 h-3.5 shrink-0" />
								<span>{humanizeDocumentAuditText(String(note))}</span>
							</div>
						))}
					</div>
				)}
			</>
		);
	},
);
