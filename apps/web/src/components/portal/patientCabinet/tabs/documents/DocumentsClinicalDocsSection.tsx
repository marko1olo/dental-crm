import React from "react";
import { CheckCircle2, Clock, Eye, FileCheck, FileText, Printer } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine";
import {
	formatRussianDateIso,
	formatRubles,
	generateDocumentSnapshotHtml,
	generateMedicalCardExtractHtml,
	openPrintWindow,
} from "../../patientCabinetEngine";
import { getDocumentKindLabel } from "./documentsKindHelper";

export interface DocumentsClinicalDocsSectionProps {
	readonly documents: PatientPersonalCabinetData["documents"];
	readonly data: PatientPersonalCabinetData;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsClinicalDocsSection: React.FC<DocumentsClinicalDocsSectionProps> = ({
	documents,
	data,
	onShowToast,
}) => {
	const handlePrintExtract = (doc: PatientPersonalCabinetData["documents"][number]) => {
		openPrintWindow(generateMedicalCardExtractHtml(doc, data));
		onShowToast("Выписка из медицинской карты приёма готова к печати!");
	};

	const handleViewDoc = (doc: PatientPersonalCabinetData["documents"][number]) => {
		openPrintWindow(generateDocumentSnapshotHtml(doc, data));
		onShowToast(`Документ «${doc.title}» готов к просмотру`);
	};

	return (
		<section className="pc-section-card" data-testid="clinical-documents-section">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<FileCheck size={20} className="pc-icon-primary" />
					<span>Официальные медицинские документы и договоры</span>
				</div>
				<span className="pc-section-hint">Юридически значимые документы клиники</span>
			</div>
			{(!documents || documents.length === 0) ? (
				<div className="pc-empty-state" data-testid="clinical-documents-empty">
					<FileText size={32} className="pc-icon-muted" />
					<p className="pc-empty-title">Официальные документы формируются в клинике</p>
					<p className="pc-empty-desc">
						Договоры на оказание платных медицинских услуг, акты сдачи-приемки и медицинские выписки отобразятся здесь сразу после выдачи врачом.
					</p>
				</div>
			) : (
				<div className="pc-clinical-docs-list" data-testid="clinical-documents-list">
					{documents.map((doc) => {
						const isIssued = doc.status === "issued";
						const isExtract = doc.kind === "medical_card_extract_043" || doc.kind === "medical_card_extract" || doc.kind.includes("043");
						return (
							<div key={doc.id} className={`pc-consent-card ${isIssued ? "signed" : "pending"}`} data-testid={`clinical-doc-${doc.id}`}>
								<div className="pc-consent-head">
									<div>
										<div className="pc-consent-code-row">
											<span className="pc-consent-code-badge">{getDocumentKindLabel(doc.kind)}</span>
											<strong className="pc-consent-title">{doc.title}</strong>
										</div>
										<p className="pc-consent-summary">
											Оформлен: {formatRussianDateIso(doc.dateIso)}
											{doc.totalAmountRub !== undefined && doc.totalAmountRub > 0 && (
												<> &bull; Сумма: <strong>{formatRubles(doc.totalAmountRub)}</strong></>
											)}
											{doc.documentNumber && <> &bull; № {doc.documentNumber}</>}
										</p>
									</div>
									<div>
										<span className={`pc-status-badge ${isIssued ? "paid" : "unpaid"}`}>
											{isIssued ? <CheckCircle2 size={14} /> : <Clock size={14} />}
											<span>{isIssued ? "Выдан и действителен" : "Черновик"}</span>
										</span>
									</div>
								</div>
								{doc.sha256 && (
									<div className="pc-audit-hash-badge">
										<span className="pc-hash-text">Цифровой отпечаток архива (SHA-256): <code>{doc.sha256}</code></span>
									</div>
								)}
								<div className="pc-consent-actions-row">
									{isExtract && (
										<button
											type="button"
											className="pc-btn-primary pc-btn-compact pc-extract-print-btn"
											data-testid="print-extract-043-btn"
											onClick={() => handlePrintExtract(doc)}
										>
											<Printer size={14} />
											<span>Печать выписки из медкарты</span>
										</button>
									)}
									<button
										type="button"
										className="pc-btn-secondary pc-btn-compact"
										data-testid={`view-doc-btn-${doc.id}`}
										onClick={() => handleViewDoc(doc)}
									>
										<Eye size={14} />
										<span>Печать / Просмотр</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
};
