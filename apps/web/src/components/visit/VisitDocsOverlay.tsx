import React, { useState } from "react";
import { FileText, Printer, FileSignature, X, ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast";

interface VisitDocsOverlayProps {
	onClose: () => void;
	patientName: string;
	createDocument: (kind: string) => void;
}

export const VisitDocsOverlay: React.FC<VisitDocsOverlayProps> = ({ onClose, patientName, createDocument }) => {
	const [generating, setGenerating] = useState<string | null>(null);

	const handleGenerate = async (label: string, docType: string) => {
		setGenerating(docType);
		try {
			await createDocument(docType);
			onClose(); // Automatically close overlay on success
		} catch (err) {
			console.error(`Failed to generate ${docType}:`, err);
			showToast(`Ошибка генерации документа: ${label}`, "error");
		} finally {
			setGenerating(null);
		}
	};

	return (
		<div className="docs-overlay-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
			<div style={{ background: "var(--surface)", padding: "32px", borderRadius: "16px", width: "500px", maxWidth: "90vw", position: "relative" }}>
				<button 
					onClick={onClose}
					style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
				>
					<X size={24} />
				</button>
				
				<h2 style={{ margin: "0 0 4px 0", fontSize: "20px" }}>Документы приема</h2>
				<p style={{ margin: "0 0 24px 0", color: "var(--muted)", fontSize: "14px" }}>Пациент: {patientName}</p>
				
				<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
					
					{/* IDS Document */}
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--paper-soft)" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<ShieldCheck size={24} color="var(--brand-500)" />
							<div>
								<h3 style={{ margin: "0 0 2px 0", fontSize: "15px" }}>ИДС (Согласие на лечение)</h3>
								<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>Сформировано для текущих услуг</p>
							</div>
						</div>
						<button 
							className="secondary-button" 
							onClick={() => handleGenerate("ИДС", "informed_consent")}
							disabled={generating === "informed_consent"}
							style={{ padding: "8px 16px", fontSize: "13px" }}
						>
							{generating === "informed_consent" ? "Формируем..." : <><Printer size={16} style={{ marginRight: "6px" }} /> Печать</>}
						</button>
					</div>

					{/* Contract Document */}
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--paper-soft)" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<FileSignature size={24} color="var(--indigo)" />
							<div>
								<h3 style={{ margin: "0 0 2px 0", fontSize: "15px" }}>Договор на оказание мед. услуг</h3>
								<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>Стандартная форма клиники</p>
							</div>
						</div>
						<button 
							className="secondary-button" 
							onClick={() => handleGenerate("Договор", "paid_medical_services_contract")}
							disabled={generating === "paid_medical_services_contract"}
							style={{ padding: "8px 16px", fontSize: "13px" }}
						>
							{generating === "paid_medical_services_contract" ? "Формируем..." : <><Printer size={16} style={{ marginRight: "6px" }} /> Печать</>}
						</button>
					</div>

					{/* Note Document */}
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--paper-soft)" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<FileText size={24} color="var(--teal)" />
							<div>
								<h3 style={{ margin: "0 0 2px 0", fontSize: "15px" }}>Справка о санации / Осмотре</h3>
								<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>Выписка для школы / работы</p>
							</div>
						</div>
						<button 
							className="secondary-button" 
							onClick={() => handleGenerate("Справка", "visit_attendance_certificate")}
							disabled={generating === "visit_attendance_certificate"}
							style={{ padding: "8px 16px", fontSize: "13px" }}
						>
							{generating === "visit_attendance_certificate" ? "Формируем..." : <><Printer size={16} style={{ marginRight: "6px" }} /> Печать</>}
						</button>
					</div>

				</div>

			</div>
		</div>
	);
};
