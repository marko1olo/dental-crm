/**
 * DENTE Dental CRM — TaxCertificateModal.tsx (КНД 1151156 / Приказ ФНС № ЕА-7-11/824@).
 *
 * Dedicated modal for creating, reviewing, and printing statutory Tax Deduction Certificates (KND 1151156).
 * Features:
 * - Real calendar year payment aggregation with exact integer kopecks.
 * - Service category separation: Code 1 (Standard) vs Code 2 (Expensive per Decree No. 458).
 * - Real-time INN validation via canonical GOST/FNS weighted check-digit algorithm.
 * - Support for relative payers (spouse, parent, child) with passport details.
 * - 1-Click Print producing official KND 1151156 document with barcode and QR.
 * - Zero cartoon emojis, strict design system tokens (var(--paper), var(--ink), var(--line)).
 */

import React, { useState, useMemo } from "react";
import type { Patient } from "@dental/shared";
import {
	X,
	Printer,
	CheckCircle2,
	AlertCircle,
	FileText,
	Building2,
	User,
	Coins,
} from "lucide-react";
import {
	aggregatePatientPaymentsForTaxYear,
	generateTaxCertificateKnd1151156Html,
	printTaxCertificateHtml,
	validateRussianInn,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxPaymentRecord,
	type TaxDeductionRelationship,
	type TaxCertificateClinicInfo,
	type TaxCertificatePartyInfo,
} from "./taxCertificateEngine";
import { formatRublesExactRu } from "./documentPrintFormatters";

export interface TaxCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly payments?: readonly TaxPaymentRecord[];
	readonly clinic?: {
		legalName?: string | null | undefined;
		clinicName?: string | null | undefined;
		fullName?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		ogrn?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		licenseDate?: string | null | undefined;
		chiefDoctorName?: string | null | undefined;
		directorFullName?: string | null | undefined;
	} | null | undefined;
	readonly defaultTaxYear?: number | undefined;
}

