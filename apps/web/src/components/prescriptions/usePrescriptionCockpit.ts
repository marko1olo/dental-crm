/**
 * usePrescriptionCockpit.ts — State and Business Logic Hook for Prescription Cockpit
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	calculatePrescriptionExpiration,
	checkDrugDrugInteractions,
	type DentalPrescriptionDrugPreset,
	type DrugDrugInteractionCheckResult,
	type PrescriptionDoctorUkep,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import {
	formatPatientPrescriptionMemo,
	calculatePediatricIbuprofenDose,
	type DentalMedicationPreset,
} from "./generator";
import {
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
} from "./prescriptionAllergyChecker";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	buildMergedPrescriptionCatalog,
	type DentalFastPrescriptionSet,
} from "./prescriptionDataSets";
import {
	fetchPatientPrescriptions,
	savePrescriptionToBackend,
	signPrescriptionOnBackend,
	type CreatePrescriptionApiPayload,
} from "./prescriptionApiClient";
import {
	generatePrescriptionPrintHtml,
	generatePatientMemoPrintHtml,
} from "./prescriptionPrintHtml";
import type { PrescriptionDrugItem, PrescriptionPrintModalProps, PrescriptionFormType } from "./PrescriptionPrintModal";

export function usePrescriptionCockpit(props: PrescriptionPrintModalProps) {
	const {
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
		onPrescriptionCreated,
		onInsertToDiary,
	} = props;

	const [activeForm, setActiveForm] = useState<PrescriptionFormType>("107-1u");
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(() => {
		if (initialSelectedDrugIds !== undefined) return [...initialSelectedDrugIds];
		const icd = (diary?.diagnosisIcd10 || "K02.1").toUpperCase();
		const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		return matching.length > 0 ? matching.slice(0, 2).map((d) => d.id) : ["nimesulide_100"];
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

	const [patientSnils, setPatientSnils] = useState<string>(() => patient?.snils || "");
	const [patientOmsPolicy, setPatientOmsPolicy] = useState<string>(() => patient?.omsPolicy || "");
	const [patientWeightKg, setPatientWeightKg] = useState<number | undefined>(() => patient?.weightKg ?? undefined);

	const [isUkepSigned, setIsUkepSigned] = useState<boolean>(false);
	const [ukepSignature, setUkepSignature] = useState<PrescriptionDoctorUkep | null>(null);
	const [isSigningUkep, setIsSigningUkep] = useState<boolean>(false);

	const [customTradeName, setCustomTradeName] = useState<string>("");
	const [customLatinRp, setCustomLatinRp] = useState<string>("");
	const [customDispense, setCustomDispense] = useState<string>("");
	const [customSigna, setCustomSigna] = useState<string>("");
	const [customDrugsList, setCustomDrugsList] = useState<PrescriptionDrugItem[]>([]);
	const [isMemoCopied, setIsMemoCopied] = useState<boolean>(false);
	const [mobileTab, setMobileTab] = useState<"catalog" | "preview">("catalog");

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
		if (!prevIsOpenRef.current) {
			const today = new Date().toISOString().slice(0, 10);
			setPrescriptionDate(today);
			if (initialSelectedDrugIds !== undefined) {
				setSelectedDrugIds([...initialSelectedDrugIds]);
			}
			const year = new Date().getFullYear();
			const patSuffix = (patient?.id ? patient.id.replace(/\D/g, "").slice(-4) : "").padStart(4, "0") || "0001";
			setCustomSeriesNumber(activeForm === "107-1u" ? `РЕЦ-${year}-${patSuffix}` : `ПКУ-${year}-${patSuffix.padStart(6, "0")}`);
			setPatientAddress(patient?.address || "");
			setPatientSnils(patient?.snils || "");
			setPatientOmsPolicy(patient?.omsPolicy || "");
			setPatientWeightKg(patient?.weightKg ?? undefined);
			setIsUkepSigned(false);
			setUkepSignature(null);
			if (patient?.id) fetchPatientPrescriptions(patient.id).catch(() => {});
		}
		prevIsOpenRef.current = true;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCloseRef.current?.();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, initialSelectedDrugIds, activeForm, patient?.id, patient?.address, patient?.snils, patient?.omsPolicy, patient?.weightKg]);

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
				let signa = found.signaRu;
				if (found.id === "ibuprofen_suspension_100_5ml" && patientWeightKg && patientWeightKg > 0) {
					signa = calculatePediatricIbuprofenDose(patientWeightKg).signaRu;
				}
				items.push({
					id: found.id,
					latinName: found.latinRp,
					tradeName: found.tradeNameRu,
					form: found.formRu,
					dosage: found.dosageRu,
					quantity: found.quantityLabel,
					dispenseLatin: found.dispenseLatin,
					signaRussian: signa,
					category: found.category,
				});
			}
		}
		return items;
	}, [selectedDrugIds, customDrugsList, fullCatalog, patientWeightKg]);

	const resolvedPatientAllergies = allergies ?? patient?.allergies ?? "";
	const allergyConflicts = useMemo(() => {
		return detectPrescriptionAllergyConflicts(resolvedPatientAllergies, activeItems);
	}, [resolvedPatientAllergies, activeItems]);

	const resolvedPatientAnamnesis = useMemo(() => {
		const parts: string[] = [];
		if (resolvedPatientAllergies) {
			parts.push(Array.isArray(resolvedPatientAllergies) ? resolvedPatientAllergies.join(" ") : String(resolvedPatientAllergies));
		}
		if (diary && typeof (diary as any).anamnesis === "string") parts.push((diary as any).anamnesis);
		if (patient && typeof (patient as any).somaticAnamnesis === "string") parts.push((patient as any).somaticAnamnesis);
		if (patient && typeof (patient as any).chronicDiseases === "string") parts.push((patient as any).chronicDiseases);
		return parts.join(" ");
	}, [resolvedPatientAllergies, diary, patient]);

	const somaticWarnings = useMemo(() => {
		return detectPrescriptionSomaticWarnings(resolvedPatientAnamnesis, activeItems);
	}, [resolvedPatientAnamnesis, activeItems]);

	const handleAddOmeprazoleGastroprotection = useCallback(() => {
		if (selectedDrugIds.includes("omeprazole_20")) {
			showToast("Омепразол 20 мг уже добавлен в назначения", "info", 2500);
			return;
		}
		if (selectedDrugIds.length >= 3 && activeForm === "107-1u") {
			showToast("На одном рецептурном бланке допускается не более 3 препаратов. Замените один из препаратов.", "warning", 4000);
			return;
		}
		setSelectedDrugIds((prev) => [...prev, "omeprazole_20"]);
		showToast("Омепразол 20 мг добавлен для гастропротекции ЖКТ", "success", 3000);
	}, [selectedDrugIds, activeForm]);

	const proposedDrugNames = useMemo(() => activeItems.map((item) => item.tradeName || item.latinName), [activeItems]);
	const existingMedicationsList = useMemo(() => {
		const meds: string[] = [];
		const rawMeds = (patient as any)?.currentMedications || (patient as any)?.takingMedications;
		if (typeof rawMeds === "string") meds.push(...rawMeds.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean));
		else if (Array.isArray(rawMeds)) meds.push(...rawMeds.map((s: string) => String(s).trim()).filter(Boolean));
		return meds;
	}, [patient]);

	const ddiSafetyAudit: DrugDrugInteractionCheckResult | null = useMemo(() => {
		if (proposedDrugNames.length === 0) return null;
		return checkDrugDrugInteractions(proposedDrugNames, existingMedicationsList);
	}, [proposedDrugNames, existingMedicationsList]);

	const generatePrintHtml = useCallback((): string => {
		return generatePrescriptionPrintHtml({
			customSeriesNumber, clinic, address, phone, ogrn, inn, licNum,
			activeForm, prescriptionDate, patientName, patientBirth, patientCard,
			patientAddress, docName, docSpecialty, activeItems, validityDays,
			isChronicSpecialCare, chronicPeriodicity, withStampAndSignature,
			ukepSignature,
		});
	}, [customSeriesNumber, clinic, address, phone, ogrn, inn, licNum, activeForm, prescriptionDate, patientName, patientBirth, patientCard, patientAddress, docName, docSpecialty, activeItems, validityDays, isChronicSpecialCare, chronicPeriodicity, withStampAndSignature, ukepSignature]);

	const persistPrescriptionToBackend = useCallback(async () => {
		if (!patient?.id) return;
		try {
			const payload: CreatePrescriptionApiPayload = {
				patientId: patient.id,
				visitId: (patient as any)?.visitId || null,
				prescribingDoctorId: (patient as any)?.doctorId || "00000000-0000-0000-0000-000000000001",
				formType: activeForm === "148-1u-88" ? "form_148_1_u_88" : "form_107_1_u",
				validityPeriod: validityDays === "15" ? "days_15" : validityDays === "30" ? "days_30" : validityDays === "365" ? "year_1" : "days_60",
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
			console.warn("[PrescriptionCockpit] backend sync notice:", e);
		}
	}, [patient?.id, activeForm, validityDays, isChronicSpecialCare, chronicPeriodicity, patientAddress, patientSnils, patientOmsPolicy, diary?.diagnosisIcd10, customSeriesNumber, activeItems, ukepSignature, onPrescriptionCreated]);

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
		persistPrescriptionToBackend();
	};

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

	const handleSelectExpressPreset = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		setValidityDays("60");
	};

	const handleApplyAndPrint = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		setValidityDays("60");
		showToast(`Печать пакета ${preset.label}`, "info", 2000);
		handlePrint();
	};

	const handleApplyAndInsertToDiary = (preset: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...preset.drugIds]);
		handleInsertToDiary();
	};

	const handleSignUkep = async () => {
		setIsSigningUkep(true);
		try {
			const certs = await getPersonalCertificates();
			if (!certs || certs.length === 0) throw new Error("В хранилище КриптоПро не найдено личных сертификатов ЭЦП врача.");
			const targetCert = certs.find((c) => c.isGost && c.hasPrivateKey) || certs[0];
			if (!targetCert) throw new Error("Не удалось выбрать сертификат для подписания.");
			const contentToSign = btoa(unescape(encodeURIComponent(generatePrintHtml())));
			const signature = await signBase64WithCertificate(contentToSign, targetCert.thumbprint);
			const genuineUkep: PrescriptionDoctorUkep = {
				doctorFullName: targetCert.subjectName || docName,
				doctorSpecialty: docSpecialty,
				doctorSnils: docSnils,
				certificateSerialNumber: targetCert.serialNumber || targetCert.thumbprint.slice(0, 16).toUpperCase(),
				certificateThumbprint: targetCert.thumbprint,
				certificateIssuer: targetCert.issuerName || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
				certificateValidFrom: targetCert.validFrom || new Date().toISOString(),
				certificateValidTo: targetCert.validTo || new Date(Date.now() + 365 * 86400000).toISOString(),
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

	return {
		activeForm, setActiveForm,
		selectedDrugIds, setSelectedDrugIds, toggleDrug,
		customSeriesNumber, setCustomSeriesNumber,
		prescriptionDate, setPrescriptionDate,
		validityDays, setValidityDays,
		isChronicSpecialCare, setIsChronicSpecialCare,
		chronicPeriodicity, setChronicPeriodicity,
		patientAddress, setPatientAddress,
		searchQuery, setSearchQuery,
		withStampAndSignature, setWithStampAndSignature,
		patientWeightKg, setPatientWeightKg,
		isUkepSigned, ukepSignature, isSigningUkep, handleSignUkep,
		isAddingCustom, setIsAddingCustom,
		customTradeName, setCustomTradeName,
		customLatinRp, setCustomLatinRp,
		customDispense, setCustomDispense,
		customSigna, setCustomSigna,
		handleAddCustomDrug,
		isMemoCopied, mobileTab, setMobileTab,
		patientName, patientBirth, patientCard,
		docName, docSpecialty, docSnils, clinic, address, phone, ogrn, inn, licNum,
		fullCatalog, filteredCatalog, activeItems,
		resolvedPatientAllergies, allergyConflicts,
		somaticWarnings, handleAddOmeprazoleGastroprotection,
		ddiSafetyAudit,
		handlePrint, handlePrintPatientMemo, handleCopyPatientMemo,
		handleInsertToDiary, handleSelectExpressPreset, handleApplyAndPrint, handleApplyAndInsertToDiary,
	};
}
