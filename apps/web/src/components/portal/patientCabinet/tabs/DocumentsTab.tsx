/**
 * DocumentsTab.tsx — Экран «Документы и Налоговый вычет 13%» личного кабинета пациента (PWA / Mobile 390px)
 * (DOMAIN: PORTAL PATIENT CABINET - TAB 4: DOCUMENTS & 13% TAX DEDUCTION)
 *
 * Соответствие:
 * - Интерактивный калькулятор вычета по форме КНД 1151156 (расчет 13% от оплаченного).
 * - 1-клик заказ/скачивание официальной справки для ФНС с синей печатью клиники.
 * - Список подписанных согласий (ИДС 323-ФЗ, 152-ФЗ) со штампом ПЭП 63-ФЗ.
 * - Электронные рецепты (форма № 107-1/у, Приказ № 1094н).
 * - Гарантийные сертификаты СтАР.
 */

import React from "react";
import {
	AlertTriangle,
	Award,
	Building2,
	CheckCircle2,
	Clock,
	CreditCard,
	Download,
	ExternalLink,
	Eye,
	FileCheck,
	FileText,
	Pill,
	Printer,
	ReceiptText,
	ShieldCheck,
	Smartphone,
} from "lucide-react";
import type {
	PatientPersonalCabinetData,
	PatientStatutoryConsent,
	PatientTaxDeductionCalculation,
} from "../patientCabinetEngine";
import {
	calculateCheckupDaysRemaining,
	calculateWarrantyValidity,
	formatRussianDateIso,
	formatRubles,
	generateConsentPrintHtml,
	generateDocumentSnapshotHtml,
	generateExtract043Html,
	generatePatientTaxCertificate1151156,
	generatePrescription107PrintHtml,
	openPrintWindow,
} from "../patientCabinetEngine";

