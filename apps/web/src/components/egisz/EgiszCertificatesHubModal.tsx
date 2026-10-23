import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Archive, FileText, Receipt, ShieldCheck, X } from "lucide-react";
import { EgiszBackgroundQueueTable } from "./EgiszBackgroundQueueTable";
import { TaxDeductionCertificateDrawer } from "./TaxDeductionCertificateDrawer";
import { MedicalRecordExtractDrawer } from "./MedicalRecordExtractDrawer";
import type { RemdDocumentRecord } from "./egiszJournalData";
import { generateFnsTaxCertificatePrintHtml, generateMedicalRecordExtractPrintHtml } from "./egiszRemdPrintTemplates";
import { SAMPLE_FNS_TAX_1151156_PRESET } from "./sampleFnsTaxPreset";
import "./egiszRemd.css";

export type EgiszHubSection = "queue" | "tax_deduction" | "extracts";

export interface EgiszCertificatesHubModalProps {
	readonly isOpen?: boolean;
	readonly onClose: () => void;
	readonly initialSection?: EgiszHubSection;
	readonly patientName?: string;
	readonly patientInn?: string;
	readonly records?: readonly RemdDocumentRecord[];
	readonly onRetryRecord?: (record: RemdDocumentRecord) => void;
}

export const EgiszCertificatesHubModal: React.FC<EgiszCertificatesHubModalProps> = ({
	isOpen = true,
	onClose,
	initialSection = "queue",
	patientName = "Смирнова Елена Васильевна",
	patientInn = "",
	records = [
		{ id: "remd-1", docTitle: "СЭМД 105: Протокол консультации", patientFullName: patientName, status: "accepted_by_egisz", createdAt: "2026-10-15T10:30:00Z" } as unknown as RemdDocumentRecord,
		{ id: "remd-2", docTitle: "СЭМД 303: Протокол операции", patientFullName: patientName, status: "sent", createdAt: "2026-10-15T11:45:00Z" } as unknown as RemdDocumentRecord,
	],
	onRetryRecord,
}) => {
	const [activeSection, setActiveSection] = useState<EgiszHubSection>(initialSection);
	if (!isOpen) return null;

	const openPrint = (html: string) => {
		const w = window.open("", "_blank");
		w?.document.write(html);
		w?.document.close();
		w?.print();
	};

	const handlePrintFns = (taxYear: number) => {
		openPrint(generateFnsTaxCertificatePrintHtml({
			documentNumber: `FNS-${taxYear}-001`,
			documentDate: new Date().toISOString(),
			taxYear,
			clinic: { name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701987654", ogrn: "1157746000000" },
			taxpayer: { fullName: patientName, inn: patientInn || undefined },
			patient: { fullName: patientName, relationshipCode: "1" },
			payments: SAMPLE_FNS_TAX_1151156_PRESET.payments,
			signer: { fullName: "Главврач Клиники", position: "Главный врач" },
		}));
	};

	const content = (
		<div className="egisz-hub-backdrop" role="dialog" aria-modal="true" data-testid="egisz-certificates-hub-modal">
			<div className="egisz-hub-modal-panel">
				<div className="egisz-mobile-drag-handle" aria-hidden="true" />
				<header className="egisz-hub-header">
					<div className="egisz-hub-top-bar">
						<div className="egisz-hub-title-group">
							<ShieldCheck size={22} className="text-teal" />
							<div>
								<h2 className="egisz-hub-title">ЕГИСЗ и официальные справки</h2>
								<p className="egisz-hub-sub">Фоновая отправка в Минздрав и печать справок пациентам</p>
							</div>
						</div>
						<button type="button" onClick={onClose} className="egisz-hub-close-btn" aria-label="Закрыть">
							<X size={20} />
						</button>
					</div>

					<div className="egisz-hub-tabs" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeSection === "queue"}
							className={`egisz-hub-tab ${activeSection === "queue" ? "active" : ""}`}
							onClick={() => setActiveSection("queue")}
						>
							<Archive size={15} /> Фоновый журнал
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeSection === "tax_deduction"}
							className={`egisz-hub-tab ${activeSection === "tax_deduction" ? "active" : ""}`}
							onClick={() => setActiveSection("tax_deduction")}
						>
							<Receipt size={15} /> Справка для налогового вычета
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeSection === "extracts"}
							className={`egisz-hub-tab ${activeSection === "extracts" ? "active" : ""}`}
							onClick={() => setActiveSection("extracts")}
						>
							<FileText size={15} /> Выписки и справки
						</button>
					</div>
				</header>

				<div className="egisz-hub-body">
					{activeSection === "queue" && <EgiszBackgroundQueueTable records={records} onRetryRecord={onRetryRecord} />}
					{activeSection === "tax_deduction" && <TaxDeductionCertificateDrawer patientName={patientName} patientInn={patientInn} payments={SAMPLE_FNS_TAX_1151156_PRESET.payments} onPrintCertificate={handlePrintFns} />}
					{activeSection === "extracts" && <MedicalRecordExtractDrawer patientName={patientName} onPrintExtract={(p) => openPrint(generateMedicalRecordExtractPrintHtml(p))} />}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};
