import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Archive, CheckCircle2, FileText, Receipt, ShieldCheck, X } from "lucide-react";
import { EgiszBackgroundQueueTable } from "./EgiszBackgroundQueueTable";
import { MedicalRecordExtractDrawer } from "./MedicalRecordExtractDrawer";
import type { RemdDocumentRecord } from "./egiszJournalData";
import { generateFnsTaxCertificatePrintHtml, generateMedicalRecordExtractPrintHtml } from "./egiszRemdPrintTemplates";
import { SAMPLE_FNS_TAX_1151156_PRESET } from "./sampleFnsTaxPreset";
import type { FnsTaxPaymentItem } from "./cdaR2XmlBuilder";
import { formatKopecksToRubles } from "./cdaR2XmlBuilder";
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import "./egiszRemd.css";

export interface TaxDeductionCertificateDrawerProps {
	readonly patientName: string;
	readonly patientInn?: string;
	readonly payments?: readonly FnsTaxPaymentItem[];
	readonly defaultYear?: number;
	readonly onPrintCertificate?: (year: number) => void;
	readonly onExportPdf?: (year: number) => void;
}

export const TaxDeductionCertificateDrawer: React.FC<TaxDeductionCertificateDrawerProps> = ({
	patientName,
	patientInn = "",
	payments,
	defaultYear = 2026,
	onPrintCertificate,
}) => {
	const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
	const [relationshipCode, setRelationshipCode] = useState<string>("1");
	const [isFullModalOpen, setIsFullModalOpen] = useState(false);
	const years = [2026, 2025, 2024, 2023];

	const effectivePayments = payments ?? (isDemoShowcaseMode() ? SAMPLE_FNS_TAX_1151156_PRESET.payments : []);
	const totalKopecks = effectivePayments.reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code1Kopecks = effectivePayments.filter((p) => p.serviceCode === "1").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code2Kopecks = effectivePayments.filter((p) => p.serviceCode === "2").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);

	return (
		<div className="egisz-tax-drawer" data-testid="tax-deduction-drawer">
			<div className="egisz-tax-section">
				<label className="egisz-tax-label">Отчетный налоговый период</label>
				<div className="egisz-year-chips" role="radiogroup">
					{years.map((y) => (
						<button key={y} type="button" className={`egisz-year-chip ${selectedYear === y ? "active" : ""}`} onClick={() => setSelectedYear(y)}>
							{y} год
						</button>
					))}
				</div>
			</div>

			<div className="egisz-tax-summary-hero">
				<div className="egisz-tax-hero-label">Оплачено за медицинские услуги</div>
				<div className="egisz-tax-hero-amount" data-testid="tax-total-amount">{`${formatKopecksToRubles(totalKopecks)} ₽`}</div>
				<div className="egisz-tax-hero-sub">{`Обычное лечение (код 1): ${formatKopecksToRubles(code1Kopecks)} ₽ • Дорогостоящее (код 2): ${formatKopecksToRubles(code2Kopecks)} ₽`}</div>
			</div>

			<div className="egisz-tax-section">
				<label className="egisz-tax-label">Получатель вычета</label>
				<div className="egisz-rel-chips">
					{[{ code: "1", title: "Сам пациент" }, { code: "2", title: "Супруг(а)" }, { code: "3", title: "Родитель" }, { code: "4", title: "Ребенок" }].map((r) => (
						<button key={r.code} type="button" className={`egisz-rel-chip ${relationshipCode === r.code ? "active" : ""}`} onClick={() => setRelationshipCode(r.code)}>
							{r.title}
						</button>
					))}
				</div>
			</div>

			<div className="egisz-tax-patient-box">
				<div className="text-sm font-semibold">{patientName}</div>
				<div className="text-xs text-muted">ИНН: {patientInn || "не указан"} • Справка для налогового вычета (13% НДФЛ)</div>
			</div>

			<div className="egisz-tax-payments-list">
				<div className="text-xs font-bold text-muted uppercase">Подтвержденные оплаты ({effectivePayments.length})</div>
				{effectivePayments.length === 0 ? (
					<div className="text-xs text-muted py-2">Нет зарегистрированных оплат за выбранный период</div>
				) : (
					effectivePayments.map((p, idx) => (
						<div key={idx} className="egisz-tax-payment-item">
							<div>
								<div className="font-semibold text-xs">{p.serviceDescription}</div>
								<div className="text-xs text-muted">{typeof p.date === "string" ? p.date : p.date.toLocaleDateString("ru-RU")} • Код: {p.serviceCode}</div>
							</div>
							<div className="font-bold text-sm">{`${formatKopecksToRubles(p.amountKopecks)} ₽`}</div>
						</div>
					))
				)}
			</div>

			<div className="egisz-tax-footer-cta flex flex-col gap-2">
				<button
					type="button"
					onClick={() => onPrintCertificate?.(selectedYear)}
					className="egisz-btn egisz-btn-primary full-width egisz-primary-cta-btn"
					data-testid="print-fns-tax-btn"
					title="Печать бланка ФНС с QR-кодом"
					style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}
				>
					<CheckCircle2 size={16} />
					<span>Сформировать справку ФНС</span>
				</button>
				<button
					type="button"
					onClick={() => setIsFullModalOpen(true)}
					className="egisz-btn egisz-btn-secondary full-width"
					data-testid="open-full-tax-modal-btn"
					style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.8125rem" }}
				>
					<span>Открыть полную форму справки (КНД 1151156)</span>
				</button>
			</div>

			{isFullModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isFullModalOpen}
					onClose={() => setIsFullModalOpen(false)}
					patientName={patientName}
					payerInn={patientInn}
				/>
			)}
		</div>
	);
};

