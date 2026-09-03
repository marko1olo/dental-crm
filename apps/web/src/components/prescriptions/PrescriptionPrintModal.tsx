import {
	CONTROLLED_DRUG_PRESETS,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PREFERENTIAL_BENEFIT_CATEGORIES,
	PREFERENTIAL_DRUG_PRESETS,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	type DentalPrescriptionDrugPreset,
	type Form107_1uPayload,
	type Form148_1u04lPayload,
	type Form148_1u88Payload,
	type PrescriptionDoctorUkep,
	type PrescriptionDrugItem,
	calculatePrescriptionExpiration,
	generateForm148_1u88Payload,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
	renderForm148_1u04lHtml,
	renderForm148_1u88Html,
	renderPrescriptionUniversalHtml,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import {
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	FileCheck,
	FileText,
	Filter,
	Key,
	Lock,
	MapPin,
	Pill,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import type { DiaryState } from "../useVisitDiaryLogic";
import {
	getPersonalCertificates,
	signBase64WithCertificate,
	parseCryptoProError,
} from "../../utils/cryptoPro";

export type PrescriptionFormType = "107-1u" | "148-1u-88" | "148-1u-04l";

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export const DENTAL_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "post_extraction_surgery",
		label: "«После удаления / хирургии»",
		desc: "Амоксиклав 875/125 мг №14 + Нимесил 100 мг №10 + Супрастин 25 мг",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "suprastin_25"],
	},
	{
		id: "anti_inflammatory",
		label: "«Противовоспалительный»",
		desc: "Ибупрофен 400 мг №20 + Хлоргексидин 0.05% водный раствор 100 мл",
		drugIds: ["ibuprofen_400", "chlorhexidine_005"],
	},
	{
		id: "antiseptic_rinsing",
		label: "«Антисептический / полоскания»",
		desc: "Мирамистин 0.01% + Стоматофит",
		drugIds: ["miramistin_001", "stomatophyt_100"],
	},
	{
		id: "amoxi_1000_nimesil",
		label: "Амоксиклав 1000\u00A0мг + Нимесил 100\u00A0мг",
		desc: "Антибиотик 875/125\u00A0мг + НПВС 100\u00A0мг (Периодонтит / Хирургия)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100"],
	},
	{
		id: "nimesil_100",
		label: "Нимесил 100\u00A0мг (НПВП)",
		desc: "Rp: Gran. Nimesulidi 100 mg / По 1 пак. 2 раза в день при болях",
		drugIds: ["nimesulide_100"],
	},
	{
		id: "chlorhex_005",
		label: "Хлоргексидин 0.05\u00A0% (Антисептик)",
		desc: "Rp: Sol. Chlorhexidini bigluconatis 0.05% / Ротовые ванночки 3 раза в день",
		drugIds: ["chlorhexidine_005"],
	},
	{
		id: "cholisal",
		label: "Холисал гель",
		desc: "Стоматологический противовоспалительный гель",
		drugIds: ["cholisal_gel"],
	},
	{
		id: "periostitis_osteotropic",
		label: "«Периостит / Остеотропный комплекс»",
		desc: "Линкомицин 500 мг + Метронидазол 500 мг (Костная инфекция / Флюс)",
		drugIds: ["lincomycin_500", "metronidazole_500"],
	},
	{
		id: "pediatric_analgesic",
		label: "«Детский / Стоматит & Боль»",
		desc: "Ибупрофен 400 мг + Холисал гель стоматологический (Обезболивание слизистой)",
		drugIds: ["ibuprofen_400", "cholisal_gel"],
	},
];

