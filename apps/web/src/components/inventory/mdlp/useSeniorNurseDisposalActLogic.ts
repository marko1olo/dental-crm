import {
	type SeniorNurseDisposalActData,
	formatSeniorNurseDisposalActData,
	generateSeniorNurseDisposalActHtml,
} from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type DeductionLineItem,
	type SupplierPurchaseOrderView,
	createSupplierPurchaseOrderFromLines,
} from "../inventoryMath.js";
import type { SeniorNurseDisposalActModalProps } from "./SeniorNurseDisposalActModal.js";
import { downloadHtmlFile, printHtmlInNewWindow } from "./seniorNurseDisposalPrintUtils.js";

export function useSeniorNurseDisposalActLogic(props: SeniorNurseDisposalActModalProps) {
	const {
		isOpen, onClose, items, organizationName = "", organizationInn = "", organizationAddress = "",
		departmentName = "Стоматологическое отделение", cabinetName = "Кабинет №1 (Терапия / Хирургия)",
		initialSeniorNurseName = "Старшая медсестра", initialChiefDoctorName = "Главный врач",
		initialDentistName = "Врач-стоматолог", onApproveAct, initialApproverRole = "doctor",
		initialPaperJournalAcknowledged = true, backgroundMode = false, autoApproveOnMount = false,
	} = props;

	const now = new Date();
	const [actNumber, setActNumber] = useState<string>(
		() => `СПИС-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-001`,
	);
	const [actDate, setActDate] = useState<string>(() => now.toISOString().slice(0, 10));
	const [approverRole, setApproverRole] = useState<
		"doctor" | "senior_nurse" | "administrator" | "authorized_staff"
	>(initialApproverRole);
	const [paperJournalAcknowledged, setPaperJournalAcknowledged] = useState<boolean>(initialPaperJournalAcknowledged);
	const [approverName, setApproverName] = useState<string>(() => {
		if (initialApproverRole === "doctor") return initialDentistName || "Врач-стоматолог";
		if (initialApproverRole === "administrator") return "Администратор клиники";
		if (initialApproverRole === "authorized_staff") return "Уполномоченный сотрудник";
		return initialSeniorNurseName || initialDentistName || "Врач-стоматолог";
	});
	const [seniorNurseName] = useState<string>(initialSeniorNurseName);
	const [chiefDoctorName] = useState<string>(initialChiefDoctorName);
	const [dentistName] = useState<string>(initialDentistName);
	const [isSingleSigner] = useState<boolean>(true);
	const [isApproved, setIsApproved] = useState<boolean>(false);
	const [notes, setNotes] = useState<string>("");
	const [showPoModal, setShowPoModal] = useState<boolean>(false);
	const [showMoreActions, setShowMoreActions] = useState<boolean>(false);

	const handleApproveAct = async (isPaperLog = paperJournalAcknowledged) => {
		setIsApproved(true);
		const message = isPaperLog
			? `Акт списания №${actNumber} утверждён в фоновом режиме: бумажный журнал учтён, участие старшей медсестры опционально`
			: `Акт списания №${actNumber} утверждён единолично (без комиссии из 3 человек)`;
		showToast(message, "info");
		if (onApproveAct) await onApproveAct(actData);
	};

	useEffect(() => {
		if (isOpen && (backgroundMode || autoApproveOnMount)) {
			void handleApproveAct(true).then(() => onClose());
		}
	}, [isOpen, backgroundMode, autoApproveOnMount]);

	const actData: SeniorNurseDisposalActData = useMemo(() => {
		let rolePositionRu: string | undefined;
		if (approverRole === "doctor") rolePositionRu = "Врач-стоматолог (дежурный)";
		else if (approverRole === "administrator") rolePositionRu = "Администратор клиники";
		else if (approverRole === "authorized_staff") rolePositionRu = "Уполномоченный сотрудник клиники";
		else rolePositionRu = isSingleSigner ? "Дежурная медицинская сестра" : "Старшая медицинская сестра";

		return formatSeniorNurseDisposalActData({
			actNumber, actDate, organizationName, organizationInn, organizationAddress, departmentName, cabinetName,
			seniorNurseName: approverRole === "senior_nurse" ? approverName : seniorNurseName,
			chiefDoctorName: isSingleSigner ? undefined : chiefDoctorName,
			dentistName: approverRole === "doctor" ? approverName : dentistName,
			approverRole, approverName, approvedByFullName: approverName, approvedByPositionRu: rolePositionRu,
			paperJournalAcknowledged, isSingleSigner, notes: notes.trim() || undefined, items,
		});
	}, [actNumber, actDate, organizationName, organizationInn, organizationAddress, departmentName, cabinetName,
		seniorNurseName, chiefDoctorName, dentistName, approverRole, approverName, paperJournalAcknowledged,
		isSingleSigner, notes, items]);

	const actHtml = useMemo(() => generateSeniorNurseDisposalActHtml(actData), [actData]);

	const deductionLines = useMemo<DeductionLineItem[]>(() => {
		if (!items || items.length === 0) {
			return [{
				id: "anes-disposal-def",
				materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте)",
				category: "anesthesia", unit: "карп.", quantity: 10, standardQuantity: 10,
				unitCostKopecks: 23000, stockQuantity: 2, criticalThreshold: 10, source: "tech_map", mandatory: true,
			}];
		}
		return items.map((it, idx) => ({
			id: `mdlp-item-${it.id || idx}`,
			materialName: it.drugInfo?.tradeName || "Анестетик артикаиновый 1.7 мл (карпула)",
			category: "anesthesia" as const, unit: "карп.", quantity: 1, standardQuantity: 1,
			unitCostKopecks: 23000, stockQuantity: 0, criticalThreshold: 5, lotNumber: it.series ?? undefined,
			expirationDate: it.expirationDate ?? undefined, source: "tech_map" as const, mandatory: true,
		}));
	}, [items]);

	const generatedPurchaseOrder = useMemo<SupplierPurchaseOrderView | null>(() => {
		return createSupplierPurchaseOrderFromLines(deductionLines, organizationName);
	}, [deductionLines, organizationName]);

	return {
		actNumber, setActNumber, actDate, setActDate, approverRole, setApproverRole,
		paperJournalAcknowledged, setPaperJournalAcknowledged, approverName, setApproverName,
		isApproved, notes, setNotes, showPoModal, setShowPoModal, showMoreActions, setShowMoreActions,
		handleApproveAct, actHtml, generatedPurchaseOrder,
		handlePrint: () => printHtmlInNewWindow(actHtml),
		handleDownloadHtml: () => downloadHtmlFile(actHtml, `Акт_списания_${actNumber}.html`),
	};
}
