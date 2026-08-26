/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO AUDIT & COMPLIANCE PAGE (Рабочий стол Главного врача)
 * Central Quality Hub, Form 043/u Audit, Batch UKEP Signing & REMD Dispatch
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
	ShieldCheck,
	FileText,
	Award,
	CheckCircle2,
	AlertTriangle,
	Layers,
	Activity,
} from "lucide-react";
import { CmoComplianceHub } from "../components/emr/audit/CmoComplianceHub";
import { CmoEmrAuditModal } from "../components/emr/audit/CmoEmrAuditModal";

export type CmoPageViewMode = "compliance_hub" | "audit_modal";

export function CmoAuditPage() {
	const [activeView, setActiveView] = useState<CmoPageViewMode>("compliance_hub");
	const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

	return (
		<div style={{ width: "100%", minHeight: "100vh", background: "var(--paper, #f8fafc)", paddingBottom: "48px" }}>
			<div style={{ maxWidth: "1440px", margin: "0 auto", padding: "16px 16px 0 16px" }}>
				{/* Top Mode Navigation Switcher */}
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
						<ShieldCheck size={20} style={{ color: "var(--teal, #0d9488)" }} />
						<strong style={{ fontSize: "14px", color: "var(--ink, #0f172a)" }}>
							Служба контроля качества и комплаенса ЕГИСЗ
						</strong>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={() => setActiveView("compliance_hub")}
							className={`cmo-hub-btn ${activeView === "compliance_hub" ? "cmo-hub-btn--primary" : "cmo-hub-btn--secondary"}`}
							style={{ minHeight: "38px", padding: "6px 12px", fontSize: "13px" }}
						>
							<Layers size={14} />
							<span>Реестр ЕГИСЗ (РЭМД)</span>
						</button>

						<button
							type="button"
							onClick={() => setIsAuditModalOpen(true)}
							className="cmo-hub-btn cmo-hub-btn--secondary"
							style={{ minHeight: "38px", padding: "6px 12px", fontSize: "13px" }}
						>
							<FileText size={14} />
							<span>Экспертиза КЭР (Приказ 203н)</span>
						</button>
					</div>
				</div>
			</div>

			{/* Main Workspace */}
			<CmoComplianceHub
				onOpenAuditModal={() => setIsAuditModalOpen(true)}
			/>

			{/* Full EMR Quality Audit Modal */}
			{isAuditModalOpen && (
				<CmoEmrAuditModal
					isOpen={isAuditModalOpen}
					onClose={() => setIsAuditModalOpen(false)}
				/>
			)}
		</div>
	);
}

export default CmoAuditPage;