export type EgiszHubSection = "queue" | "tax_deduction" | "extracts";

export interface EgiszCertificatesHubModalProps {
	readonly isOpen?: boolean;
	readonly onClose: () => void;
	readonly initialSection?: EgiszHubSection;
	readonly patientName?: string;
	readonly patientInn?: string;
	readonly payments?: readonly FnsTaxPaymentItem[];
	readonly records?: readonly RemdDocumentRecord[];
	readonly onRetryRecord?: (record: RemdDocumentRecord) => void;
}

export const EgiszCertificatesHubModal: React.FC<EgiszCertificatesHubModalProps> = ({
	isOpen = true,
	onClose,
	initialSection = "queue",
	patientName = "Смирнова Елена Васильевна",
	patientInn = "",
	payments,
	records = [
		{ id: "remd-1", docTitle: "СЭМД 105: Протокол консультации", patientFullName: patientName, status: "accepted_by_egisz", createdAt: "2026-10-15T10:30:00Z" } as unknown as RemdDocumentRecord,
		{ id: "remd-2", docTitle: "СЭМД 303: Протокол операции", patientFullName: patientName, status: "sent", createdAt: "2026-10-15T11:45:00Z" } as unknown as RemdDocumentRecord,
	],
	onRetryRecord,
}) => {
	const [activeSection, setActiveSection] = useState<EgiszHubSection>(initialSection);
	if (!isOpen) return null;

	const effectivePayments = payments ?? (isDemoShowcaseMode() ? SAMPLE_FNS_TAX_1151156_PRESET.payments : []);

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
			payments: effectivePayments,
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
						<button type="button" role="tab" aria-selected={activeSection === "queue"} className={`egisz-hub-tab ${activeSection === "queue" ? "active" : ""}`} onClick={() => setActiveSection("queue")}>
							<Archive size={15} /> Фоновый журнал
						</button>
						<button type="button" role="tab" aria-selected={activeSection === "tax_deduction"} className={`egisz-hub-tab ${activeSection === "tax_deduction" ? "active" : ""}`} onClick={() => setActiveSection("tax_deduction")}>
							<Receipt size={15} /> Справка для налогового вычета
						</button>
						<button type="button" role="tab" aria-selected={activeSection === "extracts"} className={`egisz-hub-tab ${activeSection === "extracts" ? "active" : ""}`} onClick={() => setActiveSection("extracts")}>
							<FileText size={15} /> Выписки и справки
						</button>
					</div>
				</header>

				<div className="egisz-hub-body">
					{activeSection === "queue" && <EgiszBackgroundQueueTable records={records} onRetryRecord={onRetryRecord} />}
					{activeSection === "tax_deduction" && <TaxDeductionCertificateDrawer patientName={patientName} patientInn={patientInn} payments={effectivePayments} onPrintCertificate={handlePrintFns} />}
					{activeSection === "extracts" && <MedicalRecordExtractDrawer patientName={patientName} onPrintExtract={(p) => openPrint(generateMedicalRecordExtractPrintHtml(p))} />}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};
