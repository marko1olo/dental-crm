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

import type React from "react";
import {
	AlertTriangle,
	Award,
	Building2,
	CheckCircle2,
	Clock,
	CreditCard,
	DollarSign,
	Download,
	ExternalLink,
	Eye,
	FileCheck,
	FileText,
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
							Справка об оплате медицинских услуг за {selectedTaxYear} год (КНД 1151156)
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
					<DollarSign size={18} />
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
								<span>Скачать справку КНД 1151156 (1 клик)</span>
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
						<span>Информированные согласия (ИДС 323-ФЗ & 152-ФЗ)</span>
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
										{consent.pdfDownloadUrl && (
											<a
												href={consent.pdfDownloadUrl}
												target="_blank"
												rel="noreferrer"
												className="pc-btn-secondary pc-btn-compact"
											>
												<Download size={13} />
												<span>PDF</span>
											</a>
										)}
									</div>
								)}

								{/* Если ожидает: 1-клик SMS/ПЭП подписание */}
								{!isSigned && (
									<div className="pc-consent-actions-row">
										<button
											type="button"
											className="pc-btn-primary pc-sign-btn"
											onClick={() => onStartConsentSigning(consent)}
											data-testid={`sign-sms-btn-${consent.id}`}
										>
											<Smartphone size={16} />
											<span>Подписать по SMS (63-ФЗ ПЭП)</span>
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</section>

			{/* 3. ЭЛЕКТРОННЫЕ РЕЦЕПТЫ НА ЛЕКАРСТВА (ФОРМА 107-1/У, ПРИКАЗ 1094Н) */}
			<section className="pc-section-card">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<FileText size={20} className="pc-icon-primary" />
						<span>Электронные рецепты (Приказ Минздрава № 1094н, форма 107-1/у)</span>
					</div>
					<span className="pc-section-hint">Для предъявления в аптеках РФ</span>
				</div>

				<div className="pc-prescriptions-list">
					<div className="pc-prescription-item">
						<div>
							<div className="pc-rx-title-line">
								<strong>Амоксициллин 500 мг (капсулы №20)</strong>
								<span className="pc-status-badge paid">
									<CheckCircle2 size={12} />
									<span>Действителен (60 дней)</span>
								</span>
							</div>
							<p className="pc-rx-instruction">
								Rp.: Amoxicillini 500 mg &bull; Внутрь по 1 капсуле 3 раза в день через
								8 ч, курс 5–7 дней
							</p>
						</div>

						<button
							type="button"
							className="pc-btn-primary pc-rx-download-btn"
							onClick={() => {
								const printWindow = window.open(
									"",
									"_blank",
									"width=800,height=900",
								);
								if (printWindow) {
									printWindow.document.open();
									printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Рецептурный бланк 107-1/у — Амоксициллин</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;padding:35px;color:#111}.hdr{border-bottom:2px solid #333;padding-bottom:10px;text-align:center}.box{border:1px solid #ccc;border-radius:8px;padding:15px;margin:20px 0;background:#fafafa}.stmp{margin-top:35px;display:flex;justify-content:space-between;border-top:1px dashed #999;padding-top:10px}</style></head>
<body><div class="hdr"><h3>МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РФ</h3><p>Форма № 107-1/у (Приказ Минздрава России № 1094н)</p></div>
<p><strong>Пациент:</strong> ${data.fullName}</p>
<div class="box"><p><strong>Rp.:</strong> Amoxicillini 500 mg (капсулы №20)</p><p>Внутрь по 1 капсуле 3 раза в день через 8 ч, курс 5–7 дней</p><p><strong>Срок действия:</strong> 60 дней</p></div>
<div class="stmp"><div>Подпись и личная печать врача: ____________________</div><div>М.П. Клиники</div></div></body></html>`);
									printWindow.document.close();
									printWindow.focus();
									setTimeout(() => printWindow.print(), 250);
									onShowToast(
										"Рецептурный бланк 107-1/у (Амоксициллин 500 мг) готов к печати!",
									);
								} else {
									onShowToast(
										"Разрешите всплывающие окна для печати рецепта 107-1/у",
									);
								}
							}}
						>
							<Download size={15} />
							<span>Скачать рецепт (PDF)</span>
						</button>
					</div>

					<div className="pc-prescription-item">
						<div>
							<div className="pc-rx-title-line">
								<strong>Ибупрофен 400 мг (таблетки №20)</strong>
								<span className="pc-status-badge paid">
									<CheckCircle2 size={12} />
									<span>Действителен (60 дней)</span>
								</span>
							</div>
							<p className="pc-rx-instruction">
								Rp.: Ibuprofeni 400 mg &bull; При зубной боли по 1 таб. после еды
								(макс. 3 таб./сутки)
							</p>
						</div>

						<button
							type="button"
							className="pc-btn-primary pc-rx-download-btn"
							onClick={() => {
								const printWindow = window.open(
									"",
									"_blank",
									"width=800,height=900",
								);
								if (printWindow) {
									printWindow.document.open();
									printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Рецептурный бланк 107-1/у — Ибупрофен</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;padding:35px;color:#111}.hdr{border-bottom:2px solid #333;padding-bottom:10px;text-align:center}.box{border:1px solid #ccc;border-radius:8px;padding:15px;margin:20px 0;background:#fafafa}.stmp{margin-top:35px;display:flex;justify-content:space-between;border-top:1px dashed #999;padding-top:10px}</style></head>
<body><div class="hdr"><h3>МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РФ</h3><p>Форма № 107-1/у (Приказ Минздрава России № 1094н)</p></div>
<p><strong>Пациент:</strong> ${data.fullName}</p>
<div class="box"><p><strong>Rp.:</strong> Ibuprofeni 400 mg (таблетки №20)</p><p>При зубной боли по 1 таб. после еды (макс. 3 таб./сутки)</p><p><strong>Срок действия:</strong> 60 дней</p></div>
<div class="stmp"><div>Подпись и личная печать врача: ____________________</div><div>М.П. Клиники</div></div></body></html>`);
									printWindow.document.close();
									printWindow.focus();
									setTimeout(() => printWindow.print(), 250);
									onShowToast(
										"Рецептурный бланк 107-1/у (Ибупрофен 400 мг) готов к печати!",
									);
								} else {
									onShowToast(
										"Разрешите всплывающие окна для печати рецепта 107-1/у",
									);
								}
							}}
						>
							<Download size={15} />
							<span>Скачать рецепт (PDF)</span>
						</button>
					</div>
				</div>
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
