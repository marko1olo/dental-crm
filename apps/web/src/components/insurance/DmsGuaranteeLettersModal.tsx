/**
 * DmsGuaranteeLettersModal.tsx — Модальное окно управления гарантийными письмами пациента,
 * прогресс-баром расходования лимита (зеленый -> желтый -> красный), формой привязки нового ГП,
 * интерактивным выбором зубов FDI (11..48), номенклатурой 804н и сплит-калькулятором сооплаты.
 *
 * Инварианты:
 * 1. Копеечная точность расчетов (целочисленные копейки).
 * 2. Цветовая шкала прогресс-бара: Зеленый (<80%), Желтый (80-99%), Красный (>=100%).
 * 3. Железный баланс сплит-калькулятора: Итого = ДМС + Сооплата пациента.
 * 4. Медицинская плотность и тач-таргеты >= 44x44px.
 */

import {
	AlertCircle,
	AlertTriangle,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	FileCheck,
	FilePlus2,
	FileText,
	Info,
	Percent,
	Phone,
	Plus,
	Loader2,
	Printer,
	Search,
	Shield,
	Trash2,
	User,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers.js";
import { showToast } from "../GlobalToast";
import "./dmsInsurance.css";
import {
	calculateServiceDmsDistribution,
	formatRubKopecks,
	NOMENCLATURE_804N_CATALOG,
	Nomenclature804nItem,
	RUSSIAN_DMS_INSURERS,
	search804nServices,
} from "./insuranceMath.js";
import { isServiceExcludedByDmsRules } from "./insuranceCatalogs.js";

export interface PatientDmsProfile {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly policyNumber?: string | undefined;
	readonly insuranceCompany?: string | undefined;
	readonly phone?: string | undefined;
}

export interface PatientGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly issueDate: string; // YYYY-MM-DD
	readonly validFrom: string; // YYYY-MM-DD
	readonly validUntil: string; // YYYY-MM-DD
	readonly maxCoverageKopecks: number;
	readonly usedAmountKopecks: number;
	readonly franchisePct: number; // 0..100%
	readonly franchiseType: "percent" | "fixed_kopecks";
	readonly franchiseFixedKopecks: number;
	readonly approvedTeethFdi: readonly string[];
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail?: string | undefined;
	readonly notes?: string | undefined;
	readonly status: "active" | "exhausted" | "expired" | "cancelled";
}

export interface BillItemToSplit {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

export interface DmsGuaranteeLettersModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientDmsProfile | undefined;
	readonly initialLetters?: readonly PatientGuaranteeLetter[] | undefined;
	readonly initialBillItems?: readonly BillItemToSplit[] | undefined;
	readonly onSaveLetter?: ((letter: PatientGuaranteeLetter) => void) | undefined;
	readonly onSelectLetterForVisit?: ((letter: PatientGuaranteeLetter) => void) | undefined;
	readonly onApplySplitCalculation?: ((result: {
		letterId: string;
		totalBillKopecks: number;
		dmsCoveredKopecks: number;
		patientCoPayKopecks: number;
		warning?: string | undefined;
	}) => void) | undefined;
}

/** Типовые диагнозы МКБ-10 в стоматологии */
export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", title: "Кариес дентина" },
	{ code: "K02.2", title: "Кариес цемента" },
	{ code: "K04.0", title: "Пульпит (острый/хронический)" },
	{ code: "K04.4", title: "Острый апикальный периодонтит" },
	{ code: "K04.5", title: "Хронический апикальный периодонтит" },
	{ code: "K05.1", title: "Хронический гингивит" },
	{ code: "K05.3", title: "Хронический пародонтит" },
	{ code: "K01.1", title: "Дистопия/ретенция зуба мудрости" },
	{ code: "K08.1", title: "Потеря зубов вследствие удаления/травмы" },
];

/** Зубная формула FDI: Взрослый прикус 18..11, 21..28 (верхняя челюсть), 48..41, 31..38 (нижняя челюсть) */
export const FDI_ADULT_TEETH_UPPER = [
	"1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1",
	"2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
];

export const FDI_ADULT_TEETH_LOWER = [
	"4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1",
	"3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
];

/** Преобразование ответа бэкенда в модель интерфейса гарантийного письма */
export function mapBackendLetterToPatientGuaranteeLetter(item: any): PatientGuaranteeLetter {
	return {
		id: String(item.id),
		letterNumber: String(item.letterNumber || ""),
		insurerKey: String(item.insurerKey || "custom"),
		insurerName: String(item.insurerName || "Страховая компания ДМС"),
		patientId: String(item.patientId || ""),
		patientFullName: String(item.patientFullName || ""),
		policyNumber: String(item.policyNumber || ""),
		issueDate: String(item.issueDate || "").slice(0, 10),
		validFrom: String(item.validFrom || "").slice(0, 10),
		validUntil: String(item.validUntil || "").slice(0, 10),
		maxCoverageKopecks: Math.round(Number(item.maxCoverageRub || 0) * 100),
		usedAmountKopecks: Math.round(Number(item.usedAmountRub || 0) * 100),
		franchisePct: Number(item.franchisePct) || 0,
		franchiseType: item.franchiseType === "fixed_rub" ? "fixed_kopecks" : "percent",
		franchiseFixedKopecks: Math.round(Number(item.franchiseFixedRub || 0) * 100),
		approvedTeethFdi: Array.isArray(item.approvedTeethFdi) ? item.approvedTeethFdi : [],
		approvedServiceCodes804n: Array.isArray(item.approvedServiceCodes)
			? item.approvedServiceCodes
			: Array.isArray(item.approvedServiceCodes804n)
			? item.approvedServiceCodes804n
			: [],
		approvedDiagnosisMkb10: Array.isArray(item.approvedDiagnosisCodes)
			? item.approvedDiagnosisCodes
			: Array.isArray(item.approvedDiagnosisMkb10)
			? item.approvedDiagnosisMkb10
			: [],
		curatorFullName: String(item.curatorFullName || ""),
		curatorPhone: String(item.curatorPhone || ""),
		curatorEmail: item.curatorEmail ? String(item.curatorEmail) : undefined,
		notes: String(item.notes || ""),
		status: (item.status as PatientGuaranteeLetter["status"]) || "active",
	};
}

/** Демо-позиции визита для сплит-калькулятора */
export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly BillItemToSplit[] = [
	{
		id: "bill-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000,
	},
	{
		id: "bill-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000,
	},
	{
		id: "bill-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000, // Исключение из ДМС
	},
];

