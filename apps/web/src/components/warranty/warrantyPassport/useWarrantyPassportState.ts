/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 3: STATE HOOK (useWarrantyPassportState)
 * Логика управления состоянием, расчет рисков, ЭЦП SHA-256 и экспорт
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	calculateMultiItemWarrantyTerms,
	createWarrantyRemediationOrder,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateUuidV7,
	generateWarrantyCertificateHtml,
	generateWarrantyPatientMemo,
	generateWarrantyRemediationActHtml,
	type WarrantyCalculationResult,
	type WarrantyCertificateData,
	type WarrantyItem,
	type WarrantyRemediationOrder,
	type WarrantyRiskFactors,
} from "../warrantyEngine.js";
import {
	DENTAL_MATERIALS_CATALOG,
	getWarrantyDefectTemplate,
	getWarrantyPreset,
	type StarQuickPreset,
	type WarrantyCategory,
	type WarrantyDefectType,
	type WarrantyRemediationMaterialItem,
} from "../warrantyPresets.js";
import { mapCompletedStagesToWarrantyItems } from "./constants";
import type { WarrantyPassportModalProps, WarrantyTab } from "./types";

export function useWarrantyPassportState({
	isOpen,
	patient,
	doctorName = "Лечащий врач",
	doctorSpecialty = "Врач-стоматолог",
	clinicName = "ООО «Стоматологическая клиника»",
	clinicLegalName = "ООО «Стоматологическая клиника»",
	clinicLicenseNumber = "Лицензия на медицинскую деятельность",
	clinicAddress = "Адрес клиники",
	clinicPhone = "Телефон клиники",
	clinicWebsite = "",
	initialCategory = "composite_restoration",
	initialTeeth = [],
	completedStages = [],
	onCertificateIssued,
	onAttachToForm043u,
	onRemediationCreated,
}: WarrantyPassportModalProps) {
	const [activeTab, setActiveTab] = useState<WarrantyTab>("editor");

	// Гарантийное устранение дефекта (0 ₽) — ст. 29 Закона РФ № 2300-1 и Мандат 8e
	const [remediations, setRemediations] = useState<WarrantyRemediationOrder[]>([]);
	const [selectedRemediationTooth, setSelectedRemediationTooth] = useState<string>("1.6");
	const [selectedDefectType, setSelectedDefectType] = useState<WarrantyDefectType>("filling_loss");
	const [customRemediationFinding, setCustomRemediationFinding] = useState<string>("");
	const [customRemediationAction, setCustomRemediationAction] = useState<string>("");
	const [remediationMaterials, setRemediationMaterials] = useState<WarrantyRemediationMaterialItem[]>([]);
	const [remediationNotes, setRemediationNotes] = useState<string>("");
	const [remediationSuccessNotice, setRemediationSuccessNotice] = useState<string | null>(null);

	// Состояние выбранных зубов для добавления
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
		initialTeeth.length > 0 ? initialTeeth : ["1.6"],
	);
	const [activeCategory, setActiveCategory] = useState<WarrantyCategory>(initialCategory);
	const [currentWorkTitle, setCurrentWorkTitle] = useState<string>("");
	const [currentMaterial, setCurrentMaterial] = useState<string>("");
	const [currentManufacturer, setCurrentManufacturer] = useState<string>("");
	const [currentCountry, setCurrentCountry] = useState<string>("");
	const [currentShade, setCurrentShade] = useState<string>("A2");
	const [currentLot, setCurrentLot] = useState<string>("");
	const [currentServiceCode804n, setCurrentServiceCode804n] = useState<string>(
		getWarrantyPreset(initialCategory).serviceCode804n,
	);
	const [currentLabOrderNumber, setCurrentLabOrderNumber] = useState<string>("");
	const [customWarrantyMonths, setCustomWarrantyMonths] = useState<number | undefined>(undefined);

	// Список позиций гарантийного паспорта
	const [items, setItems] = useState<WarrantyItem[]>([]);

	// Состояние факторов риска пациента
	const [riskFactors, setRiskFactors] = useState<WarrantyRiskFactors>({
		hygieneScore: 1.0,
		kpuIndex: 4,
		bruxism: false,
		nightGuardPrescribed: false,
		nightGuardUsed: false,
		smoking: "none",
		diabetes: "none",
		malocclusion: false,
		periodontitis: "none",
		poorCompliance: false,
		osteoporosis: false,
	});

	const [certificateId, setCertificateId] = useState<string>("");
	const [issueDate, setIssueDate] = useState<string>("");
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedMemo, setCopiedMemo] = useState(false);
	const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
	const [attachedStatus, setAttachedStatus] = useState(false);

	const initialTeethKey = initialTeeth ? initialTeeth.join(",") : "";
	const completedStagesKey = completedStages
		? completedStages.map((s) => `${s.toothNumber ?? ""}-${s.serviceTitle}`).join(",")
		: "";

	// Инициализация при открытии модального окна
	useEffect(() => {
		if (isOpen) {
			const id = generateCertificateId("WAR");
			const nowIso = new Date().toISOString().slice(0, 10);
			setCertificateId(id);
			setIssueDate(nowIso);
			setAttachedStatus(false);
			setCopiedLink(false);
			setCopiedMemo(false);
			setIsShareMenuOpen(false);

			const preset = getWarrantyPreset(initialCategory);
			setActiveCategory(initialCategory);
			setCurrentWorkTitle(preset.title);
			setCurrentServiceCode804n(preset.serviceCode804n);
			setCurrentLabOrderNumber("");

			const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === initialCategory);
			if (mat) {
				setCurrentMaterial(mat.name);
				setCurrentManufacturer(mat.manufacturer);
				setCurrentCountry(mat.country);
				setCurrentShade(mat.popularShades?.[0] ?? "A2");
			}

			// 1-Клик автозаполнение из завершенных этапов плана лечения (Мандат 8e & 8k)
			if (completedStages && completedStages.length > 0) {
				const stageItems = mapCompletedStagesToWarrantyItems(completedStages);
				setItems(stageItems);
				if (stageItems[0]) {
					setSelectedRemediationTooth(stageItems[0].toothNumber);
				}
			} else if (initialTeeth && initialTeeth.length > 0) {
				const initialItems: WarrantyItem[] = initialTeeth.map((tooth) => ({
					id: generateUuidV7(),
					toothNumber: tooth,
					category: initialCategory,
					clinicalWorkTitle: preset.title,
					materialName: mat?.name ?? preset.recommendedMaterials[0] ?? "Композит световой",
					manufacturer: mat?.manufacturer ?? preset.popularManufacturers[0] ?? "3M ESPE",
					country: mat?.country ?? "США",
					vitaShade: "A2",
					serviceCode804n: preset.serviceCode804n,
					baseWarrantyMonths: preset.baseWarrantyMonths,
					baseServiceLifeMonths: preset.baseServiceLifeMonths,
				}));
				setItems(initialItems);
			} else {
				// Базовая дефолтная позиция
				setItems([
					{
						id: generateUuidV7(),
						toothNumber: "1.6",
						category: initialCategory,
						clinicalWorkTitle: preset.title,
						materialName: mat?.name ?? "Filtek Ultimate (3M ESPE)",
						manufacturer: mat?.manufacturer ?? "3M ESPE",
						country: mat?.country ?? "США",
						vitaShade: "A2",
						serviceCode804n: preset.serviceCode804n,
						baseWarrantyMonths: preset.baseWarrantyMonths,
						baseServiceLifeMonths: preset.baseServiceLifeMonths,
					},
				]);
			}

			const defTmpl = getWarrantyDefectTemplate("filling_loss");
			setSelectedDefectType("filling_loss");
			setCustomRemediationFinding(defTmpl.clinicalDescription);
			setCustomRemediationAction(defTmpl.recommendedAction);
			setRemediationMaterials([...defTmpl.defaultMaterials]);
			setRemediationSuccessNotice(null);
			if (completedStages && completedStages.length > 0 && completedStages[0]?.toothNumber) {
				setSelectedRemediationTooth(completedStages[0].toothNumber);
			} else if (initialTeeth && initialTeeth.length > 0) {
				setSelectedRemediationTooth(initialTeeth[0] || "1.6");
			} else {
				setSelectedRemediationTooth("1.6");
			}
		}
	}, [isOpen, initialCategory, initialTeethKey, completedStagesKey]);

	// Обработчик выбора категории
	const handleSelectCategory = (cat: WarrantyCategory) => {
		setActiveCategory(cat);
		const preset = getWarrantyPreset(cat);
		setCurrentWorkTitle(preset.title);
		setCurrentServiceCode804n(preset.serviceCode804n);

		const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === cat);
		if (mat) {
			setCurrentMaterial(mat.name);
			setCurrentManufacturer(mat.manufacturer);
			setCurrentCountry(mat.country);
			setCurrentShade(mat.popularShades?.[0] ?? "A2");
		} else {
			setCurrentMaterial(preset.recommendedMaterials[0] ?? "");
			setCurrentManufacturer(preset.popularManufacturers[0] ?? "");
			setCurrentCountry("Германия");
		}
		setCustomWarrantyMonths(undefined);
	};

	// Быстрый выбор материала из каталога
	const handleSelectMaterialMeta = (mat: (typeof DENTAL_MATERIALS_CATALOG)[0]) => {
		setCurrentMaterial(mat.name);
		setCurrentManufacturer(mat.manufacturer);
		setCurrentCountry(mat.country);
		if (mat.popularShades && mat.popularShades.length > 0) {
			setCurrentShade(mat.popularShades[0] ?? "A2");
		}
		setCustomWarrantyMonths(mat.warrantyMonthsDefault);
	};

	// Переключение зуба в зубной формуле
	const toggleTooth = (tooth: string) => {
		const formatted = tooth.includes(".") ? tooth : `${tooth[0]}.${tooth[1]}`;
		setSelectedTeeth((prev) =>
			prev.includes(formatted) ? prev.filter((t) => t !== formatted) : [...prev, formatted],
		);
	};

	// Добавление позиций в гарантийный паспорт
	const handleAddItem = () => {
		const preset = getWarrantyPreset(activeCategory);
		const targetTeeth =
			selectedTeeth.length > 0 ? selectedTeeth : ["Общая конструкция / Челюсть"];
		const newItems: WarrantyItem[] = targetTeeth.map((tooth) => ({
			id: generateUuidV7(),
			toothNumber: tooth,
			category: activeCategory,
			clinicalWorkTitle: currentWorkTitle || preset.title,
			materialName: currentMaterial || preset.recommendedMaterials[0] || "Стоматологический материал",
			manufacturer: currentManufacturer || preset.popularManufacturers[0] || "Производитель",
			country: currentCountry || "Германия",
			vitaShade: currentShade || undefined,
			lotNumber: currentLot.trim() || undefined,
			serviceCode804n: currentServiceCode804n.trim() || preset.serviceCode804n,
			labOrderNumber: currentLabOrderNumber.trim() || undefined,
			baseWarrantyMonths: customWarrantyMonths ?? preset.baseWarrantyMonths,
			baseServiceLifeMonths: preset.baseServiceLifeMonths,
		}));

		setItems((prev) => [...prev, ...newItems]);
		setCurrentLot("");
		setCurrentLabOrderNumber("");
	};

	// Удаление позиции
	const handleRemoveItem = (id: string) => {
		setItems((prev) => prev.filter((it) => it.id !== id));
	};

	// Расчет сводных гарантийных сроков
	const calculation: WarrantyCalculationResult = useMemo(() => {
		return calculateMultiItemWarrantyTerms(items, riskFactors, issueDate);
	}, [items, riskFactors, issueDate]);

	// Полноценный объект гарантийного сертификата
	const certificateData: WarrantyCertificateData = useMemo(() => {
		const pName = patient?.fullName || "Пациент стоматологической клиники";
		const pCard = patient?.cardNumber || (patient?.id ? `МК-${patient.id.slice(0, 6).toUpperCase()}` : "МК-2026");
		const dName = doctorName || "Лечащий врач";
		const vUrl = clinicWebsite
			? `${clinicWebsite}/portal/warranty?cert=${certificateId}&card=${encodeURIComponent(pCard)}`
			: `/portal/warranty?cert=${certificateId}&card=${encodeURIComponent(pCard)}`;
		const qr = generateQrCodeSvg(vUrl, { size: 140 });

		const rawContentForHash = `${certificateId}|${issueDate}|${pName}|${pCard}|${dName}|${items.map((i) => `${i.toothNumber}:${i.category}:${i.materialName}:${i.lotNumber || ""}:${i.serviceCode804n || ""}:${i.labOrderNumber || ""}:${i.vitaShade || ""}`).join(";")}|${calculation.adjustedWarrantyMonths}|${calculation.totalRiskMultiplier}`;
		const hash = generateSha256(rawContentForHash);

		return {
			certificateId,
			issueDate,
			patient: {
				fullName: pName,
				birthDate: patient?.birthDate || undefined,
				cardNumber: pCard,
				phone: patient?.phone || undefined,
				snils: patient?.snils || undefined,
			},
			doctor: {
				fullName: dName,
				specialty: doctorSpecialty || "Врач-стоматолог",
			},
			clinic: {
				name: clinicName || "ООО «Стоматологическая клиника»",
				legalName: clinicLegalName || "ООО «Стоматологическая клиника»",
				licenseNumber: clinicLicenseNumber || "Лицензия на медицинскую деятельность",
				address: clinicAddress || "Адрес клиники",
				phone: clinicPhone || "Телефон клиники",
				website: clinicWebsite || undefined,
			},
			items,
			calculation,
			verificationUrl: vUrl,
			qrCodeSvg: qr,
			integrityHash: hash,
			signedByDoctor: true,
			signedByChief: true,
			attachedToForm043u: attachedStatus,
			remediations: remediations.length > 0 ? remediations : undefined,
		};
	}, [
		certificateId,
		issueDate,
		patient,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicLegalName,
		clinicLicenseNumber,
		clinicAddress,
		clinicPhone,
		clinicWebsite,
		items,
		calculation,
		attachedStatus,
		remediations,
	]);

	// Быстрый выбор шаблона дефекта
	const handleSelectDefectType = (dtype: WarrantyDefectType) => {
		setSelectedDefectType(dtype);
		const tmpl = getWarrantyDefectTemplate(dtype);
		setCustomRemediationFinding(tmpl.clinicalDescription);
		setCustomRemediationAction(tmpl.recommendedAction);
		setRemediationMaterials([...tmpl.defaultMaterials]);
		setRemediationSuccessNotice(null);
	};

	// 1-клик оформление гарантийной переделки (0 ₽)
	const handleCreateRemediation = () => {
		const tooth = selectedRemediationTooth || (items[0]?.toothNumber ?? "1.6");
		const pName = patient?.fullName || "Пациент стоматологической клиники";
		const pCard = patient?.cardNumber || "МК-2026";

		const matchedItem = items.find((it) => it.toothNumber === tooth);
		const originalTitle = matchedItem?.clinicalWorkTitle || "Ранее выполненная работа";

		const order = createWarrantyRemediationOrder({
			certificateId,
			toothNumber: tooth,
			originalWorkTitle: originalTitle,
			defectType: selectedDefectType,
			doctorName: doctorName || "Лечащий врач-стоматолог",
			doctorSpecialty: doctorSpecialty || "Врач-стоматолог",
			patientFullName: pName,
			patientCardNumber: pCard,
			clinicName: clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
			customFinding: customRemediationFinding,
			customAction: customRemediationAction,
			materials: remediationMaterials,
			notes: remediationNotes,
		});

		setRemediations((prev) => [order, ...prev]);
		setRemediationSuccessNotice(
			`Акт гарантийного устранения дефекта ${order.orderNumber} (0 ₽) успешно сформирован! Материалы списаны со склада по факту.`,
		);

		if (onRemediationCreated) {
			onRemediationCreated(order);
		}
	};

	// Печать Акта гарантийного устранения дефекта (0 ₽)
	const handlePrintRemediationAct = (order: WarrantyRemediationOrder) => {
		const actHtml = generateWarrantyRemediationActHtml(order);
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Генерация готового HTML сертификата
	const certificateHtml = useMemo(() => {
		return generateWarrantyCertificateHtml(certificateData);
	}, [certificateData]);

	// Печать документа
	const handlePrint = useCallback(() => {
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (printWin) {
			printWin.document.write(certificateHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	}, [certificateHtml]);

	// Прикрепление к карте 043/у
	const handleAttachTo043u = () => {
		setAttachedStatus(true);
		if (onAttachToForm043u) {
			onAttachToForm043u({
				certificateId: certificateData.certificateId,
				attachedAt: new Date().toISOString(),
				fullHtml: certificateHtml,
				integrityHash: certificateData.integrityHash,
				itemCount: certificateData.items.length,
				adjustedWarrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
			});
		}
		if (onCertificateIssued) {
			onCertificateIssued(certificateData);
		}
	};

	// Копирование проверочной ссылки для пациента
	const handleCopyLink = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(certificateData.verificationUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2500);
		}
	};

	// 1-Клик формирование и отправка памятки пациенту в WhatsApp (Мандат 8k)
	const handleShareWhatsApp = () => {
		const memo = generateWarrantyPatientMemo(certificateData);
		const phoneDigits = patient?.phone ? patient.phone.replace(/\D/g, "") : "";
		const waUrl = phoneDigits
			? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(memo)}`
			: `https://api.whatsapp.com/send?text=${encodeURIComponent(memo)}`;
		window.open(waUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	// 1-Клик отправка памятки пациенту в Telegram (Мандат 8k)
	const handleShareTelegram = () => {
		const memo = generateWarrantyPatientMemo(certificateData);
		const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(certificateData.verificationUrl)}&text=${encodeURIComponent(memo)}`;
		window.open(tgUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	// Копирование официальной памятки в буфер обмена для любых мессенджеров
	const handleCopyMemo = () => {
		const memo = generateWarrantyPatientMemo(certificateData);
		if (navigator.clipboard) {
			navigator.clipboard.writeText(memo);
			setCopiedMemo(true);
			setTimeout(() => setCopiedMemo(false), 2500);
		}
	};

	// 1-Клик импорт из завершенных этапов плана лечения (Мандат 8e)
	const handleImportCompletedStages = () => {
		if (completedStages && completedStages.length > 0) {
			const imported = mapCompletedStagesToWarrantyItems(completedStages);
			setItems(imported);
		}
	};

	// 1-Клик применение клинического норматива СтАР
	const handleApplyStarQuickPreset = (qp: StarQuickPreset) => {
		setActiveCategory(qp.category);
		setCurrentWorkTitle(qp.title);
		setCurrentMaterial(qp.materialName);
		setCurrentManufacturer(qp.manufacturer);
		setCurrentCountry(qp.country);
		setCurrentServiceCode804n(qp.serviceCode804n);
		setCustomWarrantyMonths(qp.warrantyMonths);
	};

	const handleOpenRemediation = useCallback(() => {
		if (items.length > 0 && items[0]) {
			setSelectedRemediationTooth(items[0].toothNumber);
		}
		setActiveTab("remediation");
	}, [items]);

	const itemsStepProps = {
		onOpenRemediation: handleOpenRemediation,
		onImportCompletedStages: handleImportCompletedStages,
		selectedTeeth,
		onToggleTooth: toggleTooth,
		items,
		activeCategory,
		currentWorkTitle,
		onWorkTitleChange: setCurrentWorkTitle,
		currentMaterial,
		onMaterialChange: setCurrentMaterial,
		currentManufacturer,
		onManufacturerChange: setCurrentManufacturer,
		currentShade,
		onShadeChange: setCurrentShade,
		currentLot,
		onLotChange: setCurrentLot,
		currentServiceCode804n,
		onServiceCode804nChange: setCurrentServiceCode804n,
		currentLabOrderNumber,
		onLabOrderNumberChange: setCurrentLabOrderNumber,
		onApplyStarQuickPreset: handleApplyStarQuickPreset,
		onSelectCategory: handleSelectCategory,
		onAddItem: handleAddItem,
		onRemoveItem: handleRemoveItem,
		riskFactors,
		onRiskFactorsChange: setRiskFactors,
		calculation,
	};

	const signatureStepProps = {
		certificateId,
		integrityHash: certificateData.integrityHash,
		items,
		remediations,
		selectedRemediationTooth,
		onSelectRemediationTooth: setSelectedRemediationTooth,
		selectedDefectType,
		onSelectDefectType: handleSelectDefectType,
		customRemediationFinding,
		onFindingChange: setCustomRemediationFinding,
		customRemediationAction,
		onActionChange: setCustomRemediationAction,
		remediationMaterials,
		remediationNotes,
		onNotesChange: setRemediationNotes,
		remediationSuccessNotice,
		onCreateRemediation: handleCreateRemediation,
		onPrintRemediationAct: handlePrintRemediationAct,
	};

	const shareMenuProps = {
		isOpen: isShareMenuOpen,
		copiedMemo,
		copiedLink,
		onToggle: () => setIsShareMenuOpen(!isShareMenuOpen),
		onShareWhatsApp: handleShareWhatsApp,
		onShareTelegram: handleShareTelegram,
		onCopyMemo: handleCopyMemo,
		onCopyLink: handleCopyLink,
	};

	return {
		activeTab,
		setActiveTab,
		remediations,
		selectedRemediationTooth,
		setSelectedRemediationTooth,
		selectedDefectType,
		customRemediationFinding,
		setCustomRemediationFinding,
		customRemediationAction,
		setCustomRemediationAction,
		remediationMaterials,
		remediationNotes,
		setRemediationNotes,
		remediationSuccessNotice,
		selectedTeeth,
		activeCategory,
		currentWorkTitle,
		setCurrentWorkTitle,
		currentMaterial,
		setCurrentMaterial,
		currentManufacturer,
		setCurrentManufacturer,
		currentShade,
		setCurrentShade,
		currentLot,
		setCurrentLot,
		currentServiceCode804n,
		setCurrentServiceCode804n,
		currentLabOrderNumber,
		setCurrentLabOrderNumber,
		items,
		riskFactors,
		setRiskFactors,
		certificateId,
		copiedLink,
		copiedMemo,
		isShareMenuOpen,
		setIsShareMenuOpen,
		attachedStatus,
		calculation,
		certificateData,
		certificateHtml,
		handleSelectCategory,
		handleSelectMaterialMeta,
		toggleTooth,
		handleAddItem,
		handleRemoveItem,
		handleSelectDefectType,
		handleCreateRemediation,
		handlePrintRemediationAct,
		handlePrint,
		handleAttachTo043u,
		handleCopyLink,
		handleShareWhatsApp,
		handleShareTelegram,
		handleCopyMemo,
		handleImportCompletedStages,
		handleApplyStarQuickPreset,
		handleOpenRemediation,
		itemsStepProps,
		signatureStepProps,
		shareMenuProps,
	};
}
