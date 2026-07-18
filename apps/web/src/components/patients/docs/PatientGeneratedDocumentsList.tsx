import { useMemo, useEffect, useState } from "react";
import { FileText, Download, Eye, Image as ImageIcon } from "lucide-react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";

export function PatientGeneratedDocumentsList() {
	const appLogic = useAppLogicContext();
	const dashboard = appLogic.dashboard;
	const { selectedPatientId } = usePatientStore();
	const [attachments, setAttachments] = useState<any[]>([]);

	const patientDocuments = useMemo(() => {
		if (!dashboard?.documents || !selectedPatientId) return [];
		return dashboard.documents
			.filter((doc: any) => doc.patientId === selectedPatientId)
			.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}, [dashboard?.documents, selectedPatientId]);

	useEffect(() => {
		if (selectedPatientId) {
			fetch(`/api/patients/${selectedPatientId}/attachments`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => (res.ok ? res.json() : { files: [] }))
				.then((data) => setAttachments(data.files || []))
				.catch((err) => console.error("Failed to fetch attachments", err));
		} else {
			setAttachments([]);
		}
	}, [selectedPatientId]);

	if (!selectedPatientId) return null;

	const allFiles = [
		...patientDocuments.map((doc: any) => ({ ...doc, kind: "document" })),
		...attachments.map((att: any) => ({ ...att, kind: "attachment" })),
	].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return (
		<div style={{ marginTop: "32px", padding: "20px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--border)" }}>
			<h4 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
				<FileText size={18} color="var(--teal)" />
				Медицинская карта: Файлы, Снимки и Документы
			</h4>

			{allFiles.length === 0 ? (
				<p style={{ margin: 0, color: "var(--muted)", fontSize: "14px", fontStyle: "italic" }}>
					В медицинской карте пациента еще нет прикрепленных файлов и документов.
				</p>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{allFiles.map((item: any) => (
						<div 
							key={item.id} 
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
							<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
								<div style={{ color: item.kind === "attachment" ? "var(--indigo)" : "var(--teal)" }}>
									{item.kind === "attachment" ? <ImageIcon size={20} /> : <FileText size={20} />}
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
									<strong style={{ fontSize: "14px", color: "var(--ink)" }}>{item.title || item.name || "Документ"}</strong>
									<span style={{ fontSize: "12px", color: "var(--muted)" }}>
										{new Date(item.createdAt).toLocaleString("ru-RU")} • {item.kind === "attachment" ? item.type : item.templateType}
									</span>
								</div>
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								{(item.pdfUrl || item.kind === "attachment") && (
									<a 
										href={item.pdfUrl || `/api/files/attachments/${item.id}`} 
										target="_blank" 
										rel="noreferrer"
										className="secondary-button"
										title="Скачать"
										style={{ padding: "6px" }}
									>
										<Download size={16} />
									</a>
								)}
								{item.kind === "document" && (
									<button 
										className="secondary-button"
										onClick={() => {
											if (appLogic.openIssuedDocumentHtml) {
												appLogic.openIssuedDocumentHtml(item.id);
											}
										}}
										title="Просмотр"
										style={{ padding: "6px" }}
									>
										<Eye size={16} />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
