/**
 * DmsStudioModal.tsx — Canonical Master Studio for Russian DMS Insurance, Guarantee Letters & Split Billing.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: buttons NEVER disabled, instant defaults)
 * - 8n (Solo-Doctor & Small Clinic 1-3 chairs sovereignty: zero bureaucracy)
 * - 8am (Exactly ONE Primary CTA button var(--teal, #0d9488) per visible context)
 * - 8ze / Apple HIG (Touch targets >= 44x44px, native Bottom Sheet on mobile, 0px horizontal scroll)
 * - 8x / 8ap (Human Russian clinical language, zero raw law numbers)
 * - 8b (Healthy sweet spot: modular subcomponents under components/insurance/studio/)
 * - 8be (Zero any / as any, strict types)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Building2,
	Check,
	FileSpreadsheet,
	Shield,
	Split,
	X,
	Zap,
} from "lucide-react";
import {
	calculateDmsGuaranteeSplit,
	calculateRegistryTotals,
	DMS_INSURANCE_COMPANIES_CATALOG,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationItem,
	type DmsBillableItem,
	type DmsRegistryServiceRecord,
	type PatientPaymentMethod,
	DEFAULT_CLINIC_PROFILE,
	exportRegistryToCsv,
	generateBilateralAcceptanceActHtml,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { showToast } from "../GlobalToast.js";
import {
	DmsSplitBillingTab,
	DmsGuaranteeLettersTab,
	DmsRegistryExportTab,
} from "./studio/index.js";
import "./insurance.css";

export interface DmsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose?: (() => void) | undefined;
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

const formatDisplayRub = (rub: number): string => `${Math.round(rub).toLocaleString("ru-RU")} ₽`;

export const DmsStudioModal: React.FC<DmsStudioModalProps> = ({
	isOpen,
	onClose = () => {},
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
		const fallbackIns = DMS_INSURANCE_COMPANIES_CATALOG[0] ?? {
			id: "sogaz",
			shortNameRu: "АО «СОГАЗ»",
			fullNameRu: "Акционерное общество «Страховое общество газовой промышленности»",
			inn: "7736035485",
			ogrn: "1027739820921",
			kpp: "770801001",
			phone: "8 800 333-08-88",
			email: "dms@sogaz.ru",
			websiteUrl: "https://www.sogaz.ru",
			defaultFranchiseRates: [0, 10, 20, 30],
			descriptionRu: "Крупнейший страховщик ДМС в РФ.",
		};
		const ins = availableInsurers[0] ?? fallbackIns;
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
				approvedServiceCodes804n: ["A16.07.002.001", "A16.07.030.002", "A11.07.010", "A06.07.012"],
				approvedTeethFdi: ["16"],
				approvedDiagnosisCodes: ["K02.1", "K04.0"],
				approvedDiagnosisMkb10: ["K02.1", "K04.0"],
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
	const [liveRegistryRecords, setLiveRegistryRecords] = useState<readonly DmsRegistryServiceRecord[]>([]);

	// Fastify API Live Query for Clinic Contracts, Patient Guarantee Letters & Registry
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
					const list: Array<{ id: string; companyName: string; insurerKey?: string }> = [];
					for (const item of data) {
						if (typeof item === "object" && item !== null && "id" in item && "companyName" in item) {
							const rec = item as { id: unknown; companyName: unknown; insurerKey?: unknown };
							const entry: { id: string; companyName: string; insurerKey?: string } = {
								id: String(rec.id),
								companyName: String(rec.companyName),
							};
							if (rec.insurerKey) {
								entry.insurerKey = String(rec.insurerKey);
							}
							list.push(entry);
						}
					}
					setContracts(list);
					const firstContract = list[0];
					if (firstContract?.id) {
						setSelectedInsurerId(firstContract.id);
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
					const list = data as DmsGuaranteeLetter[];
					setLetters(list);
					const firstLetter = list[0];
					if (firstLetter?.id) setActiveLetterId(String(firstLetter.id));
				} else if (isDemo && initialLetters.length > 0) {
					setLetters(initialLetters);
				} else {
					setLetters([]);
				}
			})
			.catch(() => {
				if (isMounted && isDemo) setLetters(initialLetters);
			});

		// 3. Fetch insurance claims registry (live production mode)
		const regQuery = selectedInsurerId ? `?insurerKey=${encodeURIComponent(selectedInsurerId)}` : "";
		fetch(`/api/insurance/registry${regQuery}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data: unknown) => {
				if (!isMounted || !data || typeof data !== "object") return;
				const parsed = data as { serviceRecords?: DmsRegistryServiceRecord[]; records?: DmsRegistryServiceRecord[] };
				const recs = parsed.serviceRecords || parsed.records || [];
				if (Array.isArray(recs) && recs.length > 0) {
					setLiveRegistryRecords(recs);
				}
			})
			.catch(() => {});

		return () => {
			isMounted = false;
		};
	}, [isOpen, patient?.id, isDemo, initialLetters, selectedInsurerId]);

	// Billable items: honest visit items or demo fallback
	const effectiveBillItems = useMemo<readonly DmsBillableItem[]>(() => {
		if (billItems && billItems.length > 0) return billItems;
		if (isDemoShowcaseMode()) return DEFAULT_DEMO_SERVICES;
		return [];
	}, [billItems]);

	const calcItems: DmsSplitCalculationItem[] = useMemo(() => {
		return effectiveBillItems.map((item, idx) => ({
			serviceId: item.id || `srv-${idx + 1}`,
			serviceCode: item.serviceCode || "",
			serviceName: item.serviceName || "Медицинская услуга",
			...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
			quantity: Math.max(1, item.quantity ?? 1),
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
		if (liveRegistryRecords.length > 0) return liveRegistryRecords;
		if (!isDemo) return [];
		const insurerTitle = selectedLetter?.insurerName || selectedLetter?.companyName || currentInsurerTitle;
		const letNum = selectedLetter?.letterNumber;
		const records: DmsRegistryServiceRecord[] = [
			{ id: "r-1", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой светового отверждения", toothNumber: "16", diagnosisCodeMkb10: "K02.1", quantity: 1, unitPriceRub: 4500, totalPriceRub: 4500, dmsCoveredRub: 4500, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: letNum },
			{ id: "r-2", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическая обработка 2 корневых каналов", toothNumber: "16", diagnosisCodeMkb10: "K04.0", quantity: 1, unitPriceRub: 5800, totalPriceRub: 5800, dmsCoveredRub: 5800, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: letNum },
			{ id: "r-3", visitId: "v-2", visitDate: "20.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: insurerTitle, serviceCode804n: "A16.07.051", serviceName: "Профессиональная гигиена полости рта (Air-Flow)", diagnosisCodeMkb10: "K05.0", quantity: 1, unitPriceRub: 6500, totalPriceRub: 6500, dmsCoveredRub: 5200, patientPaidRub: 1300, doctorFullName: "Д-р Смирнова Е.П.", isExcluded: false, exclusionReason: "Франшиза 20%", letterNumber: letNum },
		];
		return records;
	}, [liveRegistryRecords, isDemo, patient, selectedLetter, currentInsurerTitle]);

	if (!isOpen) return null;

	const handleAddLetter = async () => {
		const fallbackCompany = DMS_INSURANCE_COMPANIES_CATALOG[0] ?? {
			id: "sogaz",
			shortNameRu: "АО «СОГАЗ»",
			fullNameRu: "Акционерное общество «Страховое общество газовой промышленности»",
			inn: "7736035485",
			ogrn: "1027739820921",
			kpp: "770801001",
			phone: "8 800 333-08-88",
			email: "dms@sogaz.ru",
			websiteUrl: "https://www.sogaz.ru",
			defaultFranchiseRates: [0, 10, 20, 30],
			descriptionRu: "Крупнейший страховщик ДМС в РФ.",
		};
		const company = availableInsurers.find((i) => i.id === selectedInsurerId) ?? availableInsurers[0] ?? fallbackCompany;
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
			approvedServiceCodes804n: ["A16.07.002.001", "A16.07.030.002", "A11.07.010", "A06.07.012"],
			approvedTeethFdi: ["16"],
			approvedDiagnosisCodes: ["K02.1", "K04.0"],
			approvedDiagnosisMkb10: ["K02.1", "K04.0"],
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
		const actDate = new Date().toLocaleDateString("ru-RU");
		const summary = calculateRegistryTotals(registryRecords, insurerTitle);
		const html = generateBilateralAcceptanceActHtml({
			records: registryRecords,
			summary,
			clinicInfo: DEFAULT_CLINIC_PROFILE,
			insurerInfo: {
				name: insurerTitle,
				representative: "Куратор ДМС",
				contractNumber: "ДМС-2026/01",
				contractDate: "10.01.2026",
			},
			actNumber: `АКТ-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}`,
			actDate,
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
						<DmsSplitBillingTab
							availableInsurers={availableInsurers}
							selectedInsurerId={selectedInsurerId}
							onSelectInsurerId={setSelectedInsurerId}
							letterRemainingLimitRub={letterRemainingLimitRub}
							franchisePercent={franchisePercent}
							onSelectFranchisePercent={setFranchisePercent}
							effectiveBillItems={effectiveBillItems}
							lineItems={lineItems}
							totalDmsCoveredRub={totalDmsCoveredRub}
							totalPatientCoPayRub={totalPatientCoPayRub}
							paymentMethod={paymentMethod}
							onSelectPaymentMethod={setPaymentMethod}
							mixedCashRubInput={mixedCashRubInput}
							onChangeMixedCashRubInput={setMixedCashRubInput}
							mixedCardRub={mixedCardRub}
							patientDueRub={patientDueRub}
							selectedInsurerTitle={selectedLetter?.insurerName || selectedLetter?.companyName || "страховой компании"}
							formatDisplayRub={formatDisplayRub}
						/>
					)}

					{activeTab === "policies" && (
						<DmsGuaranteeLettersTab
							availableInsurers={availableInsurers}
							selectedInsurerId={selectedInsurerId}
							onSelectInsurerId={setSelectedInsurerId}
							newLetterNumber={newLetterNumber}
							onChangeNewLetterNumber={setNewLetterNumber}
							newLetterLimitRub={newLetterLimitRub}
							onChangeNewLetterLimitRub={setNewLetterLimitRub}
							onAddLetter={handleAddLetter}
						/>
					)}

					{activeTab === "registry" && (
						<DmsRegistryExportTab
							registryRecords={registryRecords}
							onExportCsv={handleExportCsv}
							onPrintAct={handlePrintAct}
							formatDisplayRub={formatDisplayRub}
						/>
					)}
				</div>

				{/* Footer with EXACTLY ONE PRIMARY CTA BUTTON */}
				<div className="dms-footer">
					<div className="dms-footer-summary">
						Итого к сплиту: <strong>{formatDisplayRub(totalBillRub)}</strong> (Страховая: {formatDisplayRub(totalDmsCoveredRub)} • Пациент: {formatDisplayRub(totalPatientCoPayRub)})
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
