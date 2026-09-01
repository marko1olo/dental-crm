import React, { useState } from "react";
import {
	ShieldCheck,
	FileText,
	Award,
	CheckCircle2,
	AlertTriangle,
	Layers,
	Activity,
	LayoutGrid,
} from "lucide-react";
import { CmoComplianceHub } from "../components/emr/audit/CmoComplianceHub";
import { CmoEmrAuditModal, INITIAL_DEMO_RECORDS } from "../components/emr/audit/CmoEmrAuditModal";
import { ClinicalAuditBoard } from "../components/emr/audit/ClinicalAuditBoard";
import {
	type EmrAuditRecord,
} from "../components/emr/audit/cmoEmrAuditEngine";

export type CmoPageViewMode = "audit_board" | "compliance_hub";

export function CmoAuditPage() {
	const [activeView, setActiveView] = useState<CmoPageViewMode>("audit_board");
	const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
	const [selectedRecordForAudit, setSelectedRecordForAudit] = useState<EmrAuditRecord | null>(null);

	// Seed sample records for CMO inspection board
	const [auditRecords, setAuditRecords] = useState<EmrAuditRecord[]>(() => INITIAL_DEMO_RECORDS);

	const handleUpdateRecord = (updated: EmrAuditRecord) => {
		setAuditRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
	};

	const handleBatchUpdateRecords = (updatedList: EmrAuditRecord[]) => {
		const map = new Map(updatedList.map((r) => [r.id, r]));
		setAuditRecords((prev) => prev.map((r) => map.get(r.id) || r));
	};

	return (
		<div style={{ width: "100%", minHeight: "100vh", background: "var(--paper, #f8fafc)", paddingBottom: "48px" }}>
			<div style={{ maxWidth: "1440px", margin: "0 auto", padding: "16px 16px 0 16px" }}>
				{/* Top Mode Navigation Switcher with Touch targets >= 44px */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "12px",
						padding: "10px 16px",
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, #cbd5e1)",
						borderRadius: "10px",
						marginBottom: "16px",
						flexWrap: "wrap",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<ShieldCheck size={22} style={{ color: "var(--teal, #0d9488)" }} />
						<div>
							<strong style={{ fontSize: "15px", color: "var(--ink, #0f172a)" }}>
								Кабинет Главного врача: Контроль качества медпомощи (КЭР / ВК)
							</strong>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Экспертиза карт 043/у по Приказам № 203н, 834н, 804н, 323-ФЗ ст. 20 и наложение ЭЦП
							</div>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={() => setActiveView("audit_board")}
							className={`cmo-hub-btn ${activeView === "audit_board" ? "cmo-hub-btn--primary" : "cmo-hub-btn--secondary"}`}
							style={{ minHeight: "44px", minWidth: "44px", padding: "8px 16px", fontSize: "13px" }}
						>
							<LayoutGrid size={16} />
							<span>Проверка историй болезни (Канбан)</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveView("compliance_hub")}
							className={`cmo-hub-btn ${activeView === "compliance_hub" ? "cmo-hub-btn--primary" : "cmo-hub-btn--secondary"}`}
							style={{ minHeight: "44px", minWidth: "44px", padding: "8px 16px", fontSize: "13px" }}
						>
							<Layers size={16} />
							<span>Реестр ЕГИСЗ (РЭМД)</span>
						</button>

						<button
							type="button"
							onClick={() => setIsAuditModalOpen(true)}
							className="cmo-hub-btn cmo-hub-btn--secondary"
							style={{ minHeight: "44px", minWidth: "44px", padding: "8px 16px", fontSize: "13px" }}
						>
							<FileText size={16} />
							<span>Экспертиза КЭР (Приказ 203н)</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main Workspace */}
			{activeView === "audit_board" ? (
				<ClinicalAuditBoard
					records={auditRecords}
					onUpdateRecord={handleUpdateRecord}
					onBatchUpdateRecords={handleBatchUpdateRecords}
					onOpenDetailedAudit={(rec) => {
						setSelectedRecordForAudit(rec);
						setIsAuditModalOpen(true);
					}}
				/>
			) : (
				<CmoComplianceHub
					onOpenAuditModal={() => setIsAuditModalOpen(true)}
				/>
			)}

			{/* Full EMR Quality Audit Modal */}
			{isAuditModalOpen && (
				<CmoEmrAuditModal
					isOpen={isAuditModalOpen}
					records={selectedRecordForAudit ? [selectedRecordForAudit] : auditRecords}
					onClose={() => {
						setIsAuditModalOpen(false);
						setSelectedRecordForAudit(null);
					}}
					onApproveRecord={(recordId) => {
						const rec = auditRecords.find((r) => r.id === recordId);
						if (rec) {
							handleUpdateRecord({
								...rec,
								status: "approved_by_cmo",
							});
						}
						setIsAuditModalOpen(false);
						setSelectedRecordForAudit(null);
					}}
				/>
			)}
		</div>
	);
}

export default CmoAuditPage;