export function TaxCertificateModal({
	isOpen,
	onClose,
	patient,
	payments = [],
	clinic,
	defaultTaxYear,
}: TaxCertificateModalProps): React.JSX.Element | null {
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(() => defaultTaxYear || currentYear);
	const [relationship, setRelationship] = useState<TaxDeductionRelationship>("patient");

	// Taxpayer state
	const [taxpayerFullName, setTaxpayerFullName] = useState<string>(patient?.fullName || "");
	const [taxpayerInn, setTaxpayerInn] = useState<string>("");
	const [taxpayerBirthDate, setTaxpayerBirthDate] = useState<string>(patient?.birthDate || "");
	const [taxpayerPassportSeries, setTaxpayerPassportSeries] = useState<string>("");
	const [taxpayerPassportNumber, setTaxpayerPassportNumber] = useState<string>("");
	const [taxpayerPassportIssuedBy, setTaxpayerPassportIssuedBy] = useState<string>("");
	const [taxpayerPassportIssuedDate, setTaxpayerPassportIssuedDate] = useState<string>("");

	// Sync when patient changes or relationship switches back to patient
	React.useEffect(() => {
		if (relationship === "patient" && patient) {
			setTaxpayerFullName(patient.fullName || "");
			setTaxpayerBirthDate(patient.birthDate || "");
		}
	}, [relationship, patient]);

	// Year aggregation
	const aggregation = useMemo(() => {
		return aggregatePatientPaymentsForTaxYear(payments, selectedYear);
	}, [payments, selectedYear]);

	// INN validation
	const innValidation = useMemo(() => {
		const trimmed = taxpayerInn.trim();
		if (!trimmed) {
			return { isValid: true, isFilled: false, message: "ИНН не указан (будет идентифицирован по документу)" };
		}
		const res = validateRussianInn(trimmed);
		return {
			isValid: res.isValid,
			isFilled: true,
			message: res.isValid ? "ИНН корректен (контрольная сумма совпадает)" : res.errorMessageRu || "Неверный ИНН",
		};
	}, [taxpayerInn]);

	if (!isOpen) return null;

	const clinicInfo: TaxCertificateClinicInfo = {
		legalName: clinic?.legalName || clinic?.fullName || clinic?.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		inn: clinic?.inn || "7701987654",
		kpp: clinic?.kpp || "770101001",
		ogrn: clinic?.ogrn || "1217700123456",
		address: clinic?.actualAddress || clinic?.address || "г. Москва, ул. Стоматологическая, д. 10",
		licenseNumber: clinic?.licenseNumber || "ЛО41-01137-77/00584930",
		licenseDate: clinic?.licenseDate || "15.08.2022",
		chiefDoctorOrDirector: clinic?.chiefDoctorName || clinic?.directorFullName || "Смирнов А.В.",
	};

	const taxpayerInfo: TaxCertificatePartyInfo = {
		fullName: taxpayerFullName || patient?.fullName || "________________________________________",
		birthDate: taxpayerBirthDate || undefined,
		inn: taxpayerInn.trim() || undefined,
		passportSeries: taxpayerPassportSeries.trim() || undefined,
		passportNumber: taxpayerPassportNumber.trim() || undefined,
		passportIssuedBy: taxpayerPassportIssuedBy.trim() || undefined,
		passportIssuedDate: taxpayerPassportIssuedDate.trim() || undefined,
		relationship,
	};

	const patientInfo: TaxCertificatePartyInfo = {
		fullName: patient?.fullName || "________________________________________",
		birthDate: patient?.birthDate || undefined,
		passportSeries: taxpayerPassportSeries.trim() || undefined,
		passportNumber: taxpayerPassportNumber.trim() || undefined,
	};

	const handlePrint = () => {
		const patientCode = patient?.id ? patient.id.slice(0, 6).toUpperCase() : "001";
		const html = generateTaxCertificateKnd1151156Html({
			certificateNumber: `СПР-${selectedYear}-${patientCode}`,
			issueDateIso: new Date().toISOString(),
			taxYear: selectedYear,
			clinic: clinicInfo,
			taxpayer: taxpayerInfo,
			patient: patientInfo,
			aggregation,
		});
		printTaxCertificateHtml(html);
	};

	const isSamePerson = relationship === "patient";

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tax-cert-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-content" style={{ maxWidth: "860px" }}>
				{/* Modal Header */}
				<div className="document-package-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								background: "var(--brand-100, #ccfbf1)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--brand-700, #0d9488)",
							}}
						>
							<FileText size={20} aria-hidden="true" />
						</div>
						<div>
							<h3 className="document-package-modal-title" id="tax-cert-modal-title" style={{ margin: 0 }}>
								Справка для налогового вычета (КНД 1151156)
							</h3>
							<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ · ст. 219 НК РФ
							</span>
						</div>
					</div>
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
						style={{ padding: "6px" }}
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="document-package-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					{/* Top Parameters Grid: Year & Kinship */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
							gap: "12px",
							padding: "14px",
							background: "var(--surface-100, #f8fafc)",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
							<span>Налоговый год</span>
							<select
								value={selectedYear}
								onChange={(e) => setSelectedYear(Number(e.target.value))}
								style={{
									padding: "7px 10px",
									borderRadius: "6px",
									border: "1px solid var(--line, #cbd5e1)",
									background: "var(--paper, #ffffff)",
									color: "var(--ink, #0f172a)",
								}}
							>
								<option value={2026}>2026 год (вычет 13% НДФЛ)</option>
								<option value={2025}>2025 год (вычет 13% НДФЛ)</option>
								<option value={2024}>2024 год (вычет 13% НДФЛ, лимит 150 000 ₽)</option>
								<option value={2023}>2023 год (архивный период, лимит 120 000 ₽)</option>
								<option value={2022}>2022 год (архивный период, лимит 120 000 ₽)</option>
								<option value={2021}>2021 год (архивный период, лимит 120 000 ₽)</option>
							</select>
						</label>

						<label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600 }}>
							<span>Получатель вычета (Налогоплательщик)</span>
							<select
								value={relationship}
								onChange={(e) => setRelationship(e.target.value as TaxDeductionRelationship)}
								style={{
									padding: "7px 10px",
									borderRadius: "6px",
									border: "1px solid var(--line, #cbd5e1)",
									background: "var(--paper, #ffffff)",
									color: "var(--ink, #0f172a)",
								}}
							>
								{Object.entries(TAX_DEDUCTION_RELATIONSHIP_MAP).map(([key, item]) => (
									<option key={key} value={key}>
										Код {item.code}: {item.labelRu}
									</option>
								))}
							</select>
						</label>
					</div>

					{/* Taxpayer Details Form */}
					<div
						style={{
							padding: "14px",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #ffffff)",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "6px" }}>
							<User size={16} color="var(--brand-700, #0d9488)" aria-hidden="true" />
							<strong style={{ fontSize: "13px" }}>
								{isSamePerson ? "Данные пациента (он же налогоплательщик)" : "Данные налогоплательщика (плательщика)"}
							</strong>
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
							<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
								ФИО налогоплательщика
								<input
									type="text"
									value={taxpayerFullName}
									onChange={(e) => setTaxpayerFullName(e.target.value)}
									placeholder="Фамилия Имя Отчество"
									style={{
										padding: "6px 9px",
										borderRadius: "6px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #ffffff)",
										color: "var(--ink, #0f172a)",
									}}
								/>
							</label>

							<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
								<span>ИНН налогоплательщика (12 цифр)</span>
								<input
									type="text"
									value={taxpayerInn}
									onChange={(e) => setTaxpayerInn(e.target.value)}
									placeholder="12-значный ИНН"
									maxLength={12}
									style={{
										padding: "6px 9px",
										borderRadius: "6px",
										border: `1px solid ${
											innValidation.isFilled
												? innValidation.isValid
													? "var(--success-line, #10b981)"
													: "var(--danger-line, #ef4444)"
												: "var(--line, #cbd5e1)"
										}`,
										background: "var(--paper, #ffffff)",
										color: "var(--ink, #0f172a)",
									}}
								/>
								<span
									style={{
										fontSize: "10px",
										color: innValidation.isFilled
											? innValidation.isValid
												? "var(--success-fg, #10b981)"
												: "var(--danger-fg, #ef4444)"
											: "var(--muted, #64748b)",
									}}
								>
									{innValidation.message}
								</span>
							</label>

							{!isSamePerson && (
								<>
									<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
										Серия и номер паспорта плательщика
										<div style={{ display: "flex", gap: "6px" }}>
											<input
												type="text"
												value={taxpayerPassportSeries}
												onChange={(e) => setTaxpayerPassportSeries(e.target.value)}
												placeholder="Серия (4 ц.)"
												maxLength={4}
												style={{
													width: "90px",
													padding: "6px 8px",
													borderRadius: "6px",
													border: "1px solid var(--line, #cbd5e1)",
												}}
											/>
											<input
												type="text"
												value={taxpayerPassportNumber}
												onChange={(e) => setTaxpayerPassportNumber(e.target.value)}
												placeholder="Номер (6 ц.)"
												maxLength={6}
												style={{
													flex: 1,
													padding: "6px 8px",
													borderRadius: "6px",
													border: "1px solid var(--line, #cbd5e1)",
												}}
											/>
										</div>
									</label>

									<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600 }}>
										Кем выдан паспорт
										<input
											type="text"
											value={taxpayerPassportIssuedBy}
											onChange={(e) => setTaxpayerPassportIssuedBy(e.target.value)}
											placeholder="Отделением МВД..."
											style={{
												padding: "6px 8px",
												borderRadius: "6px",
												border: "1px solid var(--line, #cbd5e1)",
											}}
										/>
									</label>
								</>
							)}
						</div>
					</div>

					{/* Financial Aggregation Summary Cards */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "10px",
						}}
					>
						<div
							style={{
								padding: "12px",
								background: "var(--surface-100, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600 }}>
								Код 1: Обычное лечение
							</div>
							<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink, #0f172a)", marginTop: "4px" }}>
								{formatRublesExactRu(aggregation.code01Rub)}
							</div>
							<div style={{ fontSize: "10px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
								Лимит ст. 219 НК: {formatRublesExactRu(aggregation.eligibleCode01Rub)}
							</div>
						</div>

						<div
							style={{
								padding: "12px",
								background: "var(--brand-50, #f0fdfa)",
								border: "1px solid var(--brand-200, #99f6e4)",
								borderRadius: "8px",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--brand-800, #115e59)", fontWeight: 600 }}>
								Код 2: Дорогостоящее (ПП № 458)
							</div>
							<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--brand-900, #134e4a)", marginTop: "4px" }}>
								{formatRublesExactRu(aggregation.code02Rub)}
							</div>
							<div style={{ fontSize: "10px", color: "var(--brand-700, #0f766e)", marginTop: "2px" }}>
								Имплантация, костная пластика (без лимита)
							</div>
						</div>

						<div
							style={{
								padding: "12px",
								background: "var(--surface-100, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600 }}>
								Итого оплачено ({selectedYear} г.)
							</div>
							<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink, #0f172a)", marginTop: "4px" }}>
								{formatRublesExactRu(aggregation.totalNetRub)}
							</div>
							<div style={{ fontSize: "10px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
								Чеков: {aggregation.receiptsCount}
							</div>
						</div>

						<div
							style={{
								padding: "12px",
								background: "var(--success-bg, #f0fdf4)",
								border: "1px solid var(--success-line, #86efac)",
								borderRadius: "8px",
							}}
						>
							<div style={{ fontSize: "11px", color: "var(--success-fg, #15803d)", fontWeight: 600 }}>
								Расчетный вычет (13% НДФЛ)
							</div>
							<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--success-fg, #15803d)", marginTop: "4px" }}>
								{formatRublesExactRu(aggregation.estimatedRefund13Rub)}
							</div>
							<div style={{ fontSize: "10px", color: "var(--success-fg, #15803d)", marginTop: "2px" }}>
								К возврату из бюджета РФ
							</div>
						</div>
					</div>

					{/* Payments List */}
					<div
						style={{
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "8px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								padding: "8px 12px",
								background: "var(--surface-100, #f8fafc)",
								borderBottom: "1px solid var(--line, #e2e8f0)",
								fontSize: "12px",
								fontWeight: 700,
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span>Фискализированные платежи за {selectedYear} год</span>
							<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 400 }}>
								Всего: {aggregation.payments.length} позиций
							</span>
						</div>

						{aggregation.payments.length === 0 ? (
							<div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								За {selectedYear} год фискализированных оплат не найдено.
							</div>
						) : (
							<div style={{ maxHeight: "180px", overflowY: "auto" }}>
								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
									<thead>
										<tr style={{ background: "var(--surface-50, #f8fafc)", textAlign: "left", color: "var(--muted, #64748b)" }}>
											<th style={{ padding: "6px 10px" }}>Дата</th>
											<th style={{ padding: "6px 10px" }}>Услуга / Основание</th>
											<th style={{ padding: "6px 10px" }}>Код</th>
											<th style={{ padding: "6px 10px", textAlign: "right" }}>Сумма</th>
										</tr>
									</thead>
									<tbody>
										{aggregation.payments.map((p, idx) => {
											const code = p.taxCode || (p.code804n && p.code804n.startsWith("A16.07.054") ? "2" : "1");
											return (
												<tr key={p.id || idx} style={{ borderBottom: "1px solid var(--line, #f1f5f9)" }}>
													<td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
														{new Date(p.dateIso).toLocaleDateString("ru-RU")}
													</td>
													<td style={{ padding: "6px 10px" }}>
														{p.serviceName}
														{p.fiscalDocumentNumber ? ` (ФД № ${p.fiscalDocumentNumber})` : ""}
													</td>
													<td style={{ padding: "6px 10px" }}>
														<span
															style={{
																padding: "1px 6px",
																borderRadius: "4px",
																fontSize: "10px",
																fontWeight: 700,
																background: code === "2" ? "var(--brand-100, #ccfbf1)" : "var(--surface-200, #e2e8f0)",
																color: code === "2" ? "var(--brand-800, #115e59)" : "var(--ink, #0f172a)",
															}}
														>
															Код {code}
														</span>
													</td>
													<td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>
														{formatRublesExactRu(p.amountRub)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

				{/* Modal Footer */}
				<div className="document-package-modal-footer">
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
					>
						Закрыть
					</button>

					<button
						type="button"
						className="primary-button"
						onClick={handlePrint}
						style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
					>
						<Printer size={16} aria-hidden="true" />
						Распечатать справку КНД 1151156
					</button>
				</div>
			</div>
		</div>
	);
}
