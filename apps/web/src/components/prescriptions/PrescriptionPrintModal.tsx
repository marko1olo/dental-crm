/**
 * DENTE Dental CRM — Statutory Medical Prescription Module (Order 1094n & 148-1/u-88)
 * Compliant with Orders No. 1094n, No. 804n, and Federal Law No. 63-FZ
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	calculatePrescriptionExpiration,
	type DentalPrescriptionDrugPreset,
	type PrescriptionDoctorUkep,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	Copy,
	PenTool,
	Pill,
	Printer,
	ShieldCheck,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import type { DiaryState } from "../useVisitDiaryLogic";
import {
	DENTAL_MEDICATIONS_CATALOG,
	type DentalMedicationPreset,
	formatPatientPrescriptionMemo,
} from "./generator";
import {
	AllergyConflictDrugItem,
	PrescriptionAllergyConflict,
	detectPrescriptionAllergyConflicts,
} from "./prescriptionAllergyChecker";
import {
	DentalFastPrescriptionSet,
	DENTAL_FAST_PRESCRIPTION_SETS,
	DENTAL_OUTPATIENT_EXTENDED_DRUGS,
	buildMergedPrescriptionCatalog,
} from "./prescriptionDataSets";
import {
	fetchPatientPrescriptions,
	savePrescriptionToBackend,
	signPrescriptionOnBackend,
	type CreatePrescriptionApiPayload,
} from "./prescriptionApiClient";
import { PrescriptionSheetPreview } from "./PrescriptionSheetPreview";
import { PrescriptionDrugCatalogSelector } from "./PrescriptionDrugCatalogSelector";
import {
	generatePrescriptionPrintHtml,
	generatePatientMemoPrintHtml,
} from "./prescriptionPrintHtml";

export type PrescriptionFormType = "107-1u" | "148-1u-88";

export {
	detectPrescriptionAllergyConflicts,
	DENTAL_FAST_PRESCRIPTION_SETS,
	DENTAL_OUTPATIENT_EXTENDED_DRUGS,
};
export type { AllergyConflictDrugItem, PrescriptionAllergyConflict, DentalFastPrescriptionSet };

export interface PrescriptionDrugItem {
	readonly id: string;
	readonly latinName: string;
	readonly tradeName: string;
	readonly form: string;
	readonly dosage: string;
	readonly quantity: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly category?: string;
}

export interface PrescriptionPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | null | undefined; readonly fullName?: string | null | undefined; readonly birthDate?: string | null | undefined;
		readonly cardNumber?: string | null | undefined; readonly medicalCardNumber?: string | null | undefined; readonly passport?: string | null | undefined;
		readonly address?: string | null | undefined; readonly phone?: string | null | undefined; readonly gender?: string | null | undefined;
		readonly snils?: string | null | undefined; readonly omsPolicy?: string | null | undefined;
		readonly allergies?: readonly string[] | string[] | string | null | undefined; readonly weightKg?: number | null | undefined;
	} | null | undefined;
	readonly allergies?: readonly string[] | string[] | string | null | undefined;
	readonly diary?: (DiaryState | {
		readonly diagnosisIcd10?: string | null | undefined; readonly treatmentDescription?: string | null | undefined;
		readonly anamnesis?: string | null | undefined; readonly statusLocalis?: string | null | undefined;
	} | null) | undefined;
	readonly doctorName?: string | null | undefined; readonly doctorSpecialty?: string | null | undefined; readonly doctorSnils?: string | null | undefined;
	readonly clinicName?: string | null | undefined; readonly clinicAddress?: string | null | undefined; readonly clinicPhone?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined; readonly clinicInn?: string | null | undefined;
	readonly medicalLicenseNumber?: string | null | undefined; readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly patientName?: string | null | undefined; readonly disablePortal?: boolean | undefined;
	readonly onPrescriptionCreated?: ((prescription: any) => void) | undefined;
	readonly onInsertToDiary?: ((diaryText: string) => void) | undefined;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
	isOpen,
	onClose,
	patient,
	patientName: patientNameProp,
	allergies,
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
	disablePortal = false,
	onPrescriptionCreated,
	onInsertToDiary,
}) => {
	const [activeForm, setActiveForm] = useState<PrescriptionFormType>("107-1u");
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(() => {
		if (initialSelectedDrugIds !== undefined) {
			return [...initialSelectedDrugIds];
		}
		const icd = (diary?.diagnosisIcd10 || "K02.1").toUpperCase();
		const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		if (matching.length > 0) {
			return matching.slice(0, 2).map((d) => d.id);
		}
		return ["nimesulide_100"];
	});
	const [customSeriesNumber, setCustomSeriesNumber] = useState<string>(() => {
		const year = new Date().getFullYear();
		const patSuffix = (patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(4, "0") || "0001";
		return `РЕЦ-${year}-${patSuffix}`;
	});
	const [prescriptionDate, setPrescriptionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [validityDays, setValidityDays] = useState<"15" | "30" | "60" | "365">("60");
	const [isChronicSpecialCare, setIsChronicSpecialCare] = useState<boolean>(false);
	const [chronicPeriodicity, setChronicPeriodicity] = useState<string>("ежемесячно (1 раз в 30 дней)");
	const [patientAddress, setPatientAddress] = useState<string>(() => patient?.address || "");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
	const [withStampAndSignature, setWithStampAndSignature] = useState<boolean>(true);

	// Patient identity & biometric state
	const [patientSnils, setPatientSnils] = useState<string>(() => patient?.snils || "");
	const [patientOmsPolicy, setPatientOmsPolicy] = useState<string>(() => patient?.omsPolicy || "");
	const [patientWeightKg, setPatientWeightKg] = useState<number | undefined>(() => patient?.weightKg ?? undefined);

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
	const [isMemoCopied, setIsMemoCopied] = useState<boolean>(false);

	const prevIsOpenRef = useRef(false);
	const onCloseRef = useRef(onClose);
	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!isOpen) {
			prevIsOpenRef.current = false;
			return;
		}

		const isNewlyOpened = !prevIsOpenRef.current;
		prevIsOpenRef.current = true;

		if (isNewlyOpened) {
			const today = new Date().toISOString().slice(0, 10);
			setPrescriptionDate(today);

			if (initialSelectedDrugIds !== undefined) {
				setSelectedDrugIds([...initialSelectedDrugIds]);
			} else {
				const icd = (diary?.diagnosisIcd10 || "K02.1").toUpperCase();
				const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
					d.recommendedForIcd10.some((code) => icd.startsWith(code)),
				);
				setSelectedDrugIds(matching.length > 0 ? matching.slice(0, 2).map((d) => d.id) : ["nimesulide_100"]);
			}

			const year = new Date().getFullYear();
			const patSuffix = (patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(4, "0") || "0001";
			if (activeForm === "107-1u") {
				setCustomSeriesNumber(`РЕЦ-${year}-${patSuffix}`);
				setValidityDays("60");
			} else {
				setCustomSeriesNumber(`ПКУ-${year}-${patSuffix.padStart(6, "0")}`);
				setValidityDays("15");
				setSelectedDrugIds(["nimesulide_100"]);
			}

			setPatientAddress(patient?.address || "");
			setPatientSnils(patient?.snils || "");
			setPatientOmsPolicy(patient?.omsPolicy || "");
			setPatientWeightKg(patient?.weightKg ?? undefined);
			setIsUkepSigned(false);
			setUkepSignature(null);

			if (patient?.id) fetchPatientPrescriptions(patient.id).catch(() => {});
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCloseRef.current?.();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary?.diagnosisIcd10, patient?.id, patient?.address, patient?.snils, patient?.omsPolicy, patient?.weightKg]);

	const handleSelectFormType = useCallback((type: PrescriptionFormType) => {
		setActiveForm(type);
		const year = new Date().getFullYear();
		const patSuffix = (patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(4, "0") || "0001";
		if (type === "107-1u") {
			setCustomSeriesNumber(`РЕЦ-${year}-${patSuffix}`);
			setValidityDays("60");
		} else {
			setCustomSeriesNumber(`ПКУ-${year}-${patSuffix.padStart(6, "0")}`);
			setValidityDays("15");
			setSelectedDrugIds(["nimesulide_100"]);
		}
	}, [patient?.id]);

	const patientName = patient?.fullName || patientNameProp || "";
	const patientBirth = patient?.birthDate || "";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || "";
	const docName = doctorName || "Лечащий врач";
	const docSpecialty = doctorSpecialty || "Врач-стоматолог";
	const docSnils = doctorSnils || "";
	const clinic = clinicName || "Стоматологическая клиника";
	const address = clinicAddress || "";
	const phone = clinicPhone || "";
	const [ogrn, inn, licNum] = [clinicOgrn || "", clinicInn || "", medicalLicenseNumber || ""];

	const fullCatalog = useMemo(() => buildMergedPrescriptionCatalog(), []);

	const filteredCatalog = useMemo(() => {
		const q = searchQuery.toLowerCase();
		return fullCatalog.filter((drug) => {
			const matchesSearch = !q || drug.tradeNameRu.toLowerCase().includes(q) || drug.activeSubstanceRu.toLowerCase().includes(q) || drug.latinRp.toLowerCase().includes(q);
			return matchesSearch && (categoryFilter === "all" || drug.category === categoryFilter);
		});
	}, [fullCatalog, searchQuery, categoryFilter]);

	const toggleDrug = (id: string) => {
		if (activeForm === "148-1u-88") { setSelectedDrugIds([id]); return; }
		setSelectedDrugIds((prev) => {
			if (prev.includes(id)) return prev.filter((dId) => dId !== id);
			if (prev.length >= 3) {
				showToast("На одном рецептурном бланке допускается не более 3 препаратов", "warning", 3000);
				return prev;
			}
			return [...prev, id];
		});
	};

	const handleAddCustomDrug = () => {
		if (!customTradeName.trim()) {
			showToast("Укажите наименование препарата", "warning");
			return;
		}
		const customId = `custom-${Date.now()}`;
		const newCustomItem: PrescriptionDrugItem = {
			id: customId,
			tradeName: customTradeName.trim(),
			latinName: customLatinRp.trim() || `Rp.: ${customTradeName.trim()}`,
			form: "таблетки",
			dosage: "стандартная",
			quantity: "N. 10",
			dispenseLatin: customDispense.trim() || "D.t.d. N 10",
			signaRussian: customSigna.trim() || "S. По назначению врача",
			category: "other",
		};
		setCustomDrugsList((prev) => [...prev, newCustomItem]);
		setSelectedDrugIds((prev) => (prev.length < 3 ? [...prev, customId] : prev));
		setCustomTradeName(""); setCustomLatinRp(""); setCustomDispense(""); setCustomSigna("");
		setIsAddingCustom(false);
		showToast("Препарат добавлен в рецепт", "success");
	};

	const activeItems: PrescriptionDrugItem[] = useMemo(() => {
		const items: PrescriptionDrugItem[] = [];
		for (const id of selectedDrugIds) {
			const custom = customDrugsList.find((c) => c.id === id);
			if (custom) {
				items.push(custom);
				continue;
			}
			const found = fullCatalog.find((d) => d.id === id);
			if (found) {
				items.push({
					id: found.id,
					latinName: found.latinRp,
					tradeName: found.tradeNameRu,
					form: found.formRu,
					dosage: found.dosageRu,
					quantity: found.quantityLabel,
					dispenseLatin: found.dispenseLatin,
					signaRussian: found.signaRu,
					category: found.category,
				});
			}
		}
		return items;
	}, [selectedDrugIds, customDrugsList, fullCatalog]);

	const resolvedPatientAllergies = allergies ?? patient?.allergies ?? "";
	const allergyConflicts = useMemo(() => {
		return detectPrescriptionAllergyConflicts(resolvedPatientAllergies, activeItems);
	}, [resolvedPatientAllergies, activeItems]);

	const penicillinConflict = allergyConflicts.some((c) => c.type === "penicillin");
	const nsaidConflict = allergyConflicts.some((c) => c.type === "nsaid");
	const anestheticConflict = allergyConflicts.some((c) => c.type === "anesthetic");

	const validityAudit = useMemo(() => {
		const daysNum = Number.parseInt(validityDays, 10) || 60;
		return calculatePrescriptionExpiration(prescriptionDate, daysNum);
	}, [prescriptionDate, validityDays]);

	const generatePrintHtml = useCallback((): string => {
		return generatePrescriptionPrintHtml({
			customSeriesNumber, clinic, address, phone, ogrn, inn, licNum,
			activeForm, prescriptionDate, patientName, patientBirth, patientCard,
			patientAddress, docName, docSpecialty, activeItems, validityDays,
		});
	}, [customSeriesNumber, clinic, address, phone, ogrn, inn, licNum, activeForm, prescriptionDate, patientName, patientBirth, patientCard, patientAddress, docName, docSpecialty, activeItems, validityDays]);

	const handlePrintPatientMemo = useCallback(() => {
		if (activeItems.length === 0) {
			showToast("Выберите хотя бы один препарат для памятки", "warning", 3000);
			return;
		}
		const memoHtml = generatePatientMemoPrintHtml({
			clinic, address, phone, patientName, patientBirth,
			patientCard, docName, docSpecialty, prescriptionDate, activeItems,
		});
		handlePrint(memoHtml);
	}, [clinic, address, phone, patientName, patientBirth, patientCard, docName, docSpecialty, prescriptionDate, activeItems]);

	const persistPrescriptionToBackend = useCallback(async () => {
		if (!patient?.id) return;
		try {
			const payload: CreatePrescriptionApiPayload = {
				patientId: patient.id,
				visitId: (patient as any)?.visitId || null,
				prescribingDoctorId: (patient as any)?.doctorId || "00000000-0000-0000-0000-000000000001",
				formType: activeForm === "148-1u-88" ? "form_148_1_u_88" : "form_107_1_u",
				validityPeriod:
					validityDays === "15" ? "days_15" : validityDays === "30" ? "days_30" : validityDays === "365" ? "year_1" : "days_60",
				isSpecialChronicIndication: isChronicSpecialCare,
				chronicDispenseFrequencyNotes: chronicPeriodicity || null,
				patientAddress: patientAddress || null,
				patientSnils: patientSnils || null,
				patientOmsPolicy: patientOmsPolicy || null,
				clinicalDiagnosisMkb10: diary?.diagnosisIcd10 || null,
				notes: `Выписан через форму 1094н (${customSeriesNumber})`,
				items: activeItems.map((item) => ({
					catalogDrugId: item.id.replace(/^item-\d+-/, ""),
					innLatin: item.latinName.replace(/^Rp\.:\s*/, "") || item.tradeName,
					dosageFormLatin: item.form || "таблетки",
					dosageDoseConcentration: item.dosage || "стандартная",
					dispenseInstructionLatin: item.dispenseLatin || "D.t.d. N 1",
					signatureDirectionRussian: item.signaRussian || "По назначению врача",
					tradeName: item.tradeName || null,
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				})),
				ukepSignature: ukepSignature || null,
			};
			const res = await savePrescriptionToBackend(payload);
			if (onPrescriptionCreated) onPrescriptionCreated(res.prescription);
		} catch (e) {
			console.warn("[PrescriptionPrintModal] backend sync notice:", e);
		}
	}, [patient?.id, activeForm, validityDays, isChronicSpecialCare, chronicPeriodicity, patientAddress, patientSnils, patientOmsPolicy, diary?.diagnosisIcd10, customSeriesNumber, activeItems, ukepSignature, onPrescriptionCreated]);

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

			// Persist UKEP signature to backend
			if (patient?.id) {
				signPrescriptionOnBackend(customSeriesNumber, {
					pkcs7Signature: signature,
					certificateSerialNumber: genuineUkep.certificateSerialNumber || undefined,
					certificateThumbprint: genuineUkep.certificateThumbprint || undefined,
					certificateIssuer: genuineUkep.certificateIssuer || undefined,
					certificateValidFrom: genuineUkep.certificateValidFrom || undefined,
					certificateValidTo: genuineUkep.certificateValidTo || undefined,
					doctorSnils: genuineUkep.doctorSnils || undefined,
					signatureAlgorithm: genuineUkep.signatureAlgorithm || undefined,
					egiszDocumentId: genuineUkep.egiszDocumentId || undefined,
				}).catch((e) => console.warn("[PrescriptionPrintModal] UKEP backend sync notice:", e));
			}
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

		const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
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

		// Persist prescription to backend upon print execution
		persistPrescriptionToBackend();
	};

	const handleApplyAndPrint = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		setValidityDays("60");
		showToast(`Печать пакета ${preset.label}`, "info", 2000);
		handlePrint();
	};

	const handleInsertToDiary = useCallback(
		(itemsToInsert?: PrescriptionDrugItem[]) => {
			const items = itemsToInsert || activeItems;
			if (items.length === 0) {
				showToast("Выберите препараты для добавления в карту", "warning", 3000);
				return;
			}
			const lines = items.map((i, idx) => `${idx + 1}. ${i.tradeName}: ${i.signaRussian}`);
			const text = `\n[Назначения]:\n${lines.join("\n")}\n`;
			if (onInsertToDiary) {
				onInsertToDiary(text);
				showToast("Назначения перенесены в дневник приёма", "success", 2500);
			} else {
				showToast("Дневник приёма недоступен для вставки", "info", 2500);
			}
		},
		[activeItems, onInsertToDiary],
	);

	const handleApplyAndInsertToDiary = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		handleInsertToDiary();
	};

	const handleCopyPatientMemo = useCallback(() => {
		if (activeItems.length === 0) {
			showToast("Выберите хотя бы один препарат", "warning", 3000);
			return;
		}

		const selectedPresets: DentalMedicationPreset[] = activeItems.map((item) => ({
			id: item.id,
			tradeNameRu: item.tradeName,
			activeSubstanceRu: item.tradeName,
			category: (item.category as any) || "other",
			categoryLabelRu: "Препарат",
			latinRp: item.latinName,
			formRu: item.form,
			dosageRu: item.dosage,
			quantityLabel: item.quantity,
			dispenseLatin: item.dispenseLatin,
			signaRu: item.signaRussian,
			validityDays: 60,
		}));

		const memoText = formatPatientPrescriptionMemo({
			clinicName: clinic,
			clinicPhone: phone,
			patientName: patientName || "Пациент",
			doctorName: docName,
			prescriptionDate: prescriptionDate || new Date().toISOString().slice(0, 10),
			medications: selectedPresets,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(memoText).catch(() => {});
		}
		setIsMemoCopied(true);
		setTimeout(() => setIsMemoCopied(false), 2000);
		showToast("Схема приёма лекарств скопирована для отправки пациенту в мессенджер", "success", 3000);
	}, [activeItems, clinic, phone, patientName, docName, prescriptionDate]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Печать рецептурного бланка"
			data-testid="prescription-print-modal"
		>
			<div className="flex flex-col w-full max-w-6xl max-h-[94vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
							<Pill className="w-6 h-6" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
									Рецептурный модуль Минздрава РФ
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]">
									Приказ № 1094н
								</span>
								{isUkepSigned && (
									<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
										<ShieldCheck className="w-3.5 h-3.5" />
										УКЭП активна
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] whitespace-normal break-words mt-0.5">
								<span>{patientName}</span> · <span>Карта: {patientCard}</span> · <span>Диагноз: {diary?.diagnosisIcd10 || "K02.1"}</span>
								{resolvedPatientAllergies && (
									<span className="ml-1 text-amber-700 dark:text-amber-300 font-semibold">
										· Аллергия: {Array.isArray(resolvedPatientAllergies) ? resolvedPatientAllergies.join(", ") : resolvedPatientAllergies}
									</span>
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden md:flex p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 shrink-0 gap-1" role="tablist">
							<button
								type="button"
								onClick={() => handleSelectFormType("107-1u")}
								className={`h-7 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer select-none ${
									activeForm === "107-1u"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
								data-active={activeForm === "107-1u"}
							>
								Рецепт на препараты (107-1/у)
							</button>
							<button
								type="button"
								onClick={() => handleSelectFormType("148-1u-88")}
								className={`h-7 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer select-none ${
									activeForm === "148-1u-88"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
								data-active={activeForm === "148-1u-88"}
							>
								Рецепт строгого учета (№ 148-1/у-88)
							</button>
						</div>
						<button
							type="button"
							onClick={onClose}
							title="Закрыть"
							className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-all cursor-pointer"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Prominent Allergy Conflict Banner (Doctor Autonomy Preserved) */}
				{allergyConflicts.length > 0 && (
					<div
						data-testid="prescription-allergy-modal-banner"
						className="mx-4 sm:mx-6 mt-3 p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0"
					>
						<div className="flex items-center gap-2 min-w-0">
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
							<span className="font-bold truncate">
								Внимание: обнаружен конфликт с аллергологическим анамнезом ({allergyConflicts.map((c) => c.matchedAllergyTerm).join(", ")})
							</span>
						</div>
						<span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
							Автономия врача (Печать доступна)
						</span>
					</div>
				)}

				{/* Modal Body */}
				<div className="flex flex-col lg:flex-row flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--line)]">
					{/* Left Column: Fast Presets & Drug Search */}
					<PrescriptionDrugCatalogSelector
						fastPresets={DENTAL_FAST_PRESCRIPTION_SETS}
						onApplyAndInsertToDiary={handleApplyAndInsertToDiary}
						onApplyAndPrint={handleApplyAndPrint}
						searchQuery={searchQuery}
						onSearchQueryChange={setSearchQuery}
						filteredCatalog={filteredCatalog}
						selectedDrugIds={selectedDrugIds}
						onToggleDrug={toggleDrug}
						isAddingCustom={isAddingCustom}
						onToggleAddingCustom={() => setIsAddingCustom(!isAddingCustom)}
						customTradeName={customTradeName}
						onCustomTradeNameChange={setCustomTradeName}
						customLatinRp={customLatinRp}
						onCustomLatinRpChange={setCustomLatinRp}
						customDispense={customDispense}
						onCustomDispenseChange={setCustomDispense}
						customSigna={customSigna}
						onCustomSignaChange={setCustomSigna}
						onAddCustomDrug={handleAddCustomDrug}
						customSeriesNumber={customSeriesNumber}
						onCustomSeriesNumberChange={setCustomSeriesNumber}
						validityDays={validityDays}
						onValidityDaysChange={(d) => {
							setValidityDays(d);
							setIsChronicSpecialCare(d === "365");
						}}
						isChronicSpecialCare={isChronicSpecialCare}
						onToggleChronicSpecialCare={() => setIsChronicSpecialCare(!isChronicSpecialCare)}
						chronicPeriodicity={chronicPeriodicity}
						onChronicPeriodicityChange={setChronicPeriodicity}
						patientAddress={patientAddress}
						onPatientAddressChange={setPatientAddress}
						activeForm={activeForm}
						patientAllergies={resolvedPatientAllergies}
					/>

					{/* Right Column: Sheet Preview */}
					<PrescriptionSheetPreview
						customSeriesNumber={customSeriesNumber}
						penicillinConflict={penicillinConflict}
						nsaidConflict={nsaidConflict} anestheticConflict={anestheticConflict} ddiSafetyAudit={null}
						withStampAndSignature={withStampAndSignature} clinic={clinic} address={address} phone={phone}
						ogrn={ogrn} inn={inn} licNum={licNum} activeForm={activeForm} prescriptionDate={prescriptionDate}
						patientName={patientName} patientBirth={patientBirth} patientCard={patientCard} patientAddress={patientAddress}
						docName={docName} docSpecialty={docSpecialty} diary={diary} activeItems={activeItems}
						validityDays={validityDays} isChronicSpecialCare={isChronicSpecialCare} chronicPeriodicity={chronicPeriodicity}
						isUkepSigned={isUkepSigned} ukepSignature={ukepSignature}
					/>
				</div>

				{/* Modal Footer */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="med-rx-copy-patient-btn"
							onClick={handleCopyPatientMemo}
							title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
							className="secondary-button h-8 min-h-[44px] md:min-h-[32px] px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Copy className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>{isMemoCopied ? "Скопировано!" : "Скопировать для пациента"}</span>
						</button>
						<button
							type="button"
							data-testid="insert-to-diary-btn"
							onClick={() => handleInsertToDiary()}
							className="secondary-button h-8 min-h-[44px] md:min-h-[32px] px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
						>
							<PenTool className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Вставить в дневник</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSignUkep}
							className={`h-8 min-h-[44px] md:min-h-[32px] px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
								isUkepSigned
									? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
									: "secondary-button text-[var(--ink)]"
							}`}
						>
							<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>{isUkepSigned ? "УКЭП подписана" : isSigningUkep ? "Подписание..." : "Подписать УКЭП"}</span>
						</button>
						<button
							type="button"
							data-testid="print-patient-memo-btn"
							onClick={handlePrintPatientMemo}
							title="Распечатать понятную памятку со схемой приёма для пациента (без латыни)"
							className="secondary-button h-8 min-h-[44px] md:min-h-[32px] px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Печать памятки</span>
						</button>
						<button
							type="button"
							data-testid="print-prescription-btn"
							onClick={() => handlePrint()}
							className="primary-button h-8 min-h-[44px] md:min-h-[32px] px-4 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать бланка (А5)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
 
 	if (disablePortal || typeof document === "undefined") {
 		return modalContent;
 	}

 	return createPortal(modalContent, document.body);
 };
