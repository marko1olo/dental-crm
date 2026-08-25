/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUCH-FIRST FNS NDFL XML EXPORT HUD MODAL (ПРИКАЗ ФНС № ЕД-7-11/755@)
 * Medical Tax Deduction XML & KND 1151156 Printable Certificate Generator
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { formatKopecksRu, parseKopecks } from "@dental/shared";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Code2,
	Copy,
	Download,
	Eye,
	FileCode2,
	FileText,
	Plus,
	Printer,
	ShieldAlert,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLogic } from "../../../useAppLogic";
import { showToast } from "../../GlobalToast";
import {
	type FnsNdflClinicMetadata,
	type FnsNdflFiscalReceiptItem,
	type FnsNdflPatientMetadata,
	type FnsNdflPayerMetadata,
	type FnsNdflXmlPayload,
	generateFnsNdflPrintHtml,
	generateFnsNdflXml,
	parseFio,
} from "./fnsNdflXmlEngine";
import {
	DEFAULT_FNS_CLINIC_PRESET,
	FNS_IDENTITY_DOC_TYPES,
	FNS_KINSHIP_PRESETS,
	FNS_SERVICE_CODE_PRESETS,
	type FnsKinshipCode,
	type FnsServiceDeductionCode,
	SUPPORTED_TAX_YEARS,
	type SupportedTaxYear,
	validateRussianInn,
	validateRussianSnils,
} from "./fnsNdflXmlPresets";
import "./fnsNdflXml.css";

export interface FnsNdflXmlModalProps {
	onClose: () => void;
	initialPatientId?: string;
	initialTaxYear?: SupportedTaxYear;
}

type TabType = "payer" | "receipts" | "clinic" | "xml_preview";

