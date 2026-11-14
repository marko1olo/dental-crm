/**
 * DmsStudioModal.tsx — Canonical Master Studio for Russian DMS Insurance, Guarantee Letters & Split Billing.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: buttons NEVER disabled, instant defaults)
 * - 8n (Solo-Doctor & Small Clinic 1-3 chairs sovereignty: zero bureaucracy)
 * - 8am (Exactly ONE Primary CTA button var(--teal, #0d9488) per visible context)
 * - 8ze / Apple HIG (Touch targets >= 44x44px, native Bottom Sheet on mobile, 0px horizontal scroll)
 * - 8x / 8ap (Human Russian clinical language, zero raw law numbers)
 * - 8b (Healthy sweet spot: 350-450 lines)
 * - 8be (Zero any / as any, strict types)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Building2,
	Check,
	Download,
	FileSpreadsheet,
	Plus,
	Printer,
	Shield,
	Split,
	X,
	Zap,
} from "lucide-react";
import {
	calculateDmsGuaranteeSplit,
	DMS_INSURANCE_COMPANIES_CATALOG,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationItem,
	type DmsBillableItem,
	type DmsRegistryServiceRecord,
	type PatientPaymentMethod,
} from "@dental/shared";
import {
	DEFAULT_CLINIC_PROFILE,
	exportRegistryToCsv,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
} from "./dmsCatalogData.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { showToast } from "../GlobalToast.js";
import "./insurance.css";

export interface DmsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
		policyNumber?: string | undefined;
		cardNumber?: string | undefined;
	} | undefined;
	readonly initialTab?: ("split" | "policies" | "registry") | undefined;
	readonly billItems?: readonly DmsBillableItem[] | undefined;
	readonly onApplySplitToCashbox?: ((splitData: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number | undefined;
		patientCardRub?: number | undefined;
		letterId?: string | undefined;
		letterNumber?: string | undefined;
		insurerName?: string | undefined;
	}) => void) | undefined;
}

const DEFAULT_DEMO_SERVICES: readonly DmsBillableItem[] = [
	{ id: "b-1", serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (световой композит)", toothNumber: "16", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "b-2", serviceCode: "A16.07.030.002", serviceName: "Эндодонтическое лечение (2 канала)", toothNumber: "16", quantity: 1, unitPriceKopecks: 580000 },
	{ id: "b-3", serviceCode: "A11.07.010", serviceName: "Анестезия проводниковая артикаин", toothNumber: "16", quantity: 2, unitPriceKopecks: 95000 },
	{ id: "b-4", serviceCode: "A06.07.012", serviceName: "Прицельная контрольная радиовизиография", toothNumber: "16", quantity: 1, unitPriceKopecks: 80000 },
	{ id: "b-5", serviceCode: "A16.07.051", serviceName: "Профессиональная гигиена полости рта (Air-Flow)", quantity: 1, unitPriceKopecks: 650000, isExcluded: false },
];

export const DmsStudioModal: React.FC<DmsStudioModalProps> = ({
	isOpen,
	onClose,
	patient: propPatient,
	initialTab = "split",
	billItems,
	onApplySplitToCashbox,
}) => {
	const isDemo = isDemoShowcaseMode();
	const patient = propPatient || (isDemo ? { id: "pat-1", fullName: "Соколова Анна Викторовна", birthDate: "15.04.1990", policyNumber: "СГЗ-2026-998811" } : { id: "", fullName: "Пациент", birthDate: "", policyNumber: "" });

	const [activeTab, setActiveTab] = useState<"split" | "policies" | "registry">(initialTab);
	const [contracts, setContracts] = useState<Array<{ id: string; companyName: string; insurerKey?: string }>>([]);
	const [selectedInsurerId, setSelectedInsurerId] = useState<string>(DMS_INSURANCE_COMPANIES_CATALOG[0]?.id || "sogaz");
	const [franchisePercent, setFranchisePercent] = useState<number>(0);
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRubInput, setMixedCashRubInput] = useState<string>("0");
	const [isSplitApproved, setIsSplitApproved] = useState<boolean>(false);

	const availableInsurers = useMemo(() => {
		if (contracts.length > 0) {
			return contracts.map((c) => ({
				id: c.id,
				key: c.insurerKey || c.id,
				shortNameRu: c.companyName,
				fullNameRu: c.companyName,
			}));
		}
		return DMS_INSURANCE_COMPANIES_CATALOG.slice(0, 6);
	}, [contracts]);

	const currentInsurerTitle = useMemo(() => {
		const found = availableInsurers.find((i) => i.id === selectedInsurerId);
		return found?.shortNameRu || "Страховая компания";
	}, [availableInsurers, selectedInsurerId]);

	const initialLetters: DmsGuaranteeLetter[] = useMemo(() => {
		if (!isDemo || !patient.fullName || patient.fullName === "Пациент") return [];
		const ins = availableInsurers[0] || DMS_INSURANCE_COMPANIES_CATALOG[0]!;
		return [
			{
				id: "g-let-1",
				letterNumber: "ГП-ДМС-88412",
				patientId: patient.id || "pat-1",
				patientFullName: patient.fullName,
				policyNumber: patient.policyNumber || "ДМС-2026-998811",
				insurerKey: ins.id,
				insurerName: ins.shortNameRu,
				issueDate: "2026-08-12",
				validFrom: "2026-08-12",
				validUntil: "2026-12-31",
				patientBirthDate: patient.birthDate || "1990-04-15",
				maxCoverageRub: 50000,
				usedAmountRub: 8400,
				franchisePct: 0,
				franchiseType: "none",
				franchiseFixedRub: 0,
				programExclusions: [],
				approvedServiceCodes: ["A16.07.002.001", "A16.07.030.002", "A11.07.010", "A06.07.012"],
				approvedTeethFdi: ["16"],
				approvedDiagnosisCodes: ["K02.1", "K04.0"],
				status: "active",
				notes: "Согласовано терапевтическое лечение зуба 16 и визиография",
			},
		];
	}, [isDemo, patient, availableInsurers]);

	const [letters, setLetters] = useState<DmsGuaranteeLetter[]>(initialLetters);
	const [activeLetterId, setActiveLetterId] = useState<string>(initialLetters[0]?.id || "g-let-1");
	const selectedLetter = letters.find((l) => l.id === activeLetterId) || letters[0];

	const [newLetterNumber, setNewLetterNumber] = useState<string>("ГП-2026-002");
	const [newLetterLimitRub, setNewLetterLimitRub] = useState<number>(50000);

	// Fastify API Live Query for Clinic Contracts & Patient Guarantee Letters
	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;

		// 1. Fetch clinic insurance contracts (dynamic SSOT)
		fetch("/api/insurance/contracts", {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((data: unknown) => {
				if (!isMounted) return;
				if (Array.isArray(data) && data.length > 0) {
					const list = data as Array<{ id: string; companyName: string; insurerKey?: string }>;
					setContracts(list);
					if (list[0]?.id) {
						setSelectedInsurerId(list[0].id);
					}
				}
			})
			.catch(() => {});

		// 2. Fetch patient guarantee letters
		const query = patient?.id ? `?patientId=${encodeURIComponent(patient.id)}` : "";
		fetch(`/api/insurance/guarantee-letters${query}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((data: unknown) => {
				if (!isMounted) return;
				if (Array.isArray(data) && data.length > 0) {
					setLetters(data as DmsGuaranteeLetter[]);
					if (data[0]?.id) setActiveLetterId(String(data[0].id));
				} else if (isDemo && initialLetters.length > 0) {
					setLetters(initialLetters);
				} else {
					setLetters([]);
				}
			})
			.catch(() => {
				if (isMounted && isDemo) setLetters(initialLetters);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, patient?.id, isDemo, initialLetters]);

	// Billable items: honest visit items or demo fallback
	const effectiveBillItems = useMemo<readonly DmsBillableItem[]>(() => {
		if (billItems && billItems.length > 0) return billItems;
		if (isDemoShowcaseMode()) return DEFAULT_DEMO_SERVICES;
		return [];
	}, [billItems]);

	const calcItems: DmsSplitCalculationItem[] = useMemo(() => {
		return effectiveBillItems.map((item) => ({
			serviceId: item.id,
			serviceCode: item.serviceCode,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			priceRub: item.unitPriceKopecks ? Math.round(item.unitPriceKopecks / 100) : 0,
			discountRub: 0,
			category: "therapy",
		}));
	}, [effectiveBillItems]);

	const splitResult = useMemo(() => {
		const letterForCalc = selectedLetter
			? { ...selectedLetter, franchisePct: franchisePercent }
			: null;
		return calculateDmsGuaranteeSplit(letterForCalc, calcItems, {
			visitDate: new Date().toISOString().slice(0, 10),
		});
	}, [selectedLetter, calcItems, franchisePercent]);

	const {
		totalBillRub,
		totalDmsCoveredRub,
		totalPatientCoPayRub,
		lineItems,
		letterRemainingLimitRub,
	} = splitResult;
	const patientDueRub = totalPatientCoPayRub;
	const mixedCashRub = Math.max(0, Math.min(patientDueRub, Number(mixedCashRubInput) || 0));
	const mixedCardRub = Math.max(0, patientDueRub - mixedCashRub);

	const registryRecords: readonly DmsRegistryServiceRecord[] = useMemo(() => {
		if (!isDemo) return [];
		const insurerTitle = selectedLetter?.insurerName || selectedLetter?.companyName || currentInsurerTitle;
		const letNum = selectedLetter?.letterNumber;
		const records: DmsRegistryServiceRecord[] = [
			{ id: "r-1", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой светового отверждения", toothNumber: "16", diagnosisCodeMkb10: "K02.1", quantity: 1, unitPriceRub: 4500, totalPriceRub: 4500, dmsCoveredRub: 4500, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: letNum },
			{ id: "r-2", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическая обработка 2 корневых каналов", toothNumber: "16", diagnosisCodeMkb10: "K04.0", quantity: 1, unitPriceRub: 5800, totalPriceRub: 5800, dmsCoveredRub: 5800, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: letNum },
			{ id: "r-3", visitId: "v-2", visitDate: "20.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.051", serviceName: "Профессиональная гигиена полости рта (Air-Flow)", diagnosisCodeMkb10: "K05.0", quantity: 1, unitPriceRub: 6500, totalPriceRub: 6500, dmsCoveredRub: 5200, patientPaidRub: 1300, doctorFullName: "Д-р Смирнова Е.П.", isExcluded: false, exclusionReason: "Франшиза 20%", letterNumber: letNum },
		];
		return records;
	}, [isDemo, patient, selectedLetter, currentInsurerTitle]);

	if (!isOpen) return null;

	const handleAddLetter = async () => {
		const company = availableInsurers.find((i) => i.id === selectedInsurerId) || availableInsurers[0] || DMS_INSURANCE_COMPANIES_CATALOG[0]!;
		const limitRub = Number(newLetterLimitRub || 50000);
		const letNum = newLetterNumber.trim() || `ГП-${Date.now().toString().slice(-5)}`;

		const newLetterItem: DmsGuaranteeLetter = {
			id: `let-${Date.now()}`,
			letterNumber: letNum,
			patientId: patient.id || "00000000-0000-0000-0000-000000000001",
			patientFullName: patient.fullName,
			policyNumber: patient.policyNumber || "СГЗ-2026",
			insurerKey: company.id,
			insurerName: company.shortNameRu,
			issueDate: new Date().toISOString().slice(0, 10),
			validFrom: new Date().toISOString().slice(0, 10),
			validUntil: "2026-12-31",
			patientBirthDate: patient.birthDate || new Date().toISOString().slice(0, 10),
			maxCoverageRub: limitRub,
			usedAmountRub: 0,
			franchisePct: franchisePercent,
			franchiseType: "percent",
			franchiseFixedRub: 0,
			programExclusions: [],
			approvedServiceCodes: ["A16.07.002.001", "A16.07.030.002", "A11.07.010", "A06.07.012"],
			approvedTeethFdi: ["16"],
			approvedDiagnosisCodes: ["K02.1", "K04.0"],
			status: "active",
			notes: "Согласовано стоматологическое лечение",
		};

		setLetters((prev) => [newLetterItem, ...prev]);
		setActiveLetterId(newLetterItem.id);
		setNewLetterNumber(`ГП-${Date.now().toString().slice(-4)}`);

		// Persist via Fastify API
		try {
			await fetch("/api/insurance/guarantee-letters", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: patient.id || "00000000-0000-0000-0000-000000000001",
					patientFullName: patient.fullName,
					patientBirthDate: patient.birthDate || new Date().toISOString().slice(0, 10),
					policyNumber: patient.policyNumber || "СГЗ-2026",
					insurerKey: company.id,
					insurerName: company.shortNameRu,
					letterNumber: letNum,
					issueDate: new Date().toISOString().slice(0, 10),
					validFrom: new Date().toISOString().slice(0, 10),
					validUntil: "2026-12-31",
					maxCoverageRub: limitRub,
					usedAmountRub: 0,
					franchisePct: franchisePercent,
					notes: "Согласовано стоматологическое лечение",
					status: "active",
				}),
			});
			showToast("Гарантийное письмо сохранено в системе", "success");
		} catch {
			showToast("Гарантийное письмо прикреплено локально", "info");
		}
	};

	const handleExportCsv = () => {
		const csv = exportRegistryToCsv(
			registryRecords,
			DEFAULT_CLINIC_PROFILE,
			selectedLetter?.insurerName || selectedLetter?.companyName || currentInsurerTitle,
			"Август 2026",
		);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Reestr_DMS_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handlePrintAct = () => {
		const insurerTitle = selectedLetter?.insurerName || selectedLetter?.companyName || currentInsurerTitle;
		const html = generateBilateralAcceptanceActHtml({
			records: registryRecords,
			summary: {
				totalServicesCount: registryRecords.length,
				uniquePatientsCount: 1,
				totalAmountRub: 16800,
				totalDmsCoveredRub: 15500,
				totalPatientPaidRub: 1300,
				isBalanced: true,
				insurerName: insurerTitle,
				periodStart: "01.08.2026",
				periodEnd: "31.08.2026",
			},
			clinicInfo: DEFAULT_CLINIC_PROFILE,
			insurerInfo: {
				name: insurerTitle,
				representative: "Куратор ДМС",
				contractNumber: "ДМС-2026/01",
				contractDate: "10.01.2026",
			},
			actNumber: "АКТ-2026/08",
			actDate: new Date().toLocaleDateString("ru-RU"),
		});
		const w = window.open("", "_blank");
		if (w) {
			w.document.write(html);
			w.document.close();
			w.print();
		}
	};

	const handleApplySplit = () => {
		setIsSplitApproved(true);
		if (onApplySplitToCashbox) {
			onApplySplitToCashbox({
				totalDueRub: totalBillRub,
				dmsRub: totalDmsCoveredRub,
				patientRub: patientDueRub,
				patientMethod: paymentMethod,
				patientCashRub: paymentMethod === "cash" ? patientDueRub : paymentMethod === "mixed" ? mixedCashRub : 0,
				patientCardRub: paymentMethod === "card" ? patientDueRub : paymentMethod === "mixed" ? mixedCardRub : 0,
				letterId: selectedLetter?.id,
				letterNumber: selectedLetter?.letterNumber,
				insurerName: selectedLetter?.insurerName || selectedLetter?.companyName || currentInsurerTitle,
			});
		}
		showToast("ДМС-сплит успешно утвержден", "success");
	};

	return (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-modal-window" onClick={(e) => e.stopPropagation()}>
				{/* Apple HIG Drag Handle for mobile */}
				<div className="dms-bottom-sheet-handle" />

				{/* Header */}
				<div className="dms-header">
					<div className="dms-header-info">
						<div className="dms-header-icon">
							<Shield size={22} />
						</div>
						<div className="dms-header-text">
							<h2 className="dms-header-title">
								ДМС: {patient.fullName}
							</h2>
							<div className="dms-header-meta">
								{patient.birthDate ? `Дата рождения: ${patient.birthDate} • ` : ""}
								Полис: {patient.policyNumber || "Не указан"} • Статус: <span className="dms-badge dms-badge-active"><Zap size={12} /> Активен</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} className="dms-close-btn" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="dms-tabs-bar">
					<button
						type="button"
						onClick={() => setActiveTab("split")}
						className={`dms-tab-btn ${activeTab === "split" ? "dms-tab-btn-active" : ""}`}
					>
						<Split size={16} />
						<span className="dms-tab-label-full">Сплит оплаты</span>
						<span className="dms-tab-label-short">Сплит</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("policies")}
						className={`dms-tab-btn ${activeTab === "policies" ? "dms-tab-btn-active" : ""}`}
					>
						<Building2 size={16} />
						<span className="dms-tab-label-full">Гарантийное письмо</span>
						<span className="dms-tab-label-short">Гарантии</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("registry")}
						className={`dms-tab-btn ${activeTab === "registry" ? "dms-tab-btn-active" : ""}`}
					>
						<FileSpreadsheet size={16} />
						<span className="dms-tab-label-full">Реестр счетов</span>
						<span className="dms-tab-label-short">Реестр</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="dms-body">
					{activeTab === "split" && (
						<>
							{/* Top Insurers Bar */}
							<div className="dms-chips-bar">
								<span className="dms-chips-label">Страховые компании:</span>
								{DMS_INSURANCE_COMPANIES_CATALOG.slice(0, 6).map((ins) => (
									<button
										key={ins.id}
										type="button"
										onClick={() => setSelectedInsurerId(ins.id)}
										className={`dms-chip-btn ${selectedInsurerId === ins.id ? "dms-chip-btn-active" : ""}`}
									>
										{ins.shortNameRu}
									</button>
								))}
							</div>

							{/* Franchise and Letter Limit bar */}
							<div className="dms-limit-franchise-bar">
								<div>
									<div className="dms-limit-title">Остаток гарантийного письма</div>
									<div className="dms-limit-value">
										{letterRemainingLimitRub !== null ? formatCurrencyRub(letterRemainingLimitRub) : "Не ограничен"}
									</div>
								</div>
								<div className="dms-franchise-controls">
									<span className="dms-franchise-label">Франшиза полиса:</span>
									{[0, 10, 20, 30, 50].map((pct) => (
										<button
											key={pct}
											type="button"
											onClick={() => setFranchisePercent(pct)}
											className={`dms-franchise-btn ${franchisePercent === pct ? "dms-franchise-btn-active" : ""}`}
										>
											{pct}%
										</button>
									))}
								</div>
							</div>

							{effectiveBillItems.length === 0 && (
								<div
									data-testid="dms-empty-bill-items"
									style={{
										padding: "10px 14px",
										borderRadius: "10px",
										background: "var(--paper-soft, #f8fafc)",
										color: "var(--muted, #64748b)",
										fontSize: "13px",
										textAlign: "center",
									}}
								>
									Нет позиций для распределения счёта
								</div>
							)}

							{/* Bill Items Breakdown Table */}
							<div className="dms-table-container">
								<table className="dms-table">
									<thead>
										<tr>
											<th>Услуга</th>
											<th style={{ width: "60px" }}>Зуб</th>
											<th style={{ width: "70px" }}>Кол-во</th>
											<th style={{ textAlign: "right", width: "100px" }}>Всего</th>
											<th style={{ textAlign: "right", width: "110px", color: "var(--dms-teal)" }}>Страховая</th>
											<th style={{ textAlign: "right", width: "110px", color: "var(--dms-amber-ink)" }}>Пациент</th>
										</tr>
									</thead>
									<tbody>
										{lineItems.length === 0 ? (
											<tr>
												<td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--muted, #64748b)" }}>
													Нет услуг в счёте текущего визита
												</td>
											</tr>
										) : (
											lineItems.map((item) => (
												<tr key={item.serviceId}>
													<td>
														<div style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>{item.serviceName}</div>
														<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>{item.splitReason}</div>
													</td>
													<td style={{ color: "var(--muted, #64748b)" }}>{item.toothNumber || "—"}</td>
													<td>{item.quantity}</td>
													<td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrencyRub(item.totalPriceRub)}</td>
													<td className="dms-col-dms">{formatCurrencyRub(item.dmsCoveredRub)}</td>
													<td className="dms-col-patient">{formatCurrencyRub(item.patientCoPayRub)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							{/* Summary Totals & Payment Method (Sentence Case) */}
							<div className="dms-summary-grid">
								<div className="dms-summary-card dms-summary-card-dms">
									<div className="dms-summary-title-dms">Покрывается страховкой</div>
									<div className="dms-summary-amount-dms">
										{formatCurrencyRub(totalDmsCoveredRub)}
									</div>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "4px" }}>
										Безналичное перечисление от {selectedLetter?.insurerName || selectedLetter?.companyName || "страховой компании"}
									</div>
								</div>

								<div className="dms-summary-card dms-summary-card-patient">
									<div className="dms-summary-title-patient">Доплата пациента на кассе</div>
									<div className="dms-summary-amount-patient">
										{formatCurrencyRub(totalPatientCoPayRub)}
									</div>
									<div className="dms-payment-method-selector">
										{(["card", "cash", "mixed"] as const).map((m) => (
											<button
												key={m}
												type="button"
												onClick={() => setPaymentMethod(m)}
												className={`dms-payment-btn ${paymentMethod === m ? "dms-payment-btn-active" : ""}`}
											>
												{m === "card" ? "Карта" : m === "cash" ? "Наличные" : "Смешанная"}
											</button>
										))}
									</div>
									{paymentMethod === "mixed" && (
										<div className="dms-mixed-input-row">
											<span>Наличными (₽):</span>
											<input
												type="number"
												min={0}
												max={patientDueRub}
												value={mixedCashRubInput}
												onChange={(e) => setMixedCashRubInput(e.target.value)}
												className="dms-mixed-input"
											/>
											<span style={{ color: "var(--muted, #64748b)" }}>
												Картой: {formatCurrencyRub(mixedCardRub)}
											</span>
										</div>
									)}
								</div>
							</div>
						</>
					)}

					{activeTab === "policies" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								Выберите страховую компанию РФ:
							</div>
							<div className="dms-chips-bar">
								{DMS_INSURANCE_COMPANIES_CATALOG.slice(0, 6).map((ins) => (
									<button
										key={ins.id}
										type="button"
										onClick={() => setSelectedInsurerId(ins.id)}
										className={`dms-chip-btn ${selectedInsurerId === ins.id ? "dms-chip-btn-active" : ""}`}
									>
										{ins.shortNameRu}
									</button>
								))}
							</div>

							<div className="dms-form-card">
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
									Прикрепить новое гарантийное письмо
								</div>
								<div className="dms-form-grid">
									<div>
										<label className="dms-form-label">Номер гарантийного письма</label>
										<input
											type="text"
											value={newLetterNumber}
											onChange={(e) => setNewLetterNumber(e.target.value)}
											className="dms-input"
										/>
									</div>
									<div>
										<label className="dms-form-label">Лимит покрытия (₽)</label>
										<input
											type="number"
											value={newLetterLimitRub}
											onChange={(e) => setNewLetterLimitRub(Number(e.target.value) || 0)}
											className="dms-input"
										/>
									</div>
								</div>
								<button
									type="button"
									onClick={handleAddLetter}
									className="dms-btn-secondary dente-btn-secondary"
									style={{ alignSelf: "flex-start", minHeight: "44px" }}
								>
									<Plus size={16} /> Прикрепить гарантийное письмо
								</button>
							</div>
						</div>
					)}

					{activeTab === "registry" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
									Оказанные услуги по ДМС за текущий период
								</div>
								<div style={{ display: "flex", gap: "8px" }}>
									<button type="button" onClick={handleExportCsv} className="dms-btn-secondary dente-btn-secondary">
										<Download size={15} /> Экспорт реестра в CSV
									</button>
									<button type="button" onClick={handlePrintAct} className="dms-btn-secondary dente-btn-secondary">
										<Printer size={15} /> Печать акта для страховой
									</button>
								</div>
							</div>

							<div className="dms-table-container">
								<table className="dms-table">
									<thead>
										<tr>
											<th>Дата</th>
											<th>Пациент</th>
											<th>Услуга</th>
											<th style={{ textAlign: "right" }}>Всего</th>
											<th style={{ textAlign: "right", color: "var(--dms-teal)" }}>ДМС</th>
											<th style={{ textAlign: "right", color: "var(--dms-amber-ink)" }}>Пациент</th>
										</tr>
									</thead>
									<tbody>
										{registryRecords.map((r) => (
											<tr key={r.id}>
												<td>{r.visitDate}</td>
												<td style={{ fontWeight: 600 }}>{r.patientFullName}</td>
												<td>{r.serviceName}</td>
												<td style={{ textAlign: "right" }}>{formatCurrencyRub(r.totalPriceRub || 0)}</td>
												<td className="dms-col-dms">{formatCurrencyRub(r.dmsCoveredRub || 0)}</td>
												<td className="dms-col-patient">{formatCurrencyRub(r.patientPaidRub || 0)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Footer with EXACTLY ONE PRIMARY CTA BUTTON */}
				<div className="dms-footer">
					<div className="dms-footer-summary">
						Итого к сплиту: <strong>{formatCurrencyRub(totalBillRub)}</strong> (Страховая: {formatCurrencyRub(totalDmsCoveredRub)} • Пациент: {formatCurrencyRub(totalPatientCoPayRub)})
					</div>
					<div className="dms-footer-actions">
						<button type="button" onClick={onClose} className="dms-btn-secondary dente-btn-secondary">
							Закрыть
						</button>
						{/* EXACTLY ONE PRIMARY CTA: Mandate 8am & 8e */}
						<button
							type="button"
							onClick={handleApplySplit}
							className="dms-primary-cta dente-btn-primary"
						>
							<Check size={18} /> {isSplitApproved ? "Сплит утвержден в кассе" : "Утвердить ДМС-сплит"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

DmsStudioModal.displayName = "DmsStudioModal";
export default DmsStudioModal;