export function DmsGuaranteeLettersModal({
	isOpen,
	onClose,
	patient = {
		id: "pat-101",
		fullName: "Иванов Сергей Алексеевич",
		birthDate: "14.06.1988",
		policyNumber: "СГЗ-77-991283",
		insuranceCompany: "АО «СОГАЗ»",
		phone: "+7 (926) 880-12-34",
	},
	initialLetters = [],
	initialBillItems = DEFAULT_BILL_ITEMS_TO_SPLIT,
	onSaveLetter,
	onSelectLetterForVisit,
	onApplySplitCalculation,
}: DmsGuaranteeLettersModalProps) {
	const insurerSelectId = useId();
	const policyNumberInputId = useId();
	const letterNumberInputId = useId();
	const issueDateInputId = useId();
	const validFromInputId = useId();
	const validUntilInputId = useId();
	const maxLimitInputId = useId();
	const usedLimitInputId = useId();
	const franchisePctInputId = useId();
	const curatorNameInputId = useId();
	const curatorPhoneInputId = useId();
	const serviceSearchInputId = useId();
	const notesInputId = useId();

	// Вкладки: "list" (список ГП), "new_letter" (форма привязки), "split_calc" (сплит-калькулятор)
	const [activeTab, setActiveTab] = useState<"list" | "new_letter" | "split_calc">("list");

	// Состояние гарантийных писем и загрузки
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [letters, setLetters] = useState<readonly PatientGuaranteeLetter[]>(initialLetters);
	const [selectedLetterId, setSelectedLetterId] = useState<string>(initialLetters[0]?.id || "");

	// Загрузка гарантийных писем с бэкенда по patientId
	const fetchPatientLetters = useCallback(async () => {
		if (!patient?.id) return;
		setIsLoading(true);
		try {
			const res = await fetch(
				`/api/insurance/guarantee-letters?patientId=${encodeURIComponent(patient.id)}`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (!res.ok) {
				throw new Error(`Ошибка загрузки гарантийных писем: ${res.status}`);
			}
			const data = await res.json();
			if (Array.isArray(data)) {
				const mapped = data.map(mapBackendLetterToPatientGuaranteeLetter);
				setLetters(mapped);
				if (mapped.length > 0) {
					setSelectedLetterId((prev) =>
						mapped.some((l) => l.id === prev) ? prev : mapped[0]!.id,
					);
				}
			}
		} catch (err: any) {
			console.warn("[DmsGuaranteeLettersModal] Failed to fetch letters:", err);
		} finally {
			setIsLoading(false);
		}
	}, [patient?.id]);

	useEffect(() => {
		if (isOpen && patient?.id) {
			fetchPatientLetters();
		}
	}, [isOpen, patient?.id, fetchPatientLetters]);

	// Состояние формы нового гарантийного письма
	const [newInsurerKey, setNewInsurerKey] = useState<string>(
		RUSSIAN_DMS_INSURERS[0]?.key || "sogaz",
	);
	const [newPolicyNumber, setNewPolicyNumber] = useState<string>(patient.policyNumber || "");
	const [newLetterNumber, setNewLetterNumber] = useState<string>(
		`ГП-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
	);
	const [newIssueDate, setNewIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [newValidFrom, setNewValidFrom] = useState<string>(new Date().toISOString().slice(0, 10));
	const [newValidUntil, setNewValidUntil] = useState<string>(() => {
		const d = new Date();
		d.setMonth(d.getMonth() + 1);
		return d.toISOString().slice(0, 10);
	});
	const [newMaxCoverageRub, setNewMaxCoverageRub] = useState<number>(50000);
	const [newFranchisePct, setNewFranchisePct] = useState<number>(0);
	const [newApprovedTeeth, setNewApprovedTeeth] = useState<string[]>(["1.6", "1.5"]);
	const [newApprovedServices, setNewApprovedServices] = useState<string[]>([
		"A16.07.002.001",
		"A16.07.030.001",
		"A11.07.010",
	]);
	const [newApprovedDiagnoses, setNewApprovedDiagnoses] = useState<string[]>(["K02.1", "K04.0"]);
	const [newCuratorName, setNewCuratorName] = useState<string>("Смирнова Елена Викторовна");
	const [newCuratorPhone, setNewCuratorPhone] = useState<string>("8 (800) 333-08-88");
	const [newNotes, setNewNotes] = useState<string>("");
	const [serviceSearchTerm, setServiceSearchTerm] = useState<string>("");

	// Режим «Острая боль / Экстренное лечение» (Мандат 8e: отсутствие ГП не блокирует прием)
	const [isEmergencyCare, setIsEmergencyCare] = useState<boolean>(false);
	const [quickPolicyNumber, setQuickPolicyNumber] = useState<string>(patient.policyNumber || "");

	// Состояние сплит-калькулятора визита
	const [billItems, setBillItems] = useState<readonly BillItemToSplit[]>(initialBillItems);

	// 1-клик прикрепление номера полиса ДМС и страховой компании без 20 полей бюрократии
	const handleQuickAttachPolicy = async (insurerKey: string, customPolicyNumber?: string) => {
		const polNum = (customPolicyNumber || quickPolicyNumber || newPolicyNumber || patient.policyNumber || "").trim() || `ПОЛИС-ДМС-${Date.now().toString().slice(-6)}`;

		setIsSaving(true);
		try {
			const res = await fetch("/api/insurance/quick-attach", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId: patient.id,
					patientFullName: patient.fullName,
					patientBirthDate: patient.birthDate,
					insurerKey,
					policyNumber: polNum,
					isEmergency: isEmergencyCare,
				}),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => null);
				throw new Error(errData?.message || `Ошибка прикрепления (${res.status})`);
			}

			const data = await res.json();
			if (data.letter) {
				const mapped = mapBackendLetterToPatientGuaranteeLetter(data.letter);
				setLetters((prev) => [mapped, ...prev.filter((l) => l.id !== mapped.id)]);
				setSelectedLetterId(mapped.id);
				if (onSaveLetter) onSaveLetter(mapped);
				showToast(
					`Полис ${mapped.insurerName} успешно прикреплён в 1 клик! ${data.warning ? `(${data.warning})` : ""}`,
					"success",
				);
				setActiveTab("list");
			}
		} catch (err: any) {
			showToast(err.message || "Не удалось прикрепить полис ДМС", "error");
		} finally {
			setIsSaving(false);
		}
	};

	if (!isOpen) return null;

	const selectedLetter = letters.find((l) => l.id === selectedLetterId) || letters[0];

	// Переключение зуба в зубной формуле
	const toggleTooth = (tooth: string) => {
		setNewApprovedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth],
		);
	};

	// Переключение диагноза МКБ-10
	const toggleDiagnosis = (code: string) => {
		setNewApprovedDiagnoses((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	// Переключение номенклатурной услуги 804н
	const toggleServiceCode = (code: string) => {
		setNewApprovedServices((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	// Фильтрация каталога 804н
	const filteredCatalog804n = search804nServices(serviceSearchTerm).slice(0, 8);

	// Сохранение нового гарантийного письма в PostgreSQL через API
	const handleSaveNewLetter = async () => {
		const effectiveLetterNumber = newLetterNumber.trim() || `ГП-${isEmergencyCare ? "ЭКСТРЕННО" : "ДМС"}-${Date.now().toString().slice(-6)}`;
		const effectivePolicyNumber = newPolicyNumber.trim() || (patient.policyNumber || `ПОЛИС-ДМС-${Date.now().toString().slice(-6)}`);
		const effectiveMaxCoverageRub = newMaxCoverageRub > 0 ? newMaxCoverageRub : 50000;

		const insurer = RUSSIAN_DMS_INSURERS.find((i) => i.key === newInsurerKey);
		const insurerDisplayName = insurer?.shortName || "Страховая компания ДМС";

		const payload = {
			patientId: patient.id,
			patientFullName: patient.fullName,
			patientBirthDate: patient.birthDate || null,
			policyNumber: effectivePolicyNumber,
			insurerKey: newInsurerKey,
			insurerName: insurerDisplayName,
			letterNumber: effectiveLetterNumber,
			issueDate: newIssueDate,
			validFrom: newValidFrom,
			validUntil: newValidUntil,
			maxCoverageRub: effectiveMaxCoverageRub,
			usedAmountRub: 0,
			franchisePct: newFranchisePct,
			franchiseType: "percent" as const,
			franchiseFixedRub: 0,
			programExclusions: [],
			approvedServiceCodes: newApprovedServices,
			approvedTeethFdi: newApprovedTeeth,
			approvedDiagnosisCodes: newApprovedDiagnoses,
			curatorFullName: newCuratorName.trim() || null,
			curatorPhone: newCuratorPhone.trim() || null,
			notes: newNotes.trim(),
			status: "active" as const,
		};

		setIsSaving(true);
		try {
			const res = await fetch("/api/insurance/guarantee-letters", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => null);
				throw new Error(errData?.message || `Ошибка сервера (${res.status})`);
			}

			const created = await res.json();
			const mappedLetter = mapBackendLetterToPatientGuaranteeLetter(created);

			setLetters((prev) => [mappedLetter, ...prev.filter((l) => l.id !== mappedLetter.id)]);
			setSelectedLetterId(mappedLetter.id);
			if (onSaveLetter) {
				onSaveLetter(mappedLetter);
			}

			showToast(
				`Гарантийное письмо № ${mappedLetter.letterNumber} (${mappedLetter.insurerName}) успешно сохранено в БД`,
				"success",
			);
			setActiveTab("list");
		} catch (err: any) {
			showToast(err.message || "Не удалось сохранить гарантийное письмо в БД", "error");
		} finally {
			setIsSaving(false);
		}
	};

	// ------------------------------------------------------------------------
	// РАСЧЕТ СПЛИТ-КАЛЬКУЛЯТОРА ВИЗИТА (КОПЕЕЧНЫЙ БАЛАНС)
	// ------------------------------------------------------------------------
	const splitCalculationResults = useMemo(() => {
		if (!selectedLetter) {
			const total = billItems.reduce((acc, item) => acc + item.unitPriceKopecks * item.quantity, 0);
			if (isEmergencyCare) {
				return {
					lineResults: billItems.map((item) => ({
						item,
						lineTotalKopecks: item.unitPriceKopecks * item.quantity,
						dmsCoveredKopecks: item.unitPriceKopecks * item.quantity,
						patientCoPayKopecks: 0,
						isApproved: true,
						reason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					})),
					totalBillKopecks: total,
					totalDmsCoveredKopecks: total,
					totalPatientCoPayKopecks: 0,
					remainingLetterKopecks: 0,
					excessAmountKopecks: 0,
					isBalanced: true,
					warningMessage: "Требуется досылка гарантийного письма ДМС",
				};
			}
			return {
				lineResults: billItems.map((item) => ({
					item,
					lineTotalKopecks: item.unitPriceKopecks * item.quantity,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: item.unitPriceKopecks * item.quantity,
					isApproved: false,
					reason: "Гарантийное письмо не прикреплено. Для экстренной помощи включите режим «Острая боль» или прикрепите полис в 1 клик.",
				})),
				totalBillKopecks: total,
				totalDmsCoveredKopecks: 0,
				totalPatientCoPayKopecks: total,
				remainingLetterKopecks: 0,
				excessAmountKopecks: 0,
				isBalanced: true,
			};
		}

		let availableLetterLimitKop = Math.max(
			0,
			selectedLetter.maxCoverageKopecks - selectedLetter.usedAmountKopecks,
		);

		let totalBillKop = 0;
		let totalDmsCoveredKop = 0;
		let totalPatientCoPayKop = 0;

		const lineResults = billItems.map((item) => {
			const lineTotalKop = item.unitPriceKopecks * Math.max(1, item.quantity);
			totalBillKop += lineTotalKop;

			// 1. Проверка исключений (Zoom, виниры, импланты)
			const exclusionCheck = isServiceExcludedByDmsRules(
				item.serviceCode804n,
				item.serviceName,
				"base",
			);
			const isExcluded = exclusionCheck.isExcluded;

			// 2. Проверка согласования зуба
			const toothApproved =
				!item.toothNumber ||
				selectedLetter.approvedTeethFdi.length === 0 ||
				selectedLetter.approvedTeethFdi.some((t) => t === item.toothNumber || t.replace(".", "") === item.toothNumber);

			// 3. Проверка согласования кода услуги
			const serviceApproved =
				selectedLetter.approvedServiceCodes804n.length === 0 ||
				selectedLetter.approvedServiceCodes804n.some((c) => item.serviceCode804n.startsWith(c));

			if (isExcluded) {
				if (isEmergencyCare) {
					totalDmsCoveredKop += lineTotalKop;
					return {
						item,
						lineTotalKopecks: lineTotalKop,
						dmsCoveredKopecks: lineTotalKop,
						patientCoPayKopecks: 0,
						isApproved: true,
						reason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					};
				}
				totalPatientCoPayKop += lineTotalKop;
				return {
					item,
					lineTotalKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: lineTotalKop,
					isApproved: false,
					reason: exclusionCheck.reason || "Услуга входит в стандартные исключения ДМС (100% сооплата пациентом)",
				};
			}

			if (!toothApproved) {
				if (isEmergencyCare) {
					totalDmsCoveredKop += lineTotalKop;
					return {
						item,
						lineTotalKopecks: lineTotalKop,
						dmsCoveredKopecks: lineTotalKop,
						patientCoPayKopecks: 0,
						isApproved: true,
						reason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					};
				}
				totalPatientCoPayKop += lineTotalKop;
				return {
					item,
					lineTotalKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: lineTotalKop,
					isApproved: false,
					reason: `Зуб ${item.toothNumber} не входит в согласованный перечень гарантийного письма № ${selectedLetter.letterNumber}`,
				};
			}

			if (!serviceApproved) {
				if (isEmergencyCare) {
					totalDmsCoveredKop += lineTotalKop;
					return {
						item,
						lineTotalKopecks: lineTotalKop,
						dmsCoveredKopecks: lineTotalKop,
						patientCoPayKopecks: 0,
						isApproved: true,
						reason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					};
				}
				totalPatientCoPayKop += lineTotalKop;
				return {
					item,
					lineTotalKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: lineTotalKop,
					isApproved: false,
					reason: `Код услуги ${item.serviceCode804n} не согласован по данному ГП`,
				};
			}

			// 4. Франшиза
			let franchiseDeductionKop = 0;
			if (selectedLetter.franchisePct > 0) {
				franchiseDeductionKop = Math.round(lineTotalKop * (selectedLetter.franchisePct / 100));
			}

			const potentialDmsCovered = Math.max(0, lineTotalKop - franchiseDeductionKop);
			let actualDmsCovered = 0;

			if (availableLetterLimitKop >= potentialDmsCovered) {
				actualDmsCovered = potentialDmsCovered;
				availableLetterLimitKop -= potentialDmsCovered;
			} else if (availableLetterLimitKop > 0) {
				if (isEmergencyCare) {
					actualDmsCovered = potentialDmsCovered;
					availableLetterLimitKop = 0;
				} else {
					actualDmsCovered = availableLetterLimitKop;
					availableLetterLimitKop = 0;
				}
			} else {
				if (isEmergencyCare) {
					actualDmsCovered = potentialDmsCovered;
				} else {
					actualDmsCovered = 0;
				}
			}

			const patientPaidKop = lineTotalKop - actualDmsCovered;
			totalDmsCoveredKop += actualDmsCovered;
			totalPatientCoPayKop += patientPaidKop;

			let reason = "100% покрыто страховой по ГП";
			if (isEmergencyCare && (actualDmsCovered === lineTotalKop || franchiseDeductionKop > 0)) {
				reason = "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС";
			} else if (franchiseDeductionKop > 0 && actualDmsCovered > 0) {
				reason = `Покрыто с учетом франшизы ${selectedLetter.franchisePct}% (${formatRubKopecks(franchiseDeductionKop / 100)})`;
			} else if (actualDmsCovered < potentialDmsCovered && actualDmsCovered > 0) {
				reason = `Частично покрыто: исчерпан лимит ГП. Остаток доплачивает пациент`;
			} else if (actualDmsCovered === 0) {
				reason = `Лимит ГП полностью исчерпан. Оплата пациентом`;
			}

			return {
				item,
				lineTotalKopecks: lineTotalKop,
				dmsCoveredKopecks: actualDmsCovered,
				patientCoPayKopecks: patientPaidKop,
				isApproved: true,
				reason,
			};
		});

		const isBalanced = totalBillKop === totalDmsCoveredKop + totalPatientCoPayKop;
		const excessAmountKop = Math.max(0, totalBillKop - totalDmsCoveredKop);

		return {
			lineResults,
			totalBillKopecks: totalBillKop,
			totalDmsCoveredKopecks: totalDmsCoveredKop,
			totalPatientCoPayKopecks: totalPatientCoPayKop,
			remainingLetterKopecks: availableLetterLimitKop,
			excessAmountKopecks: excessAmountKop,
			isBalanced,
			warningMessage: (isEmergencyCare || !selectedLetter || excessAmountKop > 0) ? "Требуется досылка гарантийного письма ДМС" : undefined,
		};
	}, [selectedLetter, billItems, isEmergencyCare]);

	// Применить расчет сплита к приему
	const handleApplySplit = () => {
		const targetLetterId = selectedLetter?.id || "emergency_pending_letter";
		if (onApplySplitCalculation) {
			onApplySplitCalculation({
				letterId: targetLetterId,
				totalBillKopecks: splitCalculationResults.totalBillKopecks,
				dmsCoveredKopecks: isEmergencyCare && splitCalculationResults.totalDmsCoveredKopecks === 0
					? splitCalculationResults.totalBillKopecks
					: splitCalculationResults.totalDmsCoveredKopecks,
				patientCoPayKopecks: isEmergencyCare && splitCalculationResults.totalDmsCoveredKopecks === 0
					? 0
					: splitCalculationResults.totalPatientCoPayKopecks,
				warning: (isEmergencyCare || !selectedLetter) ? "Требуется досылка гарантийного письма ДМС" : undefined,
			});
		}
		showToast(
			isEmergencyCare || !selectedLetter
				? "Экстренный приём применён: Требуется досылка гарантийного письма ДМС"
				: `Сплит-расчет применен: ДМС ${formatRubKopecks(splitCalculationResults.totalDmsCoveredKopecks / 100)}, Пациент ${formatRubKopecks(splitCalculationResults.totalPatientCoPayKopecks / 100)}`,
			"success",
		);
		onClose();
	};

	return createPortal(
		<div className="dms-hub-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-hub-window" onClick={(e) => e.stopPropagation()}>
				{/* 1. Header */}
				<div className="dms-hub-header">
					<div className="dms-hub-title-group">
						<div className="dms-hub-icon-badge">
							<FileCheck size={26} />
						</div>
						<div>
							<h2 className="dms-hub-title">
								Гарантийные письма ДМС: {patient.fullName}
							</h2>
							<div className="dms-hub-subtitle">
								Полис: <strong>{patient.policyNumber || "Не указан"}</strong> • Страховщик: {patient.insuranceCompany || "ДМС РФ"} • Тел: {patient.phone || "—"}
							</div>
						</div>
					</div>

					<button
						type="button"
						className="dms-action-btn dms-action-btn-secondary dms-action-btn-icon-only"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* 2. Tabs Navigation */}
				<div style={{ padding: "12px 24px 0", background: "var(--paper, #ffffff)" }}>
					<div className="dms-tabs-nav">
						<button
							type="button"
							className={`dms-tab-button ${activeTab === "list" ? "active" : ""}`}
							onClick={() => setActiveTab("list")}
						>
							<FileText size={18} />
							Активные и архивные письма ({letters.length})
						</button>

						<button
							type="button"
							className={`dms-tab-button ${activeTab === "new_letter" ? "active" : ""}`}
							onClick={() => setActiveTab("new_letter")}
						>
							<FilePlus2 size={18} />
							Привязать новое гарантийное письмо
						</button>

						<button
							type="button"
							className={`dms-tab-button ${activeTab === "split_calc" ? "active" : ""}`}
							onClick={() => setActiveTab("split_calc")}
						>
							<Calculator size={18} />
							Сплит-калькулятор счета визита
						</button>
					</div>
				</div>

				{/* 3. Body */}
				<div className="dms-hub-body">
					{/* ЭКСПРЕСС-ПАНЕЛЬ: 1-КЛИК ПРИКРЕПЛЕНИЕ ДМС И СВОБОДА ЭКСТРЕННОГО ПРИЁМА */}
					<div
						style={{
							background: "var(--paper, #ffffff)",
							border: isEmergencyCare
								? "1px solid var(--warn-fg, #d97706)"
								: "1px solid var(--teal, #0d9488)",
							borderRadius: "12px",
							padding: "12px 16px",
							marginBottom: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								flexWrap: "wrap",
								gap: "8px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Zap size={18} style={{ color: "var(--teal, #0d9488)" }} />
								<span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
									1-Клик прикрепление ДМС (без бюрократии)
								</span>
							</div>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
									padding: "4px 10px",
									borderRadius: "8px",
									background: isEmergencyCare ? "rgba(245, 158, 11, 0.15)" : "var(--surface, #f8fafc)",
									border: isEmergencyCare ? "1px solid var(--warn-fg, #d97706)" : "1px solid var(--line, #e2e8f0)",
									fontWeight: 600,
									fontSize: "0.8125rem",
								}}
							>
								<input
									type="checkbox"
									checked={isEmergencyCare}
									onChange={(e) => setIsEmergencyCare(e.target.checked)}
									style={{ width: "16px", height: "16px", cursor: "pointer" }}
								/>
								<span style={{ color: isEmergencyCare ? "var(--warn-fg, #d97706)" : "inherit" }}>
									⚡ Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора)
								</span>
							</label>
						</div>

						{isEmergencyCare && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "8px 12px",
									borderRadius: "8px",
									background: "rgba(245, 158, 11, 0.1)",
									color: "var(--warn-fg, #d97706)",
									fontSize: "0.8125rem",
									fontWeight: 600,
								}}
							>
								<AlertTriangle size={16} />
								<span>
									Мандат 8e: Задержка гарантийного письма ДМС не блокирует приём. Устное подтверждение куратора получено, гарантия в пути.
								</span>
							</div>
						)}

						<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>
								Топ-страховщики:
							</span>
							{[
								{ key: "sogaz", name: "СОГАЗ" },
								{ key: "ingosstrakh", name: "Ингосстрах" },
								{ key: "reso", name: "РЕСО-Гарантия" },
								{ key: "alfastrakh", name: "АльфаСтрахование" },
							].map((ins) => (
								<button
									key={ins.key}
									type="button"
									onClick={() => setNewInsurerKey(ins.key)}
									className={`dms-action-btn dms-btn-dense ${
										newInsurerKey === ins.key
											? "dms-action-btn-primary"
											: "dms-action-btn-secondary"
									}`}
									style={{ fontSize: "0.8125rem", padding: "4px 10px" }}
								>
									{newInsurerKey === ins.key && <Check size={13} />}
									{ins.name}
								</button>
							))}
						</div>

						<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
							<input
								type="text"
								value={quickPolicyNumber}
								onChange={(e) => setQuickPolicyNumber(e.target.value)}
								placeholder="Номер полиса ДМС (например, СГЗ-2026-77892)"
								className="dms-control-input"
								style={{ flex: 1, minWidth: "220px", height: "36px" }}
							/>
							<button
								type="button"
								onClick={() => handleQuickAttachPolicy(newInsurerKey, quickPolicyNumber)}
								disabled={isSaving}
								className="dms-action-btn dms-action-btn-primary dms-btn-dense"
								style={{ height: "36px", whiteSpace: "nowrap" }}
							>
								{isSaving ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Zap size={15} />
								)}
								⚡ Прикрепить полис в 1 клик
							</button>
						</div>
					</div>

					{/* ==============================================================
					    ВКЛАДКА 1: СПИСОК ГАРАНТИЙНЫХ ПИСЕМ С ПРОГРЕСС-БАРОМ
					   ============================================================== */}
					{activeTab === "list" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700 }}>
										Гарантийные письма пациента
									</h3>
									<p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Контроль лимитов страхового покрытия, согласованных зубов и сроков действия
									</p>
								</div>

								<button
									type="button"
									className="dms-action-btn dms-action-btn-primary dms-btn-dense"
									onClick={() => setActiveTab("new_letter")}
								>
									<Plus size={16} />
									Добавить ГП
								</button>
							</div>

							{isLoading ? (
								<div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted, #64748b)" }}>
									<Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px", display: "block" }} />
									<div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Загрузка гарантийных писем из базы данных...</div>
								</div>
							) : letters.length === 0 ? (
								<div style={{ padding: "48px 24px", textAlign: "center", background: "var(--surface, #f8fafc)", border: "1px dashed var(--line, #e2e8f0)", borderRadius: "14px" }}>
									<Shield size={36} style={{ margin: "0 auto 12px", color: "var(--muted, #94a3b8)", display: "block" }} />
									<div style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "4px" }}>
										Гарантийных писем пока нет
									</div>
									<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", margin: "0 0 16px" }}>
										У пациента не привязано ни одного гарантийного письма ДМС в клинике.
									</p>
									<button
										type="button"
										className="dms-action-btn dms-action-btn-primary dms-btn-dense"
										onClick={() => setActiveTab("new_letter")}
									>
										<Plus size={16} /> Привязать первое ГП
									</button>
								</div>
							) : (
								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
									{letters.map((letter) => {
									const usedPct = letter.maxCoverageKopecks > 0
										? Math.min(100, Math.round((letter.usedAmountKopecks / letter.maxCoverageKopecks) * 100))
										: 0;

									// Цветовая градация: Зеленый (<80%), Желтый (80-99%), Красный (>=100%)
									const progressColorClass =
										usedPct >= 100 ? "red" : usedPct >= 80 ? "yellow" : "green";

									const remainingRub = Math.max(0, (letter.maxCoverageKopecks - letter.usedAmountKopecks) / 100);
									const isSelected = letter.id === selectedLetterId;

									return (
										<div
											key={letter.id}
											className={`dms-letter-card ${isSelected ? "selected-for-split" : ""}`}
										>
											<div className="dms-letter-header">
												<div>
													<div className="dms-letter-number">
														<Shield size={18} className="text-teal-600" />
														{letter.letterNumber}
													</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
														{letter.insurerName} • Полис: {letter.policyNumber}
													</div>
												</div>

												<span
													className={`dms-status-badge ${
														letter.status === "active"
															? "dms-status-active"
															: letter.status === "exhausted"
																? "dms-status-exhausted"
																: "dms-status-expired"
													}`}
												>
													{letter.status === "active" ? "Активно" : letter.status === "exhausted" ? "Исчерпано" : "Истекло"}
												</span>
											</div>

											{/* Прогресс-бар расходования лимита */}
											<div className="dms-progress-container">
												<div className="dms-progress-meta">
													<span style={{ fontWeight: 600, color: "var(--muted, #64748b)" }}>
														Израсходовано: {formatRubKopecks(letter.usedAmountKopecks / 100)} ({usedPct}%)
													</span>
													<span style={{ fontWeight: 800, color: progressColorClass === "red" ? "var(--bad-fg, #dc2626)" : progressColorClass === "yellow" ? "var(--warn-fg, #d97706)" : "var(--ok-fg, #059669)" }}>
														Остаток: {formatRubKopecks(remainingRub)}
													</span>
												</div>
												<div className="dms-progress-track">
													<div
														className={`dms-progress-fill ${progressColorClass}`}
														style={{ width: `${usedPct}%` }}
													/>
												</div>
												<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)", display: "flex", justifyContent: "space-between" }}>
													<span>Лимит: {formatRubKopecks(letter.maxCoverageKopecks / 100)}</span>
													<span>Действует по: {letter.validUntil}</span>
												</div>
											</div>

											{/* Согласованные зубы FDI */}
											<div>
												<div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
													Согласованные зубы (FDI):
												</div>
												<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
													{letter.approvedTeethFdi.length > 0 ? (
														letter.approvedTeethFdi.map((t) => (
															<span key={t} className="dms-tooth-chip selected" style={{ minWidth: "30px", minHeight: "26px", fontSize: "0.75rem", padding: "2px 6px" }}>
																{t}
															</span>
														))
													) : (
														<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", fontStyle: "italic" }}>
															Все зубы без ограничений
														</span>
													)}
												</div>
											</div>

											{/* Согласованные услуги 804н */}
											<div>
												<div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "4px" }}>
													Разрешенные услуги (Приказ 804н):
												</div>
												<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
													{letter.approvedServiceCodes804n.map((code) => (
														<span key={code} style={{ fontSize: "0.6875rem", fontFamily: "monospace", fontWeight: 700, background: "var(--surface, #f1f5f9)", padding: "2px 6px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)" }}>
															{code}
														</span>
													))}
												</div>
											</div>

											{/* Контакты куратора */}
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<span>Куратор: <strong>{letter.curatorFullName}</strong></span>
												<span>{letter.curatorPhone}</span>
											</div>

											{/* Кнопка выбора для сплит-расчета */}
											<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
												<button
													type="button"
													className={`dms-action-btn ${isSelected ? "dms-action-btn-primary" : "dms-action-btn-secondary"} dms-btn-dense`}
													style={{ flex: 1 }}
													onClick={() => {
														setSelectedLetterId(letter.id);
														if (onSelectLetterForVisit) {
															onSelectLetterForVisit(letter);
														}
														setActiveTab("split_calc");
													}}
												>
													<Calculator size={15} />
													{isSelected ? "Выбрано для сплита" : "Использовать для расчета"}
												</button>
											</div>
										</div>
									);
								})}
							</div>
						)}
						</div>
					)}

					{/* ==============================================================
					    ВКЛАДКА 2: ФОРМА ПРИВЯЗКИ НОВОГО ГАРАНТИЙНОГО ПИСЬМА
					   ============================================================== */}
					{activeTab === "new_letter" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
							<div className="dms-panel">
								<h3 className="dms-panel-title">
									<Shield size={18} className="text-teal-600" />
									Реквизиты гарантийного письма и параметры полиса ДМС
								</h3>

								<div className="dms-form-grid-3">
									<div className="dms-input-group">
										<label htmlFor={insurerSelectId} className="dms-input-label">Страховая компания *</label>
										<select
											id={insurerSelectId}
											value={newInsurerKey}
											onChange={(e) => setNewInsurerKey(e.target.value)}
											className="dms-control-select"
										>
											{RUSSIAN_DMS_INSURERS.map((ins) => (
												<option key={ins.key} value={ins.key}>
													{ins.shortName} ({ins.fullName})
												</option>
											))}
										</select>
									</div>

									<div className="dms-input-group">
										<label htmlFor={policyNumberInputId} className="dms-input-label">Номер полиса ДМС *</label>
										<input
											id={policyNumberInputId}
											type="text"
											value={newPolicyNumber}
											onChange={(e) => setNewPolicyNumber(e.target.value)}
											className="dms-control-input"
											placeholder="СГЗ-77-000000"
										/>
									</div>

									<div className="dms-input-group">
										<label htmlFor={letterNumberInputId} className="dms-input-label">Номер гарантийного письма *</label>
										<input
											id={letterNumberInputId}
											type="text"
											value={newLetterNumber}
											onChange={(e) => setNewLetterNumber(e.target.value)}
											className="dms-control-input font-bold"
										/>
									</div>
								</div>

								<div className="dms-form-grid-3">
									<div className="dms-input-group">
										<label htmlFor={issueDateInputId} className="dms-input-label">Дата выдачи письма</label>
										<input
											id={issueDateInputId}
											type="date"
											value={newIssueDate}
											onChange={(e) => setNewIssueDate(e.target.value)}
											className="dms-control-input"
										/>
									</div>

									<div className="dms-input-group">
										<label htmlFor={validFromInputId} className="dms-input-label">Действует с</label>
										<input
											id={validFromInputId}
											type="date"
											value={newValidFrom}
											onChange={(e) => setNewValidFrom(e.target.value)}
											className="dms-control-input"
										/>
									</div>

									<div className="dms-input-group">
										<label htmlFor={validUntilInputId} className="dms-input-label">Действует по (срок окончания)</label>
										<input
											id={validUntilInputId}
											type="date"
											value={newValidUntil}
											onChange={(e) => setNewValidUntil(e.target.value)}
											className="dms-control-input"
										/>
									</div>
								</div>

								<div className="dms-form-grid-2">
									<div className="dms-input-group">
										<label htmlFor={maxLimitInputId} className="dms-input-label">Лимит страхового покрытия (₽) *</label>
										<input
											id={maxLimitInputId}
											type="number"
											min="0"
											step="1000"
											value={newMaxCoverageRub}
											onChange={(e) => setNewMaxCoverageRub(Math.max(0, Number(e.target.value) || 0))}
											className="dms-control-input font-mono font-bold text-lg"
										/>
									</div>

									<div className="dms-input-group">
										<label htmlFor={franchisePctInputId} className="dms-input-label">Франшиза сооплаты пациента (%)</label>
										<input
											id={franchisePctInputId}
											type="number"
											min="0"
											max="100"
											value={newFranchisePct}
											onChange={(e) => setNewFranchisePct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
											className="dms-control-input font-mono"
											placeholder="0% — 100%"
										/>
									</div>
								</div>
							</div>

							{/* 2. Зубная формула FDI для согласования */}
							<div className="dms-panel">
								<h3 className="dms-panel-title">
									<CheckCircle2 size={18} className="text-teal-600" />
									Разрешенные зубы по гарантийному письму (Зубная формула FDI)
								</h3>
								<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
									Кликните по номеру зуба для добавления/удаления из согласованного списка письма
								</p>

								<div className="dms-fdi-chart">
									<div style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
										ВЕРХНЯЯ ЧЕЛЮСТЬ (UPPER JAW)
									</div>
									<div className="dms-fdi-jaw-row">
										{FDI_ADULT_TEETH_UPPER.map((tooth) => {
											const isSelected = newApprovedTeeth.includes(tooth);
											return (
												<button
													key={tooth}
													type="button"
													className={`dms-tooth-chip ${isSelected ? "selected" : ""}`}
													onClick={() => toggleTooth(tooth)}
												>
													{tooth}
												</button>
											);
										})}
									</div>

									<div style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 700, color: "var(--muted, #64748b)", marginTop: "8px" }}>
										НИЖНЯЯ ЧЕЛЮСТЬ (LOWER JAW)
									</div>
									<div className="dms-fdi-jaw-row">
										{FDI_ADULT_TEETH_LOWER.map((tooth) => {
											const isSelected = newApprovedTeeth.includes(tooth);
											return (
												<button
													key={tooth}
													type="button"
													className={`dms-tooth-chip ${isSelected ? "selected" : ""}`}
													onClick={() => toggleTooth(tooth)}
												>
													{tooth}
												</button>
											);
										})}
									</div>
								</div>
							</div>

							{/* 3. Диагнозы МКБ-10 и услуги 804н */}
							<div className="dms-panel">
								<h3 className="dms-panel-title">
									<FileCheck size={18} className="text-emerald-600" />
									Согласованные диагнозы (МКБ-10) и услуги Номенклатуры 804н
								</h3>

								{/* МКБ-10 */}
								<div>
									<div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "8px" }}>
										Разрешенные диагнозы по МКБ-10:
									</div>
									<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
										{COMMON_DENTAL_ICD10_DIAGNOSES.map((diag) => {
											const isChecked = newApprovedDiagnoses.includes(diag.code);
											return (
												<button
													key={diag.code}
													type="button"
													className={`dms-action-btn ${isChecked ? "dms-action-btn-primary" : "dms-action-btn-secondary"} dms-btn-dense`}
													onClick={() => toggleDiagnosis(diag.code)}
												>
													{isChecked && <Check size={14} />}
													<strong>{diag.code}</strong> — {diag.title}
												</button>
											);
										})}
									</div>
								</div>

								{/* Поиск и выбор услуг 804н */}
								<div style={{ marginTop: "12px" }}>
									<label htmlFor={serviceSearchInputId} className="dms-input-label">
										Поиск и добавление услуг Номенклатуры Минздрава РФ № 804н:
									</label>
									<input
										id={serviceSearchInputId}
										type="text"
										placeholder="Поиск по коду (A16.07...) или названию (пломба, кариес, анестезия)..."
										value={serviceSearchTerm}
										onChange={(e) => setServiceSearchTerm(e.target.value)}
										className="dms-control-input"
										style={{ marginTop: "4px" }}
									/>

									<div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", maxHeight: "180px", overflowY: "auto" }}>
										{filteredCatalog804n.map((srv) => {
											const isSelected = newApprovedServices.includes(srv.code);
											return (
												<div
													key={srv.code}
													style={{
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center",
														padding: "8px 12px",
														borderRadius: "10px",
														background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.08))" : "var(--surface, #f8fafc)",
														border: `1px solid ${isSelected ? "var(--teal, #0d9488)" : "var(--line, #e2e8f0)"}`,
													}}
												>
													<div>
														<span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
															{srv.code}
														</span>
														<span style={{ marginLeft: "8px", fontSize: "0.8125rem" }}>{srv.name}</span>
													</div>

													<button
														type="button"
														className={`dms-action-btn ${isSelected ? "dms-action-btn-primary" : "dms-action-btn-secondary"} dms-btn-dense`}
														onClick={() => toggleServiceCode(srv.code)}
													>
														{isSelected ? (
															<>
																<Check size={14} /> Согласовано
															</>
														) : (
															<>
																<Plus size={14} /> Добавить
															</>
														)}
													</button>
												</div>
											);
										})}
									</div>
								</div>
							</div>

							{/* Контакты куратора */}
							<div className="dms-form-grid-2">
								<div className="dms-input-group">
									<label htmlFor={curatorNameInputId} className="dms-input-label">ФИО Куратора страховой компании</label>
									<input
										id={curatorNameInputId}
										type="text"
										value={newCuratorName}
										onChange={(e) => setNewCuratorName(e.target.value)}
										className="dms-control-input"
									/>
								</div>

								<div className="dms-input-group">
									<label htmlFor={curatorPhoneInputId} className="dms-input-label">Телефон куратора</label>
									<input
										id={curatorPhoneInputId}
										type="text"
										value={newCuratorPhone}
										onChange={(e) => setNewCuratorPhone(e.target.value)}
										className="dms-control-input"
									/>
								</div>
							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
								<button
									type="button"
									className="dms-action-btn dms-action-btn-secondary"
									onClick={() => setActiveTab("list")}
								>
									Отмена
								</button>

								<button
									type="button"
									className="dms-action-btn dms-action-btn-primary"
									onClick={handleSaveNewLetter}
									disabled={isSaving}
								>
									{isSaving ? (
										<>
											<Loader2 size={18} className="animate-spin" />
											Сохранение в базу данных...
										</>
									) : (
										<>
											<FileCheck size={18} />
											Привязать гарантийное письмо к пациенту
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* ==============================================================
					    ВКЛАДКА 3: СПЛИТ-КАЛЬКУЛЯТОР СЧЕТА ПРИ ОПЛАТЕ ПО ДМС
					   ============================================================== */}
					{activeTab === "split_calc" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							{/* Выбранное письмо */}
							<div style={{ background: "var(--teal-surface, rgba(13, 148, 136, 0.08))", border: "1px solid var(--teal, #0d9488)", borderRadius: "14px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
								<div>
									<div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--teal, #0d9488)", textTransform: "uppercase" }}>
										Активное гарантийное письмо для расчета:
									</div>
									<div style={{ fontSize: "1.0625rem", fontWeight: 800 }}>
										{selectedLetter ? `${selectedLetter.letterNumber} (${selectedLetter.insurerName})` : "Гарантийное письмо не выбрано"}
									</div>
									{selectedLetter && (
										<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
											Остаток лимита: <strong>{formatRubKopecks((selectedLetter.maxCoverageKopecks - selectedLetter.usedAmountKopecks) / 100)}</strong> • Франшиза: {selectedLetter.franchisePct}%
										</div>
									)}
								</div>

								<button
									type="button"
									className="dms-action-btn dms-action-btn-secondary dms-btn-dense"
									onClick={() => setActiveTab("list")}
								>
									Сменить письмо
								</button>
							</div>

							{/* Сводка сплит-расчета (KPI) */}
							<div className="dms-kpi-grid">
								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Сумма визита (Всего)</span>
									<span className="dms-kpi-val">{formatRubKopecks(splitCalculationResults.totalBillKopecks / 100)}</span>
									<span className="dms-kpi-sub">По прайсу клиники</span>
								</div>

								<div className="dms-kpi-card" style={{ borderColor: "rgba(13, 148, 136, 0.4)", background: "rgba(13, 148, 136, 0.04)" }}>
									<span className="dms-kpi-label" style={{ color: "var(--teal, #0d9488)" }}>
										Покрыто ДМС (Страховая)
									</span>
									<span className="dms-kpi-val" style={{ color: "var(--teal, #0d9488)" }}>
										{formatRubKopecks(splitCalculationResults.totalDmsCoveredKopecks / 100)}
									</span>
									<span className="dms-kpi-sub">К оплате страховой компанией</span>
								</div>

								<div className="dms-kpi-card" style={{ borderColor: "rgba(217, 119, 6, 0.4)", background: "rgba(217, 119, 6, 0.04)" }}>
									<span className="dms-kpi-label" style={{ color: "var(--warn-fg, #d97706)" }}>
										Доплата пациента (Copay)
									</span>
									<span className="dms-kpi-val" style={{ color: "var(--warn-fg, #d97706)" }}>
										{formatRubKopecks(splitCalculationResults.totalPatientCoPayKopecks / 100)}
									</span>
									<span className="dms-kpi-sub">Франшизы и исключения</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Остаток по ГП после визита</span>
									<span className="dms-kpi-val">
										{formatRubKopecks(splitCalculationResults.remainingLetterKopecks / 100)}
									</span>
									<span className="dms-kpi-sub">Доступно на следующие приемы</span>
								</div>
							</div>

							{/* Детализация строк визита */}
							<div className="dms-registry-table-wrap">
								<table className="dms-registry-table">
									<thead>
										<tr>
											<th>№</th>
											<th>Код 804н</th>
											<th>Услуга / Зуб</th>
											<th>Кол-во</th>
											<th style={{ textAlign: "right" }}>Цена</th>
											<th style={{ textAlign: "right" }}>Всего</th>
											<th style={{ textAlign: "right" }}>Покрыто ДМС</th>
											<th style={{ textAlign: "right" }}>Пациент (Copay)</th>
											<th>Обоснование распределения</th>
										</tr>
									</thead>
									<tbody>
										{splitCalculationResults.lineResults.map((r, idx) => (
											<tr key={r.item.id}>
												<td style={{ textAlign: "center" }}>{idx + 1}</td>
												<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
													{r.item.serviceCode804n}
												</td>
												<td>
													<div style={{ fontWeight: 500 }}>{r.item.serviceName}</div>
													{r.item.toothNumber && (
														<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Зуб {r.item.toothNumber}</span>
													)}
												</td>
												<td style={{ textAlign: "center" }}>{r.item.quantity}</td>
												<td style={{ textAlign: "right" }}>{formatRubKopecks(r.item.unitPriceKopecks / 100)}</td>
												<td style={{ textAlign: "right", fontWeight: 600 }}>{formatRubKopecks(r.lineTotalKopecks / 100)}</td>
												<td style={{ textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
													{formatRubKopecks(r.dmsCoveredKopecks / 100)}
												</td>
												<td style={{ textAlign: "right", fontWeight: 700, color: r.patientCoPayKopecks > 0 ? "var(--warn-fg, #d97706)" : "var(--muted, #64748b)" }}>
													{formatRubKopecks(r.patientCoPayKopecks / 100)}
												</td>
												<td style={{ fontSize: "0.75rem", color: r.isApproved ? "var(--ok-fg, #059669)" : "var(--warn-fg, #d97706)" }}>
													{r.reason}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="dms-registry-table-totals">
											<td colSpan={5} style={{ textAlign: "right", fontWeight: 800 }}>ИТОГО ПО СЧЕТУ:</td>
											<td style={{ textAlign: "right", fontWeight: 800 }}>
												{formatRubKopecks(splitCalculationResults.totalBillKopecks / 100)}
											</td>
											<td style={{ textAlign: "right", fontWeight: 800, color: "var(--teal, #0d9488)" }}>
												{formatRubKopecks(splitCalculationResults.totalDmsCoveredKopecks / 100)}
											</td>
											<td style={{ textAlign: "right", fontWeight: 800, color: "var(--warn-fg, #d97706)" }}>
												{formatRubKopecks(splitCalculationResults.totalPatientCoPayKopecks / 100)}
											</td>
											<td></td>
										</tr>
									</tfoot>
								</table>
							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
								<button
									type="button"
									className="dms-action-btn dms-action-btn-primary"
									onClick={handleApplySplit}
								>
									<CheckCircle2 size={18} />
									Применить сплит-расчет к оплате визита
								</button>
							</div>
						</div>
					)}
				</div>

				{/* 4. Footer */}
				<div className="dms-hub-footer">
					<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						Пациент: <strong>{patient.fullName}</strong> • Доступно писем: <strong>{letters.length}</strong>
					</div>

					<div style={{ display: "flex", gap: "10px" }}>
						<button
							type="button"
							className="dms-action-btn dms-action-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