export function FnsNdflXmlModal({
	initialPatientId,
	initialTaxYear = 2025,
	onClose,
}: FnsNdflXmlModalProps) {
	const { dashboard, patientId: activePatientId } = useAppLogic();

	// 1. Пациент
	const selectedPatient = useMemo(() => {
		const targetId = initialPatientId || activePatientId;
		return (
			dashboard?.patients?.find((p) => p.id === targetId) ||
			dashboard?.patients?.[0] || {
				id: "sample-patient-1",
				fullName: "Иванов Иван Иванович",
				birthDate: "1990-05-15",
				phone: "+7 (999) 123-45-67",
			}
		);
	}, [dashboard?.patients, initialPatientId, activePatientId]);

	const [activeTab, setActiveTab] = useState<TabType>("payer");
	const [taxYear, setTaxYear] = useState<SupportedTaxYear>(initialTaxYear);
	const [taxOfficeCode, setTaxOfficeCode] = useState<string>("7701");
	const [documentNumber, setDocumentNumber] = useState<string>(
		`СПР-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
	);
	const [certificateKind, setCertificateKind] = useState<"1" | "2" | "3">("1");

	// 2. Налогоплательщик и родство
	const [kinshipCode, setKinshipCode] = useState<FnsKinshipCode>("1");
	const [payerFullName, setPayerFullName] = useState<string>(
		selectedPatient?.fullName || "Иванов Иван Иванович",
	);
	const [payerInn, setPayerInn] = useState<string>("770112345678");
	const [payerSnils, setPayerSnils] = useState<string>("");
	const [payerBirthDate, setPayerBirthDate] = useState<string>(
		selectedPatient?.birthDate?.split("T")[0] || "1990-05-15",
	);
	const [payerDocSeriesNumber, setPayerDocSeriesNumber] =
		useState<string>("4510 123456");
	const [payerDocDate, setPayerDocDate] = useState<string>("2010-06-20");
	const [payerDocTypeCode, setPayerDocTypeCode] = useState<string>("21");

	// 3. Данные пациента (если родство != 1)
	const [patientFullName, setPatientFullName] = useState<string>(
		selectedPatient?.fullName || "Иванова Мария Ивановна",
	);
	const [patientInn, setPatientInn] = useState<string>("");
	const [patientSnils, setPatientSnils] = useState<string>("");
	const [patientBirthDate, setPatientBirthDate] = useState<string>("2015-09-20");
	const [patientDocSeriesNumber, setPatientDocSeriesNumber] =
		useState<string>("II-МЮ 654321");
	const [patientDocDate, setPatientDocDate] = useState<string>("2015-10-01");
	const [patientDocTypeCode, setPatientDocTypeCode] = useState<string>("03");

	// 4. Клиника
	const [clinicInfo, setClinicInfo] = useState<FnsNdflClinicMetadata>({
		name: DEFAULT_FNS_CLINIC_PRESET.clinicName,
		inn: DEFAULT_FNS_CLINIC_PRESET.inn,
		kpp: DEFAULT_FNS_CLINIC_PRESET.kpp,
		ogrn: DEFAULT_FNS_CLINIC_PRESET.ogrn,
		license: {
			number: DEFAULT_FNS_CLINIC_PRESET.licenseNumber,
			date: DEFAULT_FNS_CLINIC_PRESET.licenseDate,
		},
		directorName: DEFAULT_FNS_CLINIC_PRESET.directorName,
		directorSnils: DEFAULT_FNS_CLINIC_PRESET.directorSnils,
		phone: DEFAULT_FNS_CLINIC_PRESET.phone,
	});

	// 5. Фискальные чеки (54-ФЗ)
	const [receipts, setReceipts] = useState<FnsNdflFiscalReceiptItem[]>([
		{
			id: "rec-1",
			receiptNumber: "ФЧ-10482",
			fiscalDocumentNumber: "74892",
			receiptDate: `${taxYear}-03-15`,
			serviceName: "Лечение глубокого кариеса, эстетическая реставрация",
			deductionCode: "1",
			amountRub: 14500.0,
		},
		{
			id: "rec-2",
			receiptNumber: "ФЧ-10519",
			fiscalDocumentNumber: "75104",
			receiptDate: `${taxYear}-04-10`,
			serviceName: "Комплексная профессиональная гигиена и AirFlow",
			deductionCode: "1",
			amountRub: 7500.0,
		},
		{
			id: "rec-3",
			receiptNumber: "ФЧ-10890",
			fiscalDocumentNumber: "76320",
			receiptDate: `${taxYear}-07-22`,
			serviceName: "Дентальная имплантация Astra Tech (Код 2 - дорогостоящее)",
			deductionCode: "2",
			amountRub: 85000.0,
		},
	]);

	// Поля для добавления нового чека
	const [newReceiptDate, setNewReceiptDate] = useState<string>(
		`${taxYear}-08-15`,
	);
	const [newReceiptNumber, setNewReceiptNumber] = useState<string>("");
	const [newReceiptService, setNewReceiptService] = useState<string>("");
	const [newReceiptCode, setNewReceiptCode] =
		useState<FnsServiceDeductionCode>("1");
	const [newReceiptAmount, setNewReceiptAmount] = useState<string>("");

	// Валидаторы
	const payerInnValidation = useMemo(
		() => validateRussianInn(payerInn),
		[payerInn],
	);
	const payerSnilsValidation = useMemo(
		() => (payerSnils ? validateRussianSnils(payerSnils) : null),
		[payerSnils],
	);
	const patientInnValidation = useMemo(
		() => (patientInn ? validateRussianInn(patientInn) : null),
		[patientInn],
	);

	// Сборка полного Payload
	const xmlPayload: FnsNdflXmlPayload = useMemo(() => {
		const payerFio = parseFio(payerFullName);
		const payerMeta: FnsNdflPayerMetadata = {
			fullName: payerFio,
			inn: payerInn.trim() || undefined,
			snils: payerSnils.trim() || undefined,
			birthDate: payerBirthDate,
			identityDocument: payerDocSeriesNumber
				? {
						docTypeCode: payerDocTypeCode,
						seriesAndNumber: payerDocSeriesNumber,
						issueDate: payerDocDate || undefined,
					}
				: undefined,
		};

		let patientMeta: FnsNdflPatientMetadata;
		if (kinshipCode === "1") {
			patientMeta = {
				kinshipCode: "1",
			};
		} else {
			const patFio = parseFio(patientFullName);
			patientMeta = {
				kinshipCode,
				fullName: patFio,
				inn: patientInn.trim() || undefined,
				snils: patientSnils.trim() || undefined,
				birthDate: patientBirthDate,
				identityDocument: patientDocSeriesNumber
					? {
							docTypeCode: patientDocTypeCode,
							seriesAndNumber: patientDocSeriesNumber,
							issueDate: patientDocDate || undefined,
						}
					: undefined,
			};
		}

		return {
			documentNumber,
			documentDate: new Date().toISOString().split("T")[0] || "2026-08-18",
			taxYear,
			taxInspectionCode: taxOfficeCode,
			certificateKind,
			clinic: clinicInfo,
			payer: payerMeta,
			patient: patientMeta,
			receipts,
			signatory: {
				signatoryRole: "1",
				fullName: parseFio(clinicInfo.directorName || "Смирнов А.В."),
				snils: clinicInfo.directorSnils,
			},
		};
	}, [
		documentNumber,
		taxYear,
		taxOfficeCode,
		certificateKind,
		clinicInfo,
		payerFullName,
		payerInn,
		payerSnils,
		payerBirthDate,
		payerDocSeriesNumber,
		payerDocDate,
		payerDocTypeCode,
		kinshipCode,
		patientFullName,
		patientInn,
		patientSnils,
		patientBirthDate,
		patientDocSeriesNumber,
		patientDocDate,
		patientDocTypeCode,
		receipts,
	]);

	// Вычисление XML и метрик
	const calculationResult = useMemo(
		() => generateFnsNdflXml(xmlPayload),
		[xmlPayload],
	);

	// Обработчик добавления чека
	const handleAddReceipt = () => {
		const amount = Number.parseFloat(newReceiptAmount.replace(",", "."));
		if (!amount || amount <= 0) {
			showToast("Укажите корректную сумму платежа", "warning");
			return;
		}
		const newRec: FnsNdflFiscalReceiptItem = {
			id: `rec-${Date.now()}`,
			receiptNumber:
				newReceiptNumber.trim() ||
				`ФЧ-${Math.floor(10000 + Math.random() * 90000)}`,
			receiptDate: newReceiptDate || `${taxYear}-01-15`,
			serviceName:
				newReceiptService.trim() ||
				(newReceiptCode === "1"
					? "Стоматологические услуги"
					: "Дентальная имплантация"),
			deductionCode: newReceiptCode,
			amountRub: amount,
		};
		setReceipts((prev) => [...prev, newRec]);
		setNewReceiptNumber("");
		setNewReceiptService("");
		setNewReceiptAmount("");
		showToast("Чек успешно добавлен в расчет", "success");
	};

	// Удаление чека
	const handleRemoveReceipt = (id: string) => {
		setReceipts((prev) => prev.filter((r) => r.id !== id));
	};

	// Переключение кода вычета 1/2 у конкретного чека
	const handleToggleReceiptCode = (
		id: string,
		code: FnsServiceDeductionCode,
	) => {
		setReceipts((prev) =>
			prev.map((r) => (r.id === id ? { ...r, deductionCode: code } : r)),
		);
	};

	// 1-Click Скачать XML
	const handleDownloadXml = () => {
		try {
			const blob = new Blob([calculationResult.xmlContent], {
				type: "application/xml;charset=utf-8",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = calculationResult.fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast(`XML файл ${calculationResult.fileName} сохранен`, "success");
		} catch {
			showToast("Ошибка при сохранении XML файла", "error");
		}
	};

	// 1-Click Копировать XML
	const handleCopyXml = () => {
		navigator.clipboard
			.writeText(calculationResult.xmlContent)
			.then(() => {
				showToast("XML скопирован в буфер обмена", "success");
			})
			.catch(() => {
				showToast("Не удалось скопировать XML", "error");
			});
	};

	// 1-Click Печать справки
	const handlePrintCertificate = () => {
		try {
			const html = generateFnsNdflPrintHtml(xmlPayload);
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.open();
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => {
					printWindow.print();
				}, 250);
			}
		} catch {
			showToast("Ошибка при формировании печатной формы", "error");
		}
	};

	const modalContent = (
		<div className="fns-ndfl-overlay" role="dialog" aria-modal="true" data-testid="fns-ndfl-xml-modal">
			<div className="fns-ndfl-modal">
				{/* Modal Header */}
				<div className="fns-ndfl-header">
					<div className="fns-ndfl-title-wrap">
						<div className="fns-ndfl-icon-badge">
							<FileCode2 size={24} />
						</div>
						<div>
							<h2 className="fns-ndfl-title">
								Справка для налоговой (Приказ ФНС № ЕД-7-11/755@)
							</h2>
							<div className="fns-ndfl-subtitle">
								Генератор XML (формат КНД 1184043) и печатная форма КНД 1151156
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="fns-knd-badge">КНД 1151156 / 1184043</span>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--surface,#f1f5f9)] dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="fns-ndfl-tabs">
					<button
						type="button"
						className={`fns-ndfl-tab-btn ${activeTab === "payer" ? "active" : ""}`}
						onClick={() => setActiveTab("payer")}
					>
						<Users size={16} />
						1. Налогоплательщик и пациент
					</button>
					<button
						type="button"
						className={`fns-ndfl-tab-btn ${activeTab === "receipts" ? "active" : ""}`}
						onClick={() => setActiveTab("receipts")}
					>
						<FileText size={16} />
						2. Чеки и суммы ({receipts.length})
					</button>
					<button
						type="button"
						className={`fns-ndfl-tab-btn ${activeTab === "clinic" ? "active" : ""}`}
						onClick={() => setActiveTab("clinic")}
					>
						<Building2 size={16} />
						3. Реквизиты клиники
					</button>
					<button
						type="button"
						className={`fns-ndfl-tab-btn ${activeTab === "xml_preview" ? "active" : ""}`}
						onClick={() => setActiveTab("xml_preview")}
					>
						<Code2 size={16} />
						4. XML превью
					</button>
				</div>

				{/* Body Content */}
				<div className="fns-ndfl-body">
					{/* Tab 1: Payer & Patient */}
					{activeTab === "payer" && (
						<>
							<div className="fns-section">
								<h3 className="fns-section-title">
									<span>Параметры справки</span>
								</h3>
								<div className="fns-grid-3">
									<div className="fns-field">
										<label>Налоговый период (год)</label>
										<select
											value={taxYear}
											onChange={(e) =>
												setTaxYear(Number(e.target.value) as SupportedTaxYear)
											}
											className="fns-select"
										>
											{SUPPORTED_TAX_YEARS.map((y) => (
												<option key={y} value={y}>
													{y} год
												</option>
											))}
										</select>
									</div>
									<div className="fns-field">
										<label>Код ИФНС (4 цифры)</label>
										<input
											type="text"
											value={taxOfficeCode}
											maxLength={4}
											onChange={(e) =>
												setTaxOfficeCode(
													e.target.value.replace(/\D/g, "").slice(0, 4),
												)
											}
											className="fns-input"
											placeholder="7701"
										/>
									</div>
									<div className="fns-field">
										<label>Номер справки</label>
										<input
											type="text"
											value={documentNumber}
											onChange={(e) => setDocumentNumber(e.target.value)}
											className="fns-input"
										/>
									</div>
								</div>
							</div>

							<div className="fns-section">
								<h3 className="fns-section-title">
									<span>Отношение пациента к налогоплательщику</span>
								</h3>
								<div className="fns-field">
									<label>Кто оплачивает лечение</label>
									<select
										value={kinshipCode}
										onChange={(e) =>
											setKinshipCode(e.target.value as FnsKinshipCode)
										}
										className="fns-select"
									>
										{Object.values(FNS_KINSHIP_PRESETS).map((k) => (
											<option key={k.code} value={k.code}>
												{k.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="fns-section">
								<h3 className="fns-section-title">
									<span>
										Сведения о налогоплательщике (том, кто получит вычет 13%)
									</span>
								</h3>
								<div className="fns-grid-2">
									<div className="fns-field">
										<label>ФИО налогоплательщика</label>
										<input
											type="text"
											value={payerFullName}
											onChange={(e) => setPayerFullName(e.target.value)}
											className="fns-input"
											placeholder="Фамилия Имя Отчество"
										/>
									</div>
									<div className="fns-field">
										<label>ИНН налогоплательщика (12 цифр)</label>
										<input
											type="text"
											value={payerInn}
											maxLength={12}
											onChange={(e) =>
												setPayerInn(
													e.target.value.replace(/\D/g, "").slice(0, 12),
												)
											}
											className={`fns-input ${payerInnValidation.isValid ? "is-valid" : "is-invalid"}`}
											placeholder="12-значный ИНН"
										/>
										{payerInn && (
											<span
												className={`fns-val-badge ${payerInnValidation.isValid ? "valid" : "invalid"}`}
											>
												{payerInnValidation.isValid ? (
													<>
														<CheckCircle2 size={12} /> ИНН ФЛ корректен
													</>
												) : (
													<>
														<AlertTriangle size={12} />{" "}
														{payerInnValidation.error}
													</>
												)}
											</span>
										)}
									</div>
								</div>

								<div className="fns-grid-3">
									<div className="fns-field">
										<label>Дата рождения</label>
										<input
											type="date"
											value={payerBirthDate}
											onChange={(e) => setPayerBirthDate(e.target.value)}
											className="fns-input"
										/>
									</div>
									<div className="fns-field">
										<label>СНИЛС (при наличии)</label>
										<input
											type="text"
											value={payerSnils}
											onChange={(e) => setPayerSnils(e.target.value)}
											className="fns-input"
											placeholder="123-456-789 01"
										/>
										{payerSnilsValidation && (
											<span
												className={`fns-val-badge ${payerSnilsValidation.isValid ? "valid" : "invalid"}`}
											>
												{payerSnilsValidation.isValid
													? "СНИЛС корректен"
													: payerSnilsValidation.error}
											</span>
										)}
									</div>
									<div className="fns-field">
										<label>Вид документа</label>
										<select
											value={payerDocTypeCode}
											onChange={(e) => setPayerDocTypeCode(e.target.value)}
											className="fns-select"
										>
											{FNS_IDENTITY_DOC_TYPES.map((d) => (
												<option key={d.code} value={d.code}>
													{d.label}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="fns-grid-2">
									<div className="fns-field">
										<label>Серия и номер паспорта / документа</label>
										<input
											type="text"
											value={payerDocSeriesNumber}
											onChange={(e) => setPayerDocSeriesNumber(e.target.value)}
											className="fns-input"
											placeholder="4510 123456"
										/>
									</div>
									<div className="fns-field">
										<label>Дата выдачи документа</label>
										<input
											type="date"
											value={payerDocDate}
											onChange={(e) => setPayerDocDate(e.target.value)}
											className="fns-input"
										/>
									</div>
								</div>
							</div>

							{/* If relative */}
							{kinshipCode !== "1" && (
								<div className="fns-section">
									<h3 className="fns-section-title">
										<span>
											Сведения о пациенте (родственнике / подопечном)
										</span>
									</h3>
									<div className="fns-grid-2">
										<div className="fns-field">
											<label>ФИО пациента</label>
											<input
												type="text"
												value={patientFullName}
												onChange={(e) => setPatientFullName(e.target.value)}
												className="fns-input"
											/>
										</div>
										<div className="fns-field">
											<label>ИНН пациента (если есть)</label>
											<input
												type="text"
												value={patientInn}
												maxLength={12}
												onChange={(e) =>
													setPatientInn(
														e.target.value.replace(/\D/g, "").slice(0, 12),
													)
												}
												className="fns-input"
												placeholder="12 цифр"
											/>
										</div>
									</div>
									<div className="fns-grid-3">
										<div className="fns-field">
											<label>Дата рождения пациента</label>
											<input
												type="date"
												value={patientBirthDate}
												onChange={(e) => setPatientBirthDate(e.target.value)}
												className="fns-input"
											/>
										</div>
										<div className="fns-field">
											<label>Вид документа пациента</label>
											<select
												value={patientDocTypeCode}
												onChange={(e) =>
													setPatientDocTypeCode(e.target.value)
												}
												className="fns-select"
											>
												{FNS_IDENTITY_DOC_TYPES.map((d) => (
													<option key={d.code} value={d.code}>
														{d.label}
													</option>
												))}
											</select>
										</div>
										<div className="fns-field">
											<label>Серия и номер документа</label>
											<input
												type="text"
												value={patientDocSeriesNumber}
												onChange={(e) =>
													setPatientDocSeriesNumber(e.target.value)
												}
												className="fns-input"
											/>
										</div>
									</div>
								</div>
							)}
						</>
					)}

					{/* Tab 2: Receipts */}
					{activeTab === "receipts" && (
						<>
							{/* Financial Summary */}
							<div className="fns-summary-grid">
								<div className="fns-summary-card">
									<div className="fns-summary-label">
										Код 1 (Обычное лечение)
									</div>
									<div className="fns-summary-val">
										{formatKopecksRu(calculationResult.code1Kopecks)}
									</div>
									<div className="text-[10px] text-[var(--muted,#64748b)]">
										Лимит базы: 150 000 ₽ / год
									</div>
								</div>
								<div className="fns-summary-card">
									<div className="fns-summary-label">
										Код 2 (Дорогостоящее)
									</div>
									<div className="fns-summary-val">
										{formatKopecksRu(calculationResult.code2Kopecks)}
									</div>
									<div className="text-[10px] text-[var(--muted,#64748b)]">
										Имплантация, костная пластика (без лимита)
									</div>
								</div>
								<div className="fns-summary-card highlight">
									<div className="fns-summary-label">
										Расчетный вычет (13% к возврату)
									</div>
									<div className="fns-summary-val green">
										{formatKopecksRu(
											parseKopecks(calculationResult.estimatedTaxRefundRub),
										)}
									</div>
									<div className="text-[10px] text-[var(--ok-fg,#059669)]">
										По ст. 219 НК РФ
									</div>
								</div>
							</div>

							{/* Receipts Table */}
							<div className="fns-section">
								<h3 className="fns-section-title">
									<span>Реестр фискальных чеков (54-ФЗ) за {taxYear} год</span>
								</h3>
								<div className="fns-table-wrap">
									<table className="fns-table">
										<thead>
											<tr>
												<th>№</th>
												<th>Дата</th>
												<th>Чек / ФД</th>
												<th>Услуга</th>
												<th>Код вычета</th>
												<th style={{ textAlign: "right" }}>Сумма</th>
												<th style={{ width: 40 }} />
											</tr>
										</thead>
										<tbody>
											{receipts.map((r, i) => (
												<tr key={r.id}>
													<td>{i + 1}</td>
													<td>{r.receiptDate}</td>
													<td>
														<span className="font-semibold">
															{r.receiptNumber}
														</span>
														{r.fiscalDocumentNumber && (
															<span className="text-[10px] text-[var(--muted,#64748b)] block">
																ФД {r.fiscalDocumentNumber}
															</span>
														)}
													</td>
													<td>{r.serviceName}</td>
													<td>
														<div className="flex gap-1">
															<button
																type="button"
																onClick={() =>
																	handleToggleReceiptCode(r.id, "1")
																}
																className={`fns-code-badge ${r.deductionCode === "1" ? "code-1" : "opacity-40"}`}
															>
																Код 1
															</button>
															<button
																type="button"
																onClick={() =>
																	handleToggleReceiptCode(r.id, "2")
																}
																className={`fns-code-badge ${r.deductionCode === "2" ? "code-2" : "opacity-40"}`}
															>
																Код 2
															</button>
														</div>
													</td>
													<td
														style={{
															textAlign: "right",
															fontWeight: 700,
														}}
													>
														{formatKopecksRu(parseKopecks(r.amountRub))}
													</td>
													<td>
														<button
															type="button"
															onClick={() => handleRemoveReceipt(r.id)}
															className="text-[var(--bad-fg,#ef4444)] hover:opacity-80 p-1"
															title="Удалить"
														>
															<Trash2 size={14} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Add Receipt Box */}
							<div className="fns-section">
								<h3 className="fns-section-title">
									<span>Добавить чек об оплате</span>
								</h3>
								<div className="fns-grid-3">
									<div className="fns-field">
										<label>Дата чека</label>
										<input
											type="date"
											value={newReceiptDate}
											onChange={(e) => setNewReceiptDate(e.target.value)}
											className="fns-input"
										/>
									</div>
									<div className="fns-field">
										<label>Номер чека / ФД</label>
										<input
											type="text"
											value={newReceiptNumber}
											onChange={(e) => setNewReceiptNumber(e.target.value)}
											className="fns-input"
											placeholder="ФЧ-10901"
										/>
									</div>
									<div className="fns-field">
										<label>Код услуги</label>
										<select
											value={newReceiptCode}
											onChange={(e) =>
												setNewReceiptCode(
													e.target.value as FnsServiceDeductionCode,
												)
											}
											className="fns-select"
										>
											<option value="1">1 — Обычное лечение</option>
											<option value="2">2 — Дорогостоящее (Имплантация)</option>
										</select>
									</div>
								</div>
								<div className="fns-grid-2 mt-2">
									<div className="fns-field">
										<label>Наименование услуги</label>
										<input
											type="text"
											value={newReceiptService}
											onChange={(e) => setNewReceiptService(e.target.value)}
											className="fns-input"
											placeholder="Терапевтическое лечение / Имплантация"
										/>
									</div>
									<div className="fns-field">
										<label>Сумма оплаты (₽)</label>
										<div className="flex gap-2">
											<input
												type="number"
												step="0.01"
												value={newReceiptAmount}
												onChange={(e) => setNewReceiptAmount(e.target.value)}
												className="fns-input flex-1"
												placeholder="0.00"
											/>
											<button
												type="button"
												onClick={handleAddReceipt}
												className="fns-btn fns-btn-primary"
											>
												<Plus size={16} /> Добавить
											</button>
										</div>
									</div>
								</div>
							</div>
						</>
					)}

					{/* Tab 3: Clinic */}
					{activeTab === "clinic" && (
						<div className="fns-section">
							<h3 className="fns-section-title">
								<span>Юридические реквизиты клиники (для XML выгрузки)</span>
							</h3>
							<div className="fns-grid-2">
								<div className="fns-field">
									<label>Наименование организации / ИП</label>
									<input
										type="text"
										value={clinicInfo.name}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
								<div className="fns-field">
									<label>ИНН клиники (10 знаков ЮЛ / 12 знаков ИП)</label>
									<input
										type="text"
										value={clinicInfo.inn}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												inn: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
							</div>
							<div className="fns-grid-3">
								<div className="fns-field">
									<label>КПП (9 знаков для ЮЛ)</label>
									<input
										type="text"
										value={clinicInfo.kpp || ""}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												kpp: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
								<div className="fns-field">
									<label>ОГРН / ОГРНИП</label>
									<input
										type="text"
										value={clinicInfo.ogrn}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												ogrn: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
								<div className="fns-field">
									<label>Телефон клиники</label>
									<input
										type="text"
										value={clinicInfo.phone || ""}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												phone: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
							</div>
							<div className="fns-grid-2">
								<div className="fns-field">
									<label>Номер медицинской лицензии</label>
									<input
										type="text"
										value={clinicInfo.license?.number || ""}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												license: {
													number: e.target.value,
													date: prev.license?.date || "2021-04-12",
												},
											}))
										}
										className="fns-input"
									/>
								</div>
								<div className="fns-field">
									<label>ФИО руководителя / подписанта</label>
									<input
										type="text"
										value={clinicInfo.directorName || ""}
										onChange={(e) =>
											setClinicInfo((prev) => ({
												...prev,
												directorName: e.target.value,
											}))
										}
										className="fns-input"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Tab 4: XML Preview */}
					{activeTab === "xml_preview" && (
						<div className="fns-section">
							<div className="flex justify-between items-center mb-2">
								<h3 className="fns-section-title m-0">
									<span>Сформированный XML (КНД 1184043 Версия 5.01)</span>
								</h3>
								<span className="text-[11px] text-[var(--muted,#64748b)]">
									Имя файла: {calculationResult.fileName}
								</span>
							</div>

							{calculationResult.preflightIssues.length > 0 && (
								<div className="fns-alerts-box mb-3">
									<div className="font-bold flex items-center gap-1">
										<ShieldAlert size={14} /> Замечания проверки:
									</div>
									{calculationResult.preflightIssues.map((issue) => (
										<div key={issue.field}>• {issue.message}</div>
									))}
								</div>
							)}

							<pre className="fns-xml-preview">
								{calculationResult.xmlContent}
							</pre>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="fns-ndfl-footer">
					<div className="flex items-center gap-2">
						{calculationResult.isValidForSubmission ? (
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ok-fg,#059669)] bg-[var(--ok-bg,#f0fdf4)] px-3 py-1.5 rounded-xl border border-[var(--ok-fg,#059669)]/30">
								<CheckCircle2 size={16} /> Готово к выгрузке
							</span>
						) : (
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--bad-fg,#ef4444)] bg-[var(--bad-bg,#fef2f2)] px-3 py-1.5 rounded-xl border border-[var(--bad-fg,#ef4444)]/30">
								<AlertTriangle size={16} /> Есть ошибки заполнения
							</span>
						)}
					</div>

					<div className="fns-btn-group">
						<button
							type="button"
							onClick={handleCopyXml}
							className="fns-btn fns-btn-secondary"
						>
							<Copy size={16} /> Копировать XML
						</button>
						<button
							type="button"
							onClick={handlePrintCertificate}
							className="fns-btn fns-btn-secondary"
						>
							<Printer size={16} /> Печать справки
						</button>
						<button
							type="button"
							onClick={handleDownloadXml}
							className="fns-btn fns-btn-primary"
						>
							<Download size={16} /> Скачать XML для ФНС
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