export interface DocumentsTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly selectedTaxYear: number;
	readonly onSelectTaxYear: (year: number) => void;
	readonly taxDeductionCalc: PatientTaxDeductionCalculation;
	readonly onStartConsentSigning: (consent: PatientStatutoryConsent) => void;
	readonly onOpenTaxCertificateSheet: () => void;
	readonly onDownloadTaxCertificateDirect: () => void;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
	data,
	selectedTaxYear,
	onSelectTaxYear,
	taxDeductionCalc,
	onStartConsentSigning,
	onOpenTaxCertificateSheet,
	onDownloadTaxCertificateDirect,
	onShowToast,
}) => {
	return (
		<div className="pc-tab-content-container" data-testid="pc-documents-tab">
			{/* 1. ИНТЕРАКТИВНЫЙ КАЛЬКУЛЯТОР ВЫЧЕТА 13% (ФНС КНД 1151156) */}
			<section
				className="pc-tax-deduction-widget"
				data-testid="documents-tax-deduction-widget"
			>
				<div className="pc-tax-header">
					<div>
						<h3 className="pc-tax-main-title">
							Справка для налогового вычета (13% НДФЛ) за {selectedTaxYear} год
						</h3>
						<p className="pc-tax-subtitle">
							Включает все фискальные чеки клиники для представления в налоговые органы
						</p>
					</div>

					<div className="pc-tax-year-selector" role="group" aria-label="Выбор года">
						{[2026, 2025, 2024].map((year) => (
							<button
								key={year}
								type="button"
								className={`pc-year-btn ${selectedTaxYear === year ? "active" : ""}`}
								onClick={() => onSelectTaxYear(year)}
							>
								{year}
							</button>
						))}
					</div>
				</div>

				{/* Баннер суммы возврата */}
				<div className="pc-tax-banner-pill" data-testid="tax-refund-header-banner">
					<ReceiptText size={18} />
					<span>{taxDeductionCalc.headerBannerTextRu}</span>
				</div>

				{/* Сетка расчетных показателей (Код 01, Код 02, ИТОГО) */}
				<div className="pc-tax-calc-grid">
					{/* Обычное лечение (Код 01) */}
					<div className="pc-tax-stat-box">
						<span className="pc-tax-stat-label">Обычное лечение (Код 01)</span>
						<span className="pc-tax-stat-value">
							{formatRubles(taxDeductionCalc.code01SpentRub)}
						</span>
						<span className="pc-tax-stat-refund">
							<CheckCircle2 size={15} />
							<span>Возврат 13%: {formatRubles(taxDeductionCalc.code01RefundRub)}</span>
						</span>
						<span className="pc-tax-stat-note">
							{taxDeductionCalc.isCode01Capped
								? "Достигнут лимит 150 000 ₽ / год (макс. 19 500 ₽)"
								: "Лимит до 150 000 ₽ / год (макс. 19 500 ₽)"}
						</span>
					</div>

					{/* Дорогостоящее лечение (Код 02) */}
					<div className="pc-tax-stat-box">
						<span className="pc-tax-stat-label">Имплантация & Хирургия (Код 02)</span>
						<span className="pc-tax-stat-value">
							{formatRubles(taxDeductionCalc.code02SpentRub)}
						</span>
						<span className="pc-tax-stat-refund">
							<CheckCircle2 size={15} />
							<span>Возврат 13%: {formatRubles(taxDeductionCalc.code02RefundRub)}</span>
						</span>
						<span className="pc-tax-stat-note highlight-green">
							Без ограничений по сумме (13% от всех затрат)
						</span>
					</div>

					{/* Итого на карту + 1-клик заказ */}
					<div className="pc-tax-stat-box highlight">
						<span className="pc-tax-stat-label">ИТОГО ВЫПЛАТА НА КАРТУ</span>
						<span className="pc-tax-stat-value grand-total">
							{formatRubles(taxDeductionCalc.totalRefundRub)}
						</span>
						<div className="pc-tax-cta-row">
							<button
								type="button"
								className="pc-btn-primary pc-tax-download-btn"
								data-testid="order-tax-certificate-doc-btn"
								onClick={onDownloadTaxCertificateDirect}
							>
								<Download size={15} />
								<span>Скачать справку для вычета</span>
							</button>

							<button
								type="button"
								className="pc-btn-secondary pc-tax-print-btn"
								data-testid="print-tax-deduction-btn"
								onClick={() => {
									openPrintWindow(
										generatePatientTaxCertificate1151156(data, selectedTaxYear),
									);
									onShowToast(
										`Справка для налогового вычета (ФНС) за ${selectedTaxYear} год готова к печати!`,
									);
								}}
							>
								<Printer size={15} />
								<span>Справка для налогового вычета (ФНС)</span>
							</button>

							<button
								type="button"
								className="pc-btn-secondary pc-tax-view-btn"
								data-testid="print-tax-knd-btn"
								onClick={onOpenTaxCertificateSheet}
							>
								<Eye size={15} />
								<span>Предпросмотр с печатью</span>
							</button>
						</div>
					</div>
				</div>

				{/* 3 шага подачи в ФНС */}
				<div className="pc-tax-guide-section">
					<strong className="pc-tax-guide-heading">
						Как получить возврат 13% от государства:
					</strong>
					<div className="pc-tax-steps-grid">
						{taxDeductionCalc.guideSteps.map((step) => {
							const StepVectorIcon =
								step.icon === "Building2"
									? Building2
									: step.icon === "CreditCard"
										? CreditCard
										: FileText;

							return (
								<div
									key={step.stepNumber}
									className="pc-tax-step-card"
									data-testid={`tax-step-${step.stepNumber}`}
								>
									<div className="pc-tax-step-title">
										<span className="pc-step-icon-wrapper">
											<StepVectorIcon size={18} />
										</span>
										<span>{step.titleRu}</span>
									</div>
									<p className="pc-tax-step-desc">{step.descriptionRu}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* 2. ИНФОРМИРОВАННЫЕ ДОБРОВОЛЬНЫЕ СОГЛАСИЯ (ИДС 323-ФЗ) */}
			<section className="pc-section-card">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<FileCheck size={20} className="pc-icon-primary" />
						<span>Информированные согласия (ИДС)</span>
					</div>
					<span className="pc-section-hint">Юридическая сила по 63-ФЗ ст. 6</span>
				</div>

				<div className="pc-consents-list">
					{data.consents.map((consent) => {
						const isSigned = consent.status === "signed";

						return (
							<div
								key={consent.id}
								className={`pc-consent-card ${isSigned ? "signed" : "pending"}`}
								data-testid={`consent-card-${consent.id}`}
							>
								<div className="pc-consent-head">
									<div>
										<div className="pc-consent-code-row">
											<span className="pc-consent-code-badge">
												{consent.code}
											</span>
											<strong className="pc-consent-title">
												{consent.titleRu}
											</strong>
										</div>
										<p className="pc-consent-summary">
											{consent.summaryTextRu}
										</p>
									</div>

									<div>
										<span
											className={`pc-status-badge ${isSigned ? "paid" : "unpaid"}`}
										>
											{isSigned ? (
												<ShieldCheck size={14} />
											) : (
												<AlertTriangle size={14} />
											)}
											<span>
												{isSigned ? "Подписано по 63-ФЗ" : "Ожидает подписи"}
											</span>
										</span>
									</div>
								</div>

								{/* Если подписано: криптографический аудит-хеш */}
								{isSigned && consent.signatureAudit && (
									<div className="pc-audit-hash-badge">
										<span className="pc-hash-text">
											Криптографический хеш ПЭП (SHA-256):{" "}
											<code>{consent.signatureAudit.integrityHash}</code>
										</span>
										<button
											type="button"
											className="pc-btn-secondary pc-btn-compact"
											data-testid={`print-signed-consent-btn-${consent.id}`}
											data-legacy-testid={`view-consent-btn-${consent.id}`}
											onClick={() => {
												openPrintWindow(generateConsentPrintHtml(consent, data));
												onShowToast(`Печатная форма согласия «${consent.titleRu}» готова!`);
											}}
										>
											<Eye size={13} />
											<span>Бланк со штампом ПЭП</span>
										</button>
									</div>
								)}

								{/* Если ожидает: 1-клик SMS/ПЭП подписание + просмотр бланка */}
								{!isSigned && (
									<div className="pc-consent-actions-row">
										<button
											type="button"
											className="pc-btn-primary pc-sign-btn"
											onClick={() => onStartConsentSigning(consent)}
											data-testid={`sign-consent-btn-${consent.id}`}
											data-legacy-testid={`sign-sms-btn-${consent.id}`}
										>
											<Smartphone size={16} />
											<span>Подписать по SMS (63-ФЗ ПЭП)</span>
										</button>
										<button
											type="button"
											className="pc-btn-secondary pc-btn-compact"
											data-testid={`preview-consent-btn-${consent.id}`}
											onClick={() => {
												openPrintWindow(generateConsentPrintHtml(consent, data));
											}}
										>
											<Eye size={13} />
											<span>Печатный бланк</span>
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</section>

			{/* 3. ОФИЦИАЛЬНЫЕ МЕДИЦИНСКИЕ ДОКУМЕНТЫ (Договоры, Акты, Форма 043/у) */}
			<section className="pc-section-card" data-testid="clinical-documents-section">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<FileCheck size={20} className="pc-icon-primary" />
						<span>Официальные медицинские документы и договоры</span>
					</div>
					<span className="pc-section-hint">Юридически значимые документы клиники</span>
				</div>

				{(!data.documents || data.documents.length === 0) ? (
					<div className="pc-empty-state" data-testid="clinical-documents-empty">
						<FileText size={32} className="pc-icon-muted" />
						<p className="pc-empty-title">Официальные документы формируются в клинике</p>
						<p className="pc-empty-desc">
							Договоры на оказание платных медицинских услуг, акты сдачи-приемки и медицинские выписки отобразятся здесь сразу после выдачи врачом.
						</p>
					</div>
				) : (
					<div className="pc-clinical-docs-list" data-testid="clinical-documents-list">
						{data.documents.map((doc) => {
							const isIssued = doc.status === "issued";
							const kindLabel =
								doc.kind === "paid_medical_services_contract"
									? "Договор"
									: doc.kind === "completed_works_act"
										? "Акт оказанных услуг"
										: doc.kind.includes("043") || doc.kind === "outpatient_medical_card_025u"
											? "Медицинская выписка"
											: doc.kind === "tax_deduction_certificate"
												? "ФНС"
												: "Документ";

							return (
								<div
									key={doc.id}
									className={`pc-consent-card ${isIssued ? "signed" : "pending"}`}
									data-testid={`clinical-doc-${doc.id}`}
								>
									<div className="pc-consent-head">
										<div>
											<div className="pc-consent-code-row">
												<span className="pc-consent-code-badge">{kindLabel}</span>
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
											<span className="pc-hash-text">
												Цифровой отпечаток архива (SHA-256): <code>{doc.sha256}</code>
											</span>
										</div>
									)}

									<div className="pc-consent-actions-row">
										{(doc.kind === "medical_card_extract_043" || doc.kind.includes("043")) && (
											<button
												type="button"
												className="pc-btn-primary pc-btn-compact pc-extract-print-btn"
												data-testid="print-extract-043-btn"
												onClick={() => {
													openPrintWindow(generateExtract043Html(doc, data));
													onShowToast(
														`Медицинская выписка готова к печати!`,
													);
												}}
											>
												<Printer size={14} />
												<span>Печать выписки из медкарты</span>
											</button>
										)}

										<button
											type="button"
											className="pc-btn-secondary pc-btn-compact"
											data-testid={`view-doc-btn-${doc.id}`}
											onClick={() => {
												openPrintWindow(generateDocumentSnapshotHtml(doc, data));
												onShowToast(`Документ «${doc.title}» готов к просмотру`);
											}}
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

			{/* 4. ЭЛЕКТРОННЫЕ РЕЦЕПТЫ НА ЛЕКАРСТВА (ФОРМА 107-1/У, ПРИКАЗ 1094Н) */}
			<section className="pc-section-card" data-testid="prescriptions-section">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<Pill size={20} className="pc-icon-primary" />
						<span>Электронные рецепты на лекарственные препараты</span>
					</div>
					<span className="pc-section-hint">Для предъявления в аптеках РФ</span>
				</div>

				{(!data.prescriptions || data.prescriptions.length === 0) ? (
					<div className="pc-empty-state" data-testid="prescriptions-empty-state">
						<Pill size={32} className="pc-icon-muted" />
						<p className="pc-empty-title">Назначений лекарственных препаратов нет</p>
						<p className="pc-empty-desc">
							Лечащий врач не назначал рецептурных медикаментов. При необходимости назначенные врачом электронные рецепты отобразятся здесь.
						</p>
					</div>
				) : (
					<div className="pc-prescriptions-list" data-testid="prescriptions-list">
						{data.prescriptions.map((rx) => (
							<div key={rx.id} className="pc-prescription-item" data-testid={`rx-item-${rx.id}`}>
								<div>
									<div className="pc-rx-title-line">
										<strong>{rx.medicationName} {rx.dosageRu}</strong>
										<span className="pc-status-badge paid">
											<CheckCircle2 size={12} />
											<span>{rx.validityDays ? `Действителен (${rx.validityDays} дн.)` : "Действителен"}</span>
										</span>
									</div>
									<p className="pc-rx-instruction">
										{rx.instructionRu} &bull; Курс: {rx.durationRu}
									</p>
								</div>

								<button
									type="button"
									className="pc-btn-primary pc-rx-download-btn"
									data-testid={`print-prescription-btn-${rx.id}`}
									onClick={() => {
										openPrintWindow(generatePrescription107PrintHtml(rx, data));
										onShowToast(`Рецептурный бланк 107-1/у (${rx.medicationName}) готов к печати!`);
									}}
								>
									<Printer size={15} />
									<span>Печать рецепта (107-1/у)</span>
								</button>
							</div>
						))}
					</div>
				)}
			</section>

			{/* 4. ГАРАНТИЙНЫЕ ПАСПОРТА СЕРТИФИКАЦИИ СТАР */}
			{data.warranties.length > 0 && (
				<section className="pc-section-card">
					<div className="pc-card-header">
						<div className="pc-card-title">
							<Award size={20} className="pc-icon-primary" />
							<span>Электронные гарантийные паспорта DENTE</span>
						</div>
						<span className="pc-section-hint">Положение СтАР • Закон РФ № 2300-1</span>
					</div>

					<div className="pc-warranties-list">
						{data.warranties.map((war) => {
							const checkupCalc = calculateCheckupDaysRemaining(
								war.nextCheckupDueDateIso,
							);
							const validityCalc = calculateWarrantyValidity(
								war.expirationDateIso,
							);

							return (
								<div key={war.certificateId} className="pc-warranty-card">
									<div className="pc-warranty-head">
										<div>
											<div className="pc-warranty-title-line">
												<strong>Сертификат № {war.certificateId}</strong>
												<span
													className={`pc-warranty-countdown-badge ${checkupCalc.isOverdue ? "overdue" : checkupCalc.isUrgent ? "urgent" : "normal"}`}
												>
													<Clock size={12} />
													<span>Чекап: {checkupCalc.labelRu}</span>
												</span>
											</div>
											<p className="pc-warranty-meta">
												Выдан: {formatRussianDateIso(war.issueDateIso)} &bull; Врач:{" "}
												{war.doctorName} &bull; {validityCalc.labelRu}
											</p>
										</div>

										<a
											href={war.verificationUrl}
											target="_blank"
											rel="noreferrer"
											className="pc-btn-secondary pc-btn-compact"
										>
											<ExternalLink size={14} />
											<span>Проверить онлайн</span>
										</a>
									</div>

									<div className="pc-warranty-items-box">
										{war.items.map((item, idx) => (
											<div key={idx} className="pc-warranty-item-row">
												<div>
													<strong>Зуб #{item.toothFdi}</strong>: {item.workTitleRu} (
													{item.materialName})
												</div>
												{item.lotNumber && (
													<span className="pc-lot-number">{item.lotNumber}</span>
												)}
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}
		</div>
	);
};

export default DocumentsTab;
