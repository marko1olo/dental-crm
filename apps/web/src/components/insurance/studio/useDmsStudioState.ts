/**
 * apps/web/src/components/insurance/studio/useDmsStudioState.ts
 *
 * Dedicated state management hook for DmsStudioModal.
 * Handles insurer contracts, guarantee letters lifecycle, itemized franchise split arithmetic,
 * and claims registry exports.
 *
 * Mandates:
 * - 8b: Modularity sweet spot (<300 lines)
 * - 8e: Doctor Autonomy (non-blocking instant split defaults)
 * - 8be: Anti-any, strict types
 */

import { useEffect, useMemo, useState } from "react";
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
	generateUuidV7,
	kopecksToRubles,
} from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import { printHtmlViaIframe } from "../../documents/printHtmlViaIframe.js";

export interface UseDmsStudioStateOptions {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
		policyNumber?: string | undefined;
		cardNumber?: string | undefined;
	};
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useDmsStudioState({
	isOpen,
	onClose,
	patient,
	initialTab = "split",
	billItems,
	onApplySplitToCashbox,
}: UseDmsStudioStateOptions) {
	const isDemo = isDemoShowcaseMode();

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
				patientId: patient.id || (isDemo ? "pat-demo" : ""),
				patientFullName: patient.fullName,
				policyNumber: patient.policyNumber || "ДМС-2026-998811",
				insurerKey: ins.id,
				insurerName: ins.shortNameRu,
				issueDate: new Date().toISOString().slice(0, 10),
				validFrom: new Date().toISOString().slice(0, 10),
				validUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
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

	// Zero-Leak Draft Reset (Мандаты 8zq, 8bn): сброс черновика при закрытии или смене пациента
	useEffect(() => {
		if (!isOpen) {
			setActiveTab(initialTab);
			setFranchisePercent(0);
			setPaymentMethod("card");
			setMixedCashRubInput("0");
			setIsSplitApproved(false);
			setNewLetterNumber("ГП-2026-002");
			setNewLetterLimitRub(50000);
			setLetters([]);
			setActiveLetterId("");
			setLiveRegistryRecords([]);
			return;
		}
		setActiveTab(initialTab);
		setFranchisePercent(0);
		setPaymentMethod("card");
		setMixedCashRubInput("0");
		setIsSplitApproved(false);
		setLetters(initialLetters);
		setActiveLetterId(initialLetters[0]?.id || "");
		setLiveRegistryRecords([]);
	}, [isOpen, patient?.id, initialTab, initialLetters]);

	// Fastify API Live Query for Clinic Contracts, Patient Guarantee Letters & Registry
	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;

		// 1. Fetch clinic insurance contracts
		fetch("/api/insurance/contracts", {
			headers: denteClinicalReadHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					clientLogger.warn("[useDmsStudioState] Сервер вернул ошибку при загрузке договоров ДМС", { status: res.status }, { module: "Insurance" });
					return [];
				}
				return res.json();
			})
			.then((raw: unknown) => {
				if (!isMounted) return;
				const data =
					raw && typeof raw === "object" && "data" in raw && !Array.isArray(raw)
						? (raw as { data?: unknown }).data ?? raw
						: raw;
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
			.catch((err) => {
				clientLogger.warn("[useDmsStudioState] Не удалось загрузить договоры ДМС", err, { module: "Insurance" });
			});

		// 2. Fetch patient guarantee letters (only send patientId when it is a valid UUID)
		const hasValidPatientUuid = Boolean(patient?.id && UUID_REGEX.test(patient.id));
		if (patient?.id && !hasValidPatientUuid) {
			setLetters(isDemo ? initialLetters : []);
		} else {
			const query = hasValidPatientUuid ? `?patientId=${encodeURIComponent(patient.id)}` : "";
			fetch(`/api/insurance/guarantee-letters${query}`, {
				headers: denteClinicalReadHeaders(),
			})
				.then(async (res) => {
					if (!res.ok) {
						clientLogger.warn("[useDmsStudioState] Ошибка загрузки гарантийных писем", { status: res.status }, { module: "Insurance" });
						return [];
					}
					return res.json();
				})
				.then((raw: unknown) => {
					if (!isMounted) return;
					const data =
						raw && typeof raw === "object" && "data" in raw && !Array.isArray(raw)
							? (raw as { data?: unknown }).data ?? raw
							: raw;
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
				.catch((err) => {
					clientLogger.warn("[useDmsStudioState] Ошибка загрузки гарантийных писем", err, { module: "Insurance" });
					if (isMounted && isDemo) setLetters(initialLetters);
				});
		}

		// 3. Fetch insurance claims registry (live production mode)
		const selectedContract = contracts.find((c) => c.id === selectedInsurerId);
		const regParams = new URLSearchParams();
		if (selectedContract) {
			if (selectedContract.insurerKey) {
				regParams.set("insurerKey", selectedContract.insurerKey);
			} else if (UUID_REGEX.test(selectedContract.id)) {
				regParams.set("contractId", selectedContract.id);
			}
		} else if (selectedInsurerId) {
			if (UUID_REGEX.test(selectedInsurerId)) {
				regParams.set("contractId", selectedInsurerId);
			} else {
				regParams.set("insurerKey", selectedInsurerId);
			}
		}
		const regQuery = regParams.toString() ? `?${regParams.toString()}` : "";
		fetch(`/api/insurance/registry${regQuery}`, {
			headers: denteClinicalReadHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					clientLogger.warn("[useDmsStudioState] Ошибка загрузки реестра ДМС", { status: res.status }, { module: "Insurance" });
					return null;
				}
				return res.json();
			})
			.then((raw: unknown) => {
				if (!isMounted || !raw || typeof raw !== "object") return;
				const data =
					"data" in raw && (raw as { data?: unknown }).data && typeof (raw as { data?: unknown }).data === "object"
						? (raw as { data: unknown }).data
						: raw;
				const parsed = data as { serviceRecords?: DmsRegistryServiceRecord[]; records?: DmsRegistryServiceRecord[] };
				const recs = parsed.serviceRecords || parsed.records || [];
				if (Array.isArray(recs) && recs.length > 0) {
					setLiveRegistryRecords(recs);
				}
			})
			.catch((err) => {
				clientLogger.warn("[useDmsStudioState] Ошибка загрузки реестра ДМС", err, { module: "Insurance" });
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, patient?.id, isDemo, initialLetters, selectedInsurerId, contracts]);

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
			priceRub: item.unitPriceKopecks ? kopecksToRubles(item.unitPriceKopecks) : 0,
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

	const handleAddLetter = async () => {
		if (!patient.id) {
			showToast("Для прикрепления гарантийного письма выберите пациента", "warning");
			return;
		}
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
		const letterUuid = generateUuidV7();

		const newLetterItem: DmsGuaranteeLetter = {
			id: letterUuid,
			letterNumber: letNum,
			patientId: patient.id,
			patientFullName: patient.fullName,
			policyNumber: patient.policyNumber || "СГЗ-2026",
			insurerKey: company.id,
			insurerName: company.shortNameRu,
			issueDate: new Date().toISOString().slice(0, 10),
			validFrom: new Date().toISOString().slice(0, 10),
			validUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
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

		if (!patient.id || !UUID_REGEX.test(patient.id)) {
			showToast("Гарантийное письмо прикреплено локально", "info");
			return;
		}

		try {
			const res = await fetch("/api/insurance/guarantee-letters", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					id: letterUuid,
					patientId: patient.id,
					patientFullName: patient.fullName,
					patientBirthDate: patient.birthDate || new Date().toISOString().slice(0, 10),
					policyNumber: patient.policyNumber || "СГЗ-2026",
					insurerKey: company.id,
					insurerName: company.shortNameRu,
					letterNumber: letNum,
					issueDate: new Date().toISOString().slice(0, 10),
					validFrom: new Date().toISOString().slice(0, 10),
					validUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
					maxCoverageRub: limitRub,
					usedAmountRub: 0,
					franchisePct: franchisePercent,
					notes: "Согласовано стоматологическое лечение",
					status: "active",
				}),
			});
			if (res.ok) {
				const saved = await res.json();
				const savedId = (saved as { id?: string; data?: { id?: string } })?.data?.id || (saved as { id?: string })?.id;
				if (savedId && savedId !== letterUuid) {
					setLetters((prev) => prev.map((l) => (l.id === letterUuid ? { ...l, id: savedId } : l)));
					setActiveLetterId(savedId);
				}
				showToast("Гарантийное письмо сохранено в системе", "success");
			} else {
				let errJson: { message?: string; error?: string } | null = null;
				try {
					errJson = (await res.json()) as { message?: string; error?: string } | null;
				} catch (parseErr) {
					clientLogger.warn("[useDmsStudioState] Error JSON parse failed", {
						status: res.status,
						error: String(parseErr),
					}, { module: "Insurance" });
				}
				const errMsg = errJson?.message || errJson?.error || `HTTP ${res.status}`;
				clientLogger.warn("[useDmsStudioState] Ошибка сохранения гарантийного письма", { status: res.status, errMsg }, { module: "Insurance" });
				showToast(`Не удалось сохранить письмо на сервере (${errMsg}). Черновик сохранён локально.`, "warning");
			}
		} catch (err: unknown) {
			clientLogger.warn("[useDmsStudioState] Сетевой сбой при сохранении гарантийного письма", err, { module: "Insurance" });
			showToast("Сбой связи с сервером. Черновик гарантийного письма сохранён локально.", "warning");
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
		printHtmlViaIframe(html, "dms-bilateral-act-print-iframe");
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
		onClose();
	};

	return {
		activeTab,
		setActiveTab,
		selectedInsurerId,
		setSelectedInsurerId,
		franchisePercent,
		setFranchisePercent,
		paymentMethod,
		setPaymentMethod,
		mixedCashRubInput,
		setMixedCashRubInput,
		isSplitApproved,
		availableInsurers,
		selectedLetter,
		newLetterNumber,
		setNewLetterNumber,
		newLetterLimitRub,
		setNewLetterLimitRub,
		effectiveBillItems,
		totalBillRub,
		totalDmsCoveredRub,
		totalPatientCoPayRub,
		lineItems,
		letterRemainingLimitRub,
		patientDueRub,
		mixedCardRub,
		registryRecords,
		handleAddLetter,
		handleExportCsv,
		handlePrintAct,
		handleApplySplit,
	};
}