export interface PrescriptionPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: {
		readonly id?: string | null;
		readonly fullName?: string | null;
		readonly birthDate?: string | null;
		readonly cardNumber?: string | null;
		readonly medicalCardNumber?: string | null;
		readonly passport?: string | null;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly gender?: string | null;
		readonly snils?: string | null;
		readonly omsPolicy?: string | null;
	} | null;
	readonly diary?: DiaryState | {
		readonly diagnosisIcd10?: string | null;
		readonly treatmentDescription?: string | null;
		readonly anamnesis?: string | null;
		readonly statusLocalis?: string | null;
	} | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly doctorSnils?: string | null;
	readonly clinicName?: string | null;
	readonly clinicAddress?: string | null;
	readonly clinicPhone?: string | null;
	readonly clinicOgrn?: string | null;
	readonly clinicInn?: string | null;
	readonly medicalLicenseNumber?: string | null;
	readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly onPrescriptionCreated?: (prescription: any) => void;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	doctorSnils,
	clinicName,
	clinicAddress,
	clinicPhone,
	clinicOgrn,
	clinicInn,
	medicalLicenseNumber = "ЛО41-01137-77/00368421",
	initialSelectedDrugIds,
	onPrescriptionCreated,
}) => {
	const [activeForm, setActiveForm] = useState<PrescriptionFormType>("107-1u");
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
	const [customSeriesNumber, setCustomSeriesNumber] = useState<string>("");
	const [prescriptionDate, setPrescriptionDate] = useState<string>("");
	const [validityDays, setValidityDays] = useState<"15" | "30" | "60" | "365">("60");
	const [isChronicSpecialCare, setIsChronicSpecialCare] = useState<boolean>(false);
	const [chronicPeriodicity, setChronicPeriodicity] = useState<string>("ежемесячно (1 раз в 30 дней)");
	const [patientAddress, setPatientAddress] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
	const [withStampAndSignature, setWithStampAndSignature] = useState<boolean>(true);

	// Preferential details state (Form 148-1/u-04(l))
	const [preferentialBenefitCode, setPreferentialBenefitCode] = useState<string>("081");
	const [preferentialDiscount, setPreferentialDiscount] = useState<number>(100);
	const [patientSnils, setPatientSnils] = useState<string>("");
	const [patientOmsPolicy, setPatientOmsPolicy] = useState<string>("");
	const [fundingSource, setFundingSource] = useState<"federal" | "regional">("federal");

	// Doctor UKEP state
	const [isUkepSigned, setIsUkepSigned] = useState<boolean>(false);
	const [ukepSignature, setUkepSignature] = useState<PrescriptionDoctorUkep | null>(null);
	const [isSigningUkep, setIsSigningUkep] = useState<boolean>(false);

	// Custom drug item draft
	const [customTradeName, setCustomTradeName] = useState<string>("");
	const [customLatinRp, setCustomLatinRp] = useState<string>("");
	const [customDispense, setCustomDispense] = useState<string>("");
	const [customSigna, setCustomSigna] = useState<string>("");
	const [customDrugsList, setCustomDrugsList] = useState<PrescriptionDrugItem[]>([]);

	useEffect(() => {
		if (!isOpen) return;

		const today = new Date().toISOString().slice(0, 10);
		setPrescriptionDate(today);

		if (initialSelectedDrugIds && initialSelectedDrugIds.length > 0) {
			setSelectedDrugIds([...initialSelectedDrugIds]);
		} else {
			const icd = (diary?.diagnosisIcd10 || "K02.1").toUpperCase();
			const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
				d.recommendedForIcd10.some((code) => icd.startsWith(code)),
			);
			if (matching.length > 0) {
				setSelectedDrugIds(matching.slice(0, 2).map((d) => d.id));
			} else {
				setSelectedDrugIds(["nimesulide_100"]);
			}
		}

		const year = new Date().getFullYear();
		if (activeForm === "107-1u") {
			setCustomSeriesNumber(`РЕЦ-${year}-${Math.floor(1000 + Math.random() * 9000)}`);
			setValidityDays("60");
		} else if (activeForm === "148-1u-88") {
			setCustomSeriesNumber(`ПКУ-${year}-${Math.floor(100000 + Math.random() * 900000)}`);
			setValidityDays("15");
			setSelectedDrugIds(["tramadol_50"]);
		} else {
			setCustomSeriesNumber(`ЛЬГ-${year}-${Math.floor(100000 + Math.random() * 900000)}`);
			setValidityDays("30");
			setSelectedDrugIds(["metformin_1000"]);
		}

		setPatientAddress(patient?.address || "г. Москва, Ломоносовский пр-кт, д. 18, кв. 45");
		setPatientSnils(patient?.snils || "123-456-789 00");
		setPatientOmsPolicy(patient?.omsPolicy || "1234567890123456");
		setIsUkepSigned(false);
		setUkepSignature(null);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary?.diagnosisIcd10, activeForm, patient?.address, patient?.snils, patient?.omsPolicy, initialSelectedDrugIds, onClose]);

	const patientName = patient?.fullName || "Иванов Иван Иванович";
	const patientBirth = patient?.birthDate || "1988-05-14";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || "043/у-2026/891";
	const docName = doctorName || "Д-р Смирнова Анна Сергеевна";
	const docSpecialty = doctorSpecialty || "Врач-стоматолог терапевт-эндодонтист";
	const docSnils = doctorSnils || "123-456-789 00";
	const clinic = clinicName || "ООО «Денте Стоматология»";
	const address = clinicAddress || "г. Москва, Клинический переулок, д. 7";
	const phone = clinicPhone || "+7 (495) 777-22-11";
	const ogrn = clinicOgrn || "1207700123456";
	const inn = clinicInn || "7701234567";
	const licNum = medicalLicenseNumber || "ЛО-77-01-019845";

	const fullCatalog = useMemo(() => {
		if (activeForm === "148-1u-88") {
			return CONTROLLED_DRUG_PRESETS;
		}
		if (activeForm === "148-1u-04l") {
			return PREFERENTIAL_DRUG_PRESETS;
		}
		return DENTAL_PRESCRIPTION_DRUG_CATALOG;
	}, [activeForm]);

	const filteredCatalog = useMemo(() => {
		return fullCatalog.filter((drug) => {
			const matchesSearch =
				searchQuery === "" ||
				drug.tradeNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				drug.activeSubstanceRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				drug.latinRp.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory =
				categoryFilter === "all" || drug.category === categoryFilter;
			return matchesSearch && matchesCategory;
		});
	}, [fullCatalog, searchQuery, categoryFilter]);

	const toggleDrug = (id: string) => {
		if (activeForm === "148-1u-88") {
			// Form 148-1/u strictly permits max 1 item
			setSelectedDrugIds([id]);
			return;
		}
		setSelectedDrugIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 3) {
				return [...prev.slice(1), id];
			}
			return [...prev, id];
		});
	};

	const handleAddCustomDrug = () => {
		if (!customLatinRp.trim() || !customSigna.trim()) return;
		const newItem: PrescriptionDrugItem = {
			id: `custom-drug-${Date.now()}`,
			latinName: customLatinRp.startsWith("Rp.:") ? customLatinRp : `Rp.: ${customLatinRp}`,
			tradeName: customTradeName.trim() || "Индивидуальная пропись",
			form: "порошок/раствор",
			dosage: "по рецепту",
			quantity: "N. 1",
			dispenseLatin: customDispense.trim() || "D.t.d. N 1",
			signaRussian: customSigna.startsWith("S.") ? customSigna : `S. ${customSigna}`,
			category: "other",
		};
		setCustomDrugsList((prev) => [...prev, newItem]);
		setCustomLatinRp("");
		setCustomTradeName("");
		setCustomDispense("");
		setCustomSigna("");
		setIsAddingCustom(false);
	};

	const removeCustomDrug = (id: string) => {
		setCustomDrugsList((prev) => prev.filter((d) => d.id !== id));
	};

	const activeItems = useMemo<PrescriptionDrugItem[]>(() => {
		const fromCatalog: PrescriptionDrugItem[] = selectedDrugIds
			.map((id) => fullCatalog.find((d) => d.id === id))
			.filter((d): d is DentalPrescriptionDrugPreset => Boolean(d))
			.map((d, index) => ({
				id: `item-${index + 1}-${d.id}`,
				latinName: d.latinRp,
				tradeName: d.tradeNameRu,
				form: d.formRu,
				dosage: d.dosageRu,
				quantity: d.quantityLabel,
				dispenseLatin: d.dispenseLatin,
				signaRussian: d.signaRu,
				category: d.category,
			}));

		const combined = [...fromCatalog, ...customDrugsList];
		if (activeForm === "148-1u-88") {
			return combined.slice(0, 1);
		}
		return combined.slice(0, 3);
	}, [fullCatalog, selectedDrugIds, customDrugsList, activeForm]);

	// Live validity validation result
	const validityAudit = useMemo(() => {
		return verifyPrescriptionStatutoryValidity({
			formType: activeForm,
			prescriptionDate: prescriptionDate || new Date().toISOString().slice(0, 10),
			validityDays,
			isChronicSpecialCare,
			chronicPeriodicity,
			items: activeItems,
			patientAddress,
			preferentialDetails: {
				patientSnils,
				patientOmsPolicy,
			},
		});
	}, [activeForm, prescriptionDate, validityDays, isChronicSpecialCare, chronicPeriodicity, activeItems, patientAddress, patientSnils, patientOmsPolicy]);



	const generatePrintHtml = useCallback((): string => {
		if (activeForm === "107-1u") {
			const payload: Form107_1uPayload = {
				formNumber: "107-1/у",
				clinicLegalName: clinic,
				clinicAddress: address,
				clinicPhone: phone,
				clinicOgrn: ogrn,
				clinicInn: inn,
				medicalLicenseNumber: licNum,
				prescriptionSeriesNumber: customSeriesNumber,
				prescriptionDate: prescriptionDate,
				patientFullName: patientName,
				patientBirthDate: patientBirth,
				medicalCardNumber: patientCard,
				doctorFullName: docName,
				doctorSpecialty: docSpecialty,
				validityDays: validityDays === "30" ? "60" : validityDays,
				isChronicSpecialCare,
				chronicPeriodicity: isChronicSpecialCare ? chronicPeriodicity : undefined,
				items: activeItems.length > 0 ? activeItems : [
					{
						id: "fallback-1",
						latinName: "Rp.: Nimesulidi 100 mg",
						tradeName: "Нимесил",
						form: "гранулы",
						dosage: "100 мг",
						quantity: "N. 10",
						dispenseLatin: "D.t.d. N 10 in gran.",
						signaRussian: "S. По 1 пакетику 2 раза в день после еды при болях.",
						category: "nsaid",
					},
				],
				diagnosisIcd10Code: diary?.diagnosisIcd10 || "K02.1",
				ukepSignature: isUkepSigned ? ukepSignature : null,
				withStampAndSignature,
			};
			return renderForm107_1uHtml(payload);
		}

		if (activeForm === "148-1u-88") {
			const payload: Form148_1u88Payload = {
				formNumber: "148-1/у-88",
				clinicLegalName: clinic,
				clinicAddress: address,
				clinicPhone: phone,
				clinicOgrn: ogrn,
				clinicInn: inn,
				medicalLicenseNumber: licNum,
				prescriptionSeriesNumber: customSeriesNumber,
				prescriptionDate: prescriptionDate,
				patientFullName: patientName,
				patientBirthDate: patientBirth,
				patientAddress: patientAddress,
				medicalCardNumber: patientCard,
				doctorFullName: docName,
				doctorSpecialty: docSpecialty,
				headOfDepartmentFullName: "Д-р Кузнецов С.В.",
				validityDays: "15",
				items: activeItems.length > 0 ? [activeItems[0]!] : [
					{
						id: "fallback-pku",
						latinName: "Rp.: Tramadoli 50 mg",
						tradeName: "Трамадол",
						form: "капсулы",
						dosage: "50 мг",
						quantity: "N. 10",
						dispenseLatin: "D.t.d. N 10 in caps.",
						signaRussian: "S. По 1 капсуле при выраженном болевом синдроме.",
						category: "controlled_pku",
					},
				],
				diagnosisIcd10Code: diary?.diagnosisIcd10 || "K08.1",
				ukepSignature: isUkepSigned ? ukepSignature : null,
			};
			return renderForm148_1u88Html(payload);
		}

		// Form 148-1/u-04(l) Preferential
		const prefCat = PREFERENTIAL_BENEFIT_CATEGORIES.find((c) => c.code === preferentialBenefitCode);
		const payload: Form148_1u04lPayload = {
			formNumber: "148-1/у-04(л)",
			clinicLegalName: clinic,
			clinicAddress: address,
			clinicPhone: phone,
			clinicOgrn: ogrn,
			clinicInn: inn,
			medicalLicenseNumber: licNum,
			prescriptionSeriesNumber: customSeriesNumber,
			prescriptionDate: prescriptionDate,
			patientFullName: patientName,
			patientBirthDate: patientBirth,
			patientAddress: patientAddress,
			medicalCardNumber: patientCard,
			preferentialDetails: {
				preferentialBenefitCode: preferentialBenefitCode,
				preferentialBenefitNameRu: prefCat?.nameRu || "Инвалиды I группы",
				preferentialDiscountPercent: preferentialDiscount,
				patientSnils: patientSnils,
				patientOmsPolicy: patientOmsPolicy,
				fundingSource: fundingSource,
				medicalCardNumber: patientCard,
			},
			doctorFullName: docName,
			doctorSpecialty: docSpecialty,
			validityDays: validityDays,
			isChronicSpecialCare,
			chronicPeriodicity: isChronicSpecialCare ? chronicPeriodicity : undefined,
			items: activeItems.length > 0 ? activeItems : [
				{
					id: "fallback-pref",
					latinName: "Rp.: Tab. Metformini 1000 mg",
					tradeName: "Метформин",
					form: "таблетки",
					dosage: "1000 мг",
					quantity: "N. 60",
					dispenseLatin: "D.t.d. N 60 in tab.",
					signaRussian: "S. Внутрь по 1 таб. 2 раза в день.",
					category: "preferential_somatic",
				},
			],
			diagnosisIcd10Code: diary?.diagnosisIcd10 || "K02.1",
			ukepSignature: isUkepSigned ? ukepSignature : null,
		};
		return renderForm148_1u04lHtml(payload);
	}, [
		activeForm,
		clinic,
		address,
		phone,
		ogrn,
		inn,
		licNum,
		customSeriesNumber,
		prescriptionDate,
		patientName,
		patientBirth,
		patientCard,
		patientAddress,
		preferentialBenefitCode,
		preferentialDiscount,
		patientSnils,
		patientOmsPolicy,
		fundingSource,
		docName,
		docSpecialty,
		validityDays,
		isChronicSpecialCare,
		chronicPeriodicity,
		activeItems,
		diary?.diagnosisIcd10,
		isUkepSigned,
		ukepSignature,
		withStampAndSignature,
	]);

	// UKEP signing handler using CryptoPro CSP
	const handleSignUkep = async () => {
		setIsSigningUkep(true);
		try {
			const certs = await getPersonalCertificates();
			if (!certs || certs.length === 0) {
				throw new Error("В хранилище КриптоПро не найдено личных сертификатов ЭЦП врача.");
			}
			const targetCert = certs.find((c) => c.isGost && c.hasPrivateKey) || certs[0];
			if (!targetCert) {
				throw new Error("Не удалось выбрать сертификат для подписания.");
			}
			const contentToSign = btoa(unescape(encodeURIComponent(generatePrintHtml())));
			const signature = await signBase64WithCertificate(contentToSign, targetCert.thumbprint);

			const genuineUkep: PrescriptionDoctorUkep = {
				doctorFullName: targetCert.subjectName || docName,
				doctorSpecialty: docSpecialty,
				doctorSnils: docSnils,
				certificateSerialNumber:
					targetCert.serialNumber || targetCert.thumbprint.slice(0, 16).toUpperCase(),
				certificateThumbprint: targetCert.thumbprint,
				certificateIssuer:
					targetCert.issuerName || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
				certificateValidFrom: targetCert.validFrom || new Date().toISOString(),
				certificateValidTo:
					targetCert.validTo || new Date(Date.now() + 365 * 86400000).toISOString(),
				signedAt: new Date().toISOString(),
				cryptoSignaturePkcs7: signature,
				signatureAlgorithm: targetCert.algorithmName || "ГОСТ Р 34.10-2012 (256 бит)",
				egiszDocumentId: `EGISZ-RX-${Date.now().toString().slice(-6)}`,
				qrVerificationUrl: `https://egisz.rosminzdrav.ru/verify?rx=${customSeriesNumber}`,
			};
			setUkepSignature(genuineUkep);
			setIsUkepSigned(true);
			showToast("Рецептурный бланк успешно подписан УКЭП врача (КриптоПро)", "success");
		} catch (err) {
			const parsed = parseCryptoProError(err);
			showToast(parsed.userMessage, parsed.isCancellation ? "warning" : "error", 8000);
		} finally {
			setIsSigningUkep(false);
		}
	};

	const handlePrint = (customHtml?: string | unknown) => {
		const printHtml = typeof customHtml === "string" ? customHtml : generatePrintHtml();
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc =
			printFrame.contentWindow?.document || printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
				}, 1000);
			}, 250);
		}
	};

	const handleApplyAndPrint = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		setValidityDays("60");
		showToast(`Печать пакета ${preset.label}`, "info", 2000);

		const presetItems: PrescriptionDrugItem[] = preset.drugIds
			.map((id) => fullCatalog.find((d) => d.id === id))
			.filter((d): d is DentalPrescriptionDrugPreset => Boolean(d))
			.map((d, index) => ({
				id: `item-${index + 1}-${d.id}`,
				latinName: d.latinRp,
				tradeName: d.tradeNameRu,
				form: d.formRu,
				dosage: d.dosageRu,
				quantity: d.quantityLabel,
				dispenseLatin: d.dispenseLatin,
				signaRussian: d.signaRu,
				category: d.category,
			}));

		const instantPayload: Form107_1uPayload = {
			formNumber: "107-1/у",
			clinicLegalName: clinic,
			clinicAddress: address,
			clinicPhone: phone,
			clinicOgrn: ogrn,
			clinicInn: inn,
			medicalLicenseNumber: licNum,
			prescriptionSeriesNumber: customSeriesNumber,
			prescriptionDate: prescriptionDate || new Date().toISOString().slice(0, 10),
			patientFullName: patientName,
			patientBirthDate: patientBirth,
			medicalCardNumber: patientCard,
			doctorFullName: docName,
			doctorSpecialty: docSpecialty,
			validityDays: "60",
			isChronicSpecialCare: false,
			chronicPeriodicity: null,
			items: presetItems,
			diagnosisIcd10Code: diary?.diagnosisIcd10 || "K02.1",
			withStampAndSignature,
		};
		const html = renderForm107_1uHtml(instantPayload);
		handlePrint(html);
	};

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Печать рецептурного бланка"
			data-testid="prescription-print-modal"
		>
			<div className="flex flex-col w-full max-w-6xl max-h-[94vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ── Modal Header ── */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
							<Pill className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
									Рецептурный модуль Минздрава РФ
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]">
									Приказ № 1094н
								</span>
								{isUkepSigned && (
									<span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
										<ShieldCheck className="w-3.5 h-3.5" />
										УКЭП активна
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] whitespace-normal break-words mt-0.5">
								<span>{patientName}</span> · <span>Карта: {patientCard}</span> · <span>Диагноз: {diary?.diagnosisIcd10 || "K02.1"}</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Desktop Form Switcher Tabs */}
						<div className="hidden md:flex items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] gap-1">
							<button
								type="button"
								onClick={() => {
									setActiveForm("107-1u");
									setValidityDays("60");
									setCustomSeriesNumber(`РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
								}}
								className={`min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
									activeForm === "107-1u"
										? "bg-[var(--teal-fill,var(--teal))] text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								№ 107-1/у (Стандарт)
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveForm("148-1u-88");
									setValidityDays("15");
									setSelectedDrugIds(["tramadol_50"]);
									setCustomSeriesNumber(`ПКУ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
								}}
								className={`min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
									activeForm === "148-1u-88"
										? "bg-rose-600 text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								№ 148-1/у-88 (ПКУ)
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveForm("148-1u-04l");
									setValidityDays("30");
									setSelectedDrugIds(["metformin_1000"]);
									setCustomSeriesNumber(`ЛЬГ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
								}}
								className={`min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
									activeForm === "148-1u-04l"
										? "bg-emerald-600 text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								№ 148-1/у-04(л) (Льгота)
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Mobile Form Switcher ── */}
				<div className="md:hidden grid grid-cols-3 p-2 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-1.5 shrink-0">
					<button
						type="button"
						onClick={() => setActiveForm("107-1u")}
						className={`min-h-[48px] px-1 py-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
							activeForm === "107-1u"
								? "bg-[var(--teal-fill,var(--teal))] text-white border-[var(--teal)] shadow-sm"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						№ 107-1/у
					</button>
					<button
						type="button"
						onClick={() => setActiveForm("148-1u-88")}
						className={`min-h-[44px] px-1 py-1.5 text-[11px] font-bold rounded-xl border text-center transition-all ${
							activeForm === "148-1u-88"
								? "bg-rose-600 text-white border-rose-600 shadow-sm"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						148-88 (ПКУ)
					</button>
					<button
						type="button"
						onClick={() => setActiveForm("148-1u-04l")}
						className={`min-h-[44px] px-1 py-1.5 text-[11px] font-bold rounded-xl border text-center transition-all ${
							activeForm === "148-1u-04l"
								? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						148-04 (Льгота)
					</button>
				</div>

				{/* ── Modal Split Body ── */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* ── Left Column: Configurator & Catalog ── */}
					<div className="w-full lg:w-1/2 p-4 sm:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4">
						{/* Banner for Form 148-1/u-88 */}
						{activeForm === "148-1u-88" && (
							<div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs">
								<ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
								<div>
									<strong>Бланк строгой отчетности (ПКУ):</strong> На форму 148-1/у-88
									выписывается строго <strong>1 препарат</strong> (опиоиды, психотропы списка III,
									сильнодействующие). Срок действия рецепта строго 15 дней.
								</div>
							</div>
						)}

						{/* Banner for Form 148-1/u-04(l) */}
						{activeForm === "148-1u-04l" && (
							<div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs">
								<Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
								<div>
									<strong>Льготный отпуск лекарственных препаратов:</strong> Форма № 148-1/у-04(л)
									требует указания категории льготы, СНИЛС, полиса ОМС и источника финансирования.
								</div>
							</div>
						)}

						{/* ── 1-Click Fast Dental Presets Toolbar ── */}
						{activeForm === "107-1u" && (
							<div className="flex flex-col gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/25">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
										<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
										Быстрые наборы рецепта (1 клик):
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{DENTAL_FAST_PRESCRIPTION_SETS.map((preset) => {
										const isSelected =
											preset.drugIds.length === selectedDrugIds.length &&
											preset.drugIds.every((id) => selectedDrugIds.includes(id));
										return (
											<div
												key={preset.id}
												data-testid={`btn-fast-preset-${preset.id}`}
												className={`flex items-stretch justify-between p-2.5 rounded-xl border transition-all duration-150 select-none min-h-[48px] gap-2 ${
													isSelected
														? "bg-teal-500/20 border-teal-500 shadow-xs ring-1 ring-teal-500"
														: "bg-[var(--paper)] border-teal-500/30 hover:bg-teal-500/10 hover:border-teal-500"
												}`}
											>
												<button
													type="button"
													onClick={() => {
														setSelectedDrugIds([...preset.drugIds]);
														setValidityDays("60");
														showToast(`Выписан набор ${preset.label} (Форма 107-1/у)`, "success", 3000);
													}}
													className="flex flex-col text-left cursor-pointer flex-1 justify-center min-w-0"
												>
													<span className="text-xs font-black text-[var(--ink)] leading-snug truncate">
														{preset.label}
													</span>
													<span className="text-[10px] text-[var(--muted)] leading-tight mt-0.5 line-clamp-2">
														{preset.desc}
													</span>
												</button>

												<button
													type="button"
													title={`Печать набора ${preset.label} в 1 клик`}
													onClick={(e) => {
														e.stopPropagation();
														handleApplyAndPrint(preset);
													}}
													className="flex items-center justify-center self-center px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shrink-0 transition-colors shadow-xs gap-1 cursor-pointer min-h-[36px]"
													data-testid={`btn-fast-print-${preset.id}`}
												>
													<Printer className="w-3.5 h-3.5" />
													<span className="hidden xl:inline">Печать</span>
												</button>
											</div>
										);
									})}
								</div>
								<label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--ink)] mt-1 select-none">
									<input
										type="checkbox"
										checked={withStampAndSignature}
										onChange={(e) => setWithStampAndSignature(e.target.checked)}
										className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
										data-testid="toggle-stamp-signature"
									/>
									<span>Печать со штампом клиники и факсимиле подписи врача (1 клик)</span>
								</label>
							</div>
						)}

						{/* Search & Category Filter */}
						<div className="flex flex-col gap-2">
							<div className="relative">
								<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск по торговому названию, МНН или латинскому названию..."
									className="w-full min-h-[44px] pl-10 pr-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-colors"
								/>
							</div>

							{activeForm === "107-1u" && (
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none]">
									{[
										{ id: "all", label: "Все" },
										{ id: "nsaid", label: "НПВС" },
										{ id: "antibiotic", label: "Антибиотики" },
										{ id: "antiseptic", label: "Антисептики" },
										{ id: "antihistamine", label: "Антигистаминные" },
										{ id: "hemostatic", label: "Гемостатики" },
										{ id: "gastroprotective", label: "Гастропротекторы" },
									].map((cat) => (
										<button
											key={cat.id}
											type="button"
											onClick={() => setCategoryFilter(cat.id)}
											className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-xl border whitespace-nowrap shrink-0 transition-all ${
												categoryFilter === cat.id
													? "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)] shadow-xs"
													: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--teal)] hover:text-[var(--ink)]"
											}`}
										>
											{cat.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Drugs Catalog List */}
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									{activeForm === "148-1u-88"
										? "Препарат ПКУ (1 на бланк):"
										: `Препараты (${selectedDrugIds.length} / 3 на бланк):`}
								</span>
								<button
									type="button"
									onClick={() => setIsAddingCustom(!isAddingCustom)}
									className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--teal)] border border-[var(--line)] transition-colors"
								>
									<Plus className="w-3.5 h-3.5" />
									Своя пропись
								</button>
							</div>

							{/* Custom Drug Input Form */}
							{isAddingCustom && (
								<div className="p-3.5 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-2.5 animate-in fade-in duration-150">
									<div className="text-xs font-bold text-[var(--ink)]">
										Добавление индивидуальной латинской прописи:
									</div>
									<input
										type="text"
										value={customLatinRp}
										onChange={(e) => setCustomLatinRp(e.target.value)}
										placeholder="Rp.: Sol. Dexamethasoni 4 mg/ml - 1 ml"
										className="min-h-[44px] px-3 py-2 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
									/>
									<div className="grid grid-cols-2 gap-2">
										<input
											type="text"
											value={customTradeName}
											onChange={(e) => setCustomTradeName(e.target.value)}
											placeholder="Торговое название"
											className="min-h-[44px] px-3 py-2 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
										<input
											type="text"
											value={customDispense}
											onChange={(e) => setCustomDispense(e.target.value)}
											placeholder="D.t.d. N 5 in amp."
											className="min-h-[44px] px-3 py-2 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
									</div>
									<textarea
										value={customSigna}
										onChange={(e) => setCustomSigna(e.target.value)}
										placeholder="S. Внутримышечно по 1 ампуле 1 раз в сутки, 3 дня."
										rows={2}
										className="px-3 py-2 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
									<div className="flex items-center justify-end gap-2">
										<button
											type="button"
											onClick={() => setIsAddingCustom(false)}
											className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--muted)] hover:bg-[var(--line)]"
										>
											Отмена
										</button>
										<button
											type="button"
											onClick={handleAddCustomDrug}
											className="min-h-[36px] px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--teal-fill,var(--teal))] text-white shadow"
										>
											Добавить в рецепт
										</button>
									</div>
								</div>
							)}

							{/* Drug Cards */}
							<div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
								{filteredCatalog.map((drug) => {
									const isSelected = selectedDrugIds.includes(drug.id);
									return (
										<button
											key={drug.id}
											type="button"
											onClick={() => toggleDrug(drug.id)}
											className={`min-h-[56px] w-full flex items-start justify-between p-3 rounded-xl border text-left overflow-hidden transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] shadow-xs ring-1 ring-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`drug-item-${drug.id}`}
										>
											<div className="flex flex-col gap-1 min-w-0 pr-3 overflow-hidden">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-bold text-[var(--ink)]">
														{drug.tradeNameRu}
													</span>
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] font-medium text-[var(--muted)] shrink-0">
														{drug.categoryLabel}
													</span>
												</div>
												<span className="text-[11px] font-mono italic font-semibold text-[var(--teal)] truncate">
													{drug.latinRp}
												</span>
												<span className="text-[11px] text-[var(--muted)] leading-tight truncate">
													{drug.signaRu}
												</span>
											</div>
											<div
												className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border transition-colors ${
													isSelected
														? "bg-[var(--teal-fill,var(--teal))] border-[var(--teal)] text-white"
														: "border-[var(--line)] bg-[var(--paper)]"
												}`}
											>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Custom Drugs List Display */}
						{customDrugsList.length > 0 && (
							<div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-xs font-bold text-[var(--ink)]">
									Индивидуальные прописи ({customDrugsList.length}):
								</span>
								{customDrugsList.map((d) => (
									<div
										key={d.id}
										className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs"
									>
										<div className="font-mono text-[11px] truncate pr-2">
											{d.latinName} — {d.signaRussian}
										</div>
										<button
											type="button"
											onClick={() => removeCustomDrug(d.id)}
											className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
											aria-label="Удалить пропись"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						)}

						{/* Preferential Requisites Form (For 148-1/u-04(l)) */}
						{activeForm === "148-1u-04l" && (
							<div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 flex flex-col gap-2.5">
								<div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
									<Sparkles className="w-3.5 h-3.5" />
									Реквизиты льготного отпуска
								</div>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Категория граждан (Код льготы):
									</label>
									<select
										value={preferentialBenefitCode}
										onChange={(e) => {
											setPreferentialBenefitCode(e.target.value);
											const found = PREFERENTIAL_BENEFIT_CATEGORIES.find((c) => c.code === e.target.value);
											if (found) setPreferentialDiscount(found.discountPercent);
										}}
										className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									>
										{PREFERENTIAL_BENEFIT_CATEGORIES.map((c) => (
											<option key={c.code} value={c.code}>
												{c.code} — {c.nameRu} ({c.discountPercent}% оплаты)
											</option>
										))}
									</select>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
											СНИЛС пациента:
										</label>
										<input
											type="text"
											value={patientSnils}
											onChange={(e) => setPatientSnils(e.target.value)}
											placeholder="123-456-789 00"
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
									</div>
									<div>
										<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
											Полис ОМС:
										</label>
										<input
											type="text"
											value={patientOmsPolicy}
											onChange={(e) => setPatientOmsPolicy(e.target.value)}
											placeholder="16-значный номер"
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
									</div>
								</div>
							</div>
						)}

						{/* ── Prescription Requisites & Parameters ── */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3">
							<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5" />
								Реквизиты и срок действия
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Серия и номер:
									</label>
									<input
										type="text"
										value={customSeriesNumber}
										onChange={(e) => setCustomSeriesNumber(e.target.value)}
										className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Дата выписки:
									</label>
									<input
										type="date"
										value={prescriptionDate}
										onChange={(e) => setPrescriptionDate(e.target.value)}
										className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
							</div>

							{activeForm === "148-1u-88" && (
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Адрес проживания пациента (Обязательно для 148-1/у):
									</label>
									<input
										type="text"
										value={patientAddress}
										onChange={(e) => setPatientAddress(e.target.value)}
										placeholder="г. Москва, ул. ..."
										className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
							)}

							{/* Validity period selector */}
							<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
								<label className="text-[11px] font-semibold text-[var(--muted)]">
									Срок действия рецепта (Приказ № 1094н):
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									{[
										{ days: "15", label: "15 дней", disabled: activeForm === "107-1u" },
										{ days: "30", label: "30 дней", disabled: activeForm === "148-1u-88" },
										{ days: "60", label: "60 дней", disabled: activeForm === "148-1u-88" },
										{ days: "365", label: "1 год (Хроники)", disabled: activeForm === "148-1u-88" },
									].map((opt) => (
										<button
											key={opt.days}
											type="button"
											disabled={opt.disabled}
											onClick={() => {
												setValidityDays(opt.days as any);
												if (opt.days === "365") {
													setIsChronicSpecialCare(true);
												} else {
													setIsChronicSpecialCare(false);
												}
											}}
											className={`min-h-[44px] px-2 py-1 text-xs font-semibold rounded-xl border text-center transition-all ${
												opt.disabled ? "opacity-40 cursor-not-allowed bg-[var(--paper)]" :
												validityDays === opt.days
													? "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)] font-bold shadow-sm"
													: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
											}`}
										>
											{opt.label}
										</button>
									))}
								</div>

								{validityDays === "365" && (
									<div className="p-2.5 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal)] flex flex-col gap-2 mt-1">
										<div className="text-[11px] font-bold text-[var(--ink)]">
											Отметка «По специальному назначению»:
										</div>
										<select
											value={chronicPeriodicity}
											onChange={(e) => setChronicPeriodicity(e.target.value)}
											className="min-h-[44px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										>
											<option value="ежемесячно (1 раз в 30 дней)">
												Отпуск: ежемесячно (1 раз в 30 дней)
											</option>
											<option value="1 раз в 2 месяца">Отпуск: 1 раз в 2 месяца</option>
											<option value="1 раз в 3 месяца">Отпуск: 1 раз в 3 месяца</option>
										</select>
									</div>
								)}

								{/* Statutory verification feedback */}
								<div className="flex items-center justify-between text-[11px] pt-1">
									<span className="text-[var(--muted)]">Истекает: <strong>{validityAudit.expiresAtIso}</strong></span>
									<span className={`font-bold ${validityAudit.isValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
										{validityAudit.isValid ? `✔ Действителен (${validityAudit.daysRemaining} дн.)` : "✖ Нарушение норм 1094н"}
									</span>
								</div>
								{validityAudit.errors.length > 0 && (
									<div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px]">
										{validityAudit.errors.map((err, i) => (
											<div key={i}>• {err}</div>
										))}
									</div>
								)}
							</div>

							{/* ── Doctor UKEP Signing Section ── */}
							<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
										<Key className="w-3.5 h-3.5 text-[var(--teal)]" />
										Электронная подпись врача (УКЭП)
									</span>
									{isUkepSigned ? (
										<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
											<CheckCircle2 className="w-3.5 h-3.5" />
											Подписано
										</span>
									) : (
										<button
											type="button"
											onClick={handleSignUkep}
											disabled={isSigningUkep}
											className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
										>
											<ShieldCheck className="w-3.5 h-3.5" />
											{isSigningUkep ? "Подписание..." : "Подписать УКЭП"}
										</button>
									)}
								</div>
								{isUkepSigned && ukepSignature && (
									<div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] flex flex-col gap-1 text-[var(--ink)]">
										<div>Сертификат: <strong>{ukepSignature.certificateSerialNumber}</strong></div>
										<div>Врач: <strong>{ukepSignature.doctorFullName}</strong> (СНИЛС: {ukepSignature.doctorSnils})</div>
										<div className="text-[10px] text-[var(--muted)]">УЦ: {ukepSignature.certificateIssuer}</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* ── Right Column: Live High-End Medical Sheet Preview ── */}
					<div className="w-full lg:w-1/2 p-4 sm:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
								Живой предпросмотр (А5 / Высокая печать):
							</span>
							<span className="text-xs font-mono font-bold text-[var(--teal)]">
								{customSeriesNumber}
							</span>
						</div>

						{/* Printable Physical Sheet Mockup */}
						<div
							className="p-5 sm:p-6 rounded-xl border border-slate-300 shadow-xl font-serif leading-relaxed flex flex-col gap-3 selection:bg-teal-100"
							style={{ backgroundColor: "var(--paper-strong, #ffffff)", color: "var(--ink, #0f172a)" }}
						>
							{/* Form Official Header */}
							<div className="border-b-2 border-slate-900 pb-2 text-[10px] flex justify-between gap-2" style={{ color: "#0f172a" }}>
								<div
									className={`w-7/12 p-1.5 rounded leading-tight transition-all ${
										withStampAndSignature
											? "border-2 border-blue-900 bg-blue-50/40 text-blue-950 shadow-xs"
											: "border border-dashed border-slate-400"
									}`}
									style={{ color: withStampAndSignature ? "#1e3a8a" : "#0f172a" }}
								>
									<div className="font-bold uppercase text-[10px]" style={{ color: withStampAndSignature ? "#1e3a8a" : "#000000" }}>
										{clinic}
									</div>
									<div className="text-[9px]">Адрес: {address}</div>
									<div className="text-[9px]">Тел: {phone}</div>
									<div className="text-[9px]">ОГРН: {ogrn} · ИНН: {inn}</div>
									<div className="text-[8.5px] font-sans">Лицензия: № {licNum}</div>
									<div className="text-[8px] font-bold italic mt-0.5" style={{ color: withStampAndSignature ? "#2563eb" : "#64748b" }}>
										{withStampAndSignature ? "★ ШТАМП МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ ★" : "(Штамп медицинской организации)"}
									</div>
								</div>
								<div className="w-5/12 text-right leading-tight text-[9px]" style={{ color: "#1e293b" }}>
									<div>Министерство здравоохранения РФ</div>
									<div>Медицинская документация</div>
									<div className="font-bold text-[10px] mt-0.5" style={{ color: "#000000" }}>
										{activeForm === "107-1u"
											? "Форма бланка № 107-1/у"
											: activeForm === "148-1u-88"
												? "Форма бланка № 148-1/у-88"
												: "Форма бланка № 148-1/у-04(л)"}
									</div>
									<div style={{ color: "#475569" }}>Приказ МЗ РФ № 1094н</div>
								</div>
							</div>

							{/* Title */}
							<div className="text-center my-0.5" style={{ color: "#0f172a" }}>
								<div className={`font-extrabold text-base tracking-widest uppercase ${activeForm === "148-1u-88" ? "text-rose-700" : activeForm === "148-1u-04l" ? "text-emerald-700" : "text-slate-950"}`} style={{ color: activeForm === "148-1u-88" ? "#be123c" : activeForm === "148-1u-04l" ? "#047857" : "#000000" }}>
									РЕЦЕПТ {activeForm === "148-1u-88" ? "(ПКУ)" : activeForm === "148-1u-04l" ? "(ЛЬГОТНЫЙ)" : ""}
								</div>
								<div className="text-[10px] font-sans" style={{ color: "#334155" }}>
									Серия: <strong style={{ color: "#000000" }}>{customSeriesNumber}</strong> от{" "}
									<strong style={{ color: "#000000" }}>{new Date(prescriptionDate || Date.now()).toLocaleDateString("ru-RU")}</strong>
								</div>
							</div>

							{/* Preferential Strip (for 148-1/u-04(l)) */}
							{activeForm === "148-1u-04l" && (
								<div className="border border-slate-400 bg-emerald-50/70 p-1.5 rounded text-[9.5px] font-sans flex flex-col gap-0.5">
									<div className="flex justify-between">
										<span>СНИЛС: <strong>{patientSnils}</strong></span>
										<span>ОМС: <strong>{patientOmsPolicy}</strong></span>
										<span>Оплата: <strong>{preferentialDiscount}%</strong></span>
									</div>
									<div>Код льготы: <strong>{preferentialBenefitCode}</strong> ({fundingSource === "regional" ? "Бюджет субъекта РФ" : "Федеральный бюджет"})</div>
								</div>
							)}

							{/* Patient and Doctor Meta */}
							<div className="border-b border-slate-300 pb-2 flex flex-col gap-0.5 text-[11px] leading-snug">
								<div>
									Ф.И.О. пациента: <strong>{patientName}</strong>
								</div>
								<div className="flex justify-between flex-wrap gap-1">
									<span>
										Дата рождения: <strong>{patientBirth}</strong>
									</span>
									<span>
										№ медкарты: <strong>{patientCard}</strong>
									</span>
								</div>
								{(activeForm === "148-1u-88" || activeForm === "148-1u-04l") && (
									<div>
										Адрес проживания: <strong>{patientAddress}</strong>
									</div>
								)}
								<div>
									Ф.И.О. лечащего врача: <strong>{docName}</strong> ({docSpecialty})
								</div>
								{diary?.diagnosisIcd10 && (
									<div className="text-[10px] text-slate-600 font-sans">
										Диагноз (МКБ-10): <strong>{diary.diagnosisIcd10}</strong>
									</div>
								)}
							</div>

							{/* Prescribed Items (Rp.) */}
							<div className="flex flex-col gap-3 min-h-[110px] py-1.5" style={{ color: "#0f172a" }}>
								{activeItems.length > 0 ? (
									activeItems.map((item, idx) => (
										<div key={item.id} className="font-serif" style={{ color: "#0f172a" }}>
											<div className="font-bold text-[11.5px] italic" style={{ color: "#000000" }}>
												{idx + 1}. {item.latinName}
											</div>
											<div className="ml-5 italic text-[11px]" style={{ color: "#1e293b" }}>
												{item.dispenseLatin}
											</div>
											<div className="ml-5 text-[11px] font-sans font-medium" style={{ color: "#0f172a" }}>
												{item.signaRussian}
											</div>
											<div className="ml-5 text-[9.5px] font-sans" style={{ color: "#475569" }}>
												[Торговое наименование: <strong style={{ color: "#0f172a" }}>{item.tradeName}</strong>]
											</div>
										</div>
									))
								) : (
									<div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500 font-sans flex flex-col items-center justify-center min-h-[90px]">
										Выберите готовый пакет назначений слева или добавьте препарат
									</div>
								)}
							</div>

							{/* Footer Signatures and Stamp Circles */}
							<div className="border-t-2 border-slate-900 pt-2 text-[10px] flex justify-between items-end" style={{ color: "#0f172a" }}>
								<div className="flex flex-col gap-1" style={{ color: "#0f172a" }}>
									<div>
										Срок действия рецепта:{" "}
										<u>
											<strong style={{ color: "#000000" }}>
												{activeForm === "148-1u-88"
													? "15 дней (ПКУ)"
													: validityDays === "365"
														? "До 1 года (По специальному назначению)"
														: `${validityDays} дней`}
											</strong>
										</u>
									</div>
									{isChronicSpecialCare && (
										<div className="text-[9px] font-bold text-teal-800" style={{ color: "#115e59" }}>
											По специальному назначению ({chronicPeriodicity})
										</div>
									)}
									<div className="mt-1 relative" style={{ color: "#0f172a" }}>
										{withStampAndSignature && (
											<div
												className="absolute -top-3 left-24 text-blue-700 font-serif italic text-base select-none pointer-events-none"
												style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, serif", transform: "rotate(-3deg)" }}
											>
												{docName.replace(/^(Д-р|Врач)\s+/i, "")}
											</div>
										)}
										Подпись врача: ____________________ / {docName}
									</div>
									{activeForm === "148-1u-88" && (
										<div style={{ color: "#0f172a" }}>Подпись зав. отделением: ____________________</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									<div
										className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
											withStampAndSignature
												? "border-2 border-blue-700 bg-blue-50 text-blue-900 shadow-xs"
												: "border border-dashed border-slate-500 text-slate-600"
										}`}
									>
										<span>ВРАЧ</span>
										<span className="text-[8px]">М.П.</span>
									</div>
									<div
										className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
											withStampAndSignature
												? "border-2 border-double border-blue-700 bg-blue-50 text-blue-900 shadow-xs"
												: "border border-dashed border-teal-700 text-teal-900"
										}`}
									>
										<span className="text-[6px] uppercase">КЛИНИКА</span>
										<span>Для<br />рецептов</span>
									</div>
									{activeForm === "148-1u-88" && (
										<div className="w-10 h-10 border border-dashed border-rose-700 clip-path-tri flex items-center justify-center font-bold text-[7.5px] text-rose-800 text-center">
											СПЕЦ.
										</div>
									)}
								</div>
							</div>

							{/* UKEP Stamp Box */}
							{isUkepSigned && ukepSignature && (
								<div className="border border-sky-600 bg-sky-50/90 p-2 rounded text-[8.5px] font-sans text-sky-950 flex justify-between items-center mt-1">
									<div>
										<div className="font-bold text-sky-900">✔ ДОКУМЕНТ ПОДПИСАН УКЭП ВРАЧА</div>
										<div>Сертификат: <strong>{ukepSignature.certificateSerialNumber}</strong></div>
										<div>Владелец: {ukepSignature.doctorFullName}</div>
										<div>УЦ: {ukepSignature.certificateIssuer}</div>
									</div>
									<QrCode className="w-9 h-9 text-sky-800 shrink-0" />
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ── Modal Footer ── */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<span className="text-xs text-[var(--muted)] leading-tight">
						Соответствует Приказу Минздрава России от 24.11.2021 г. № 1094н.
					</span>
					<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] sm:border-transparent transition-colors text-center cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => handlePrint()}
							className="min-h-[48px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-[var(--teal-fill,var(--teal))] hover:opacity-90 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
							data-testid="print-prescription-btn"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать рецепта ({activeForm === "107-1u" ? "107-1/у" : activeForm === "148-1u-88" ? "148-1/у-88" : "148-1/у-04(л)"})</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
