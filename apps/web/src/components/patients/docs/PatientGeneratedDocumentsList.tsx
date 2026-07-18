import { useMemo } from "react";
import { FileText, Download, Eye } from "lucide-react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";

export function PatientGeneratedDocumentsList() {
	const appLogic = useAppLogicContext();
	const dashboard = appLogic.dashboard;
	const { selectedPatientId } = usePatientStore();

	const patientDocuments = useMemo(() => {
		if (!dashboard?.documents || !selectedPatientId) return [];
		return dashboard.documents
			.filter((doc: any) => doc.patientId === selectedPatientId)
			.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}, [dashboard?.documents, selectedPatientId]);

	if (!selectedPatientId) return null;

	return (
		<div style={{ marginTop: "32px", padding: "20px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--border)" }}>
			<h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
				<FileText size={18} color="var(--teal)" />
				Сформированные документы пациента
			</h4>

			{patientDocuments.length === 0 ? (
				<p style={{ margin: 0, color: "var(--muted)", fontSize: "14px", fontStyle: "italic" }}>
					У пациента еще нет сформированных документов.
				</p>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{patientDocuments.map((doc: any) => (
						<div 
							key={doc.id} 
							style={{ 
								display: "flex", 
								justifyContent: "space-between", 
								alignItems: "center", 
								padding: "12px", 
								background: "var(--paper-strong)", 
								borderRadius: "8px",
								border: "1px solid var(--border-light)"
							}}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
								<strong style={{ fontSize: "14px", color: "var(--ink)" }}>{doc.title || "Документ"}</strong>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>
									{new Date(doc.createdAt).toLocaleString("ru-RU")} • {doc.templateType}
								</span>
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								{doc.pdfUrl && (
									<a 
										href={doc.pdfUrl} 
										target="_blank" 
										rel="noreferrer"
										className="secondary-button"
										title="Скачать PDF"
										style={{ padding: "6px" }}
									>
										<Download size={16} />
									</a>
								)}
								<button 
									className="secondary-button"
									onClick={() => {
										if (appLogic.openIssuedDocumentHtml) {
											appLogic.openIssuedDocumentHtml(doc.id);
										}
									}}
									title="Просмотр"
									style={{ padding: "6px" }}
								>
									<Eye size={16} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
