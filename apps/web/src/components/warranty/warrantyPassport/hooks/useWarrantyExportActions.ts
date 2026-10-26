import { useCallback, useState } from "react";
import { generateWarrantyPatientMemo, generateWarrantyRemediationActHtml, type WarrantyCertificateData, type WarrantyRemediationOrder } from "../../warrantyEngine.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { AttachedWarrantyPayload, WarrantyPatientMeta } from "../types";

export interface UseWarrantyExportActionsParams {
	certificateData: WarrantyCertificateData;
	certificateHtml: string;
	patient?: WarrantyPatientMeta;
	doctorName?: string;
	onAttachToForm043u?: (payload: AttachedWarrantyPayload) => void;
	onCertificateIssued?: (data: WarrantyCertificateData) => void;
}

export function useWarrantyExportActions({
	certificateData, certificateHtml, patient, doctorName, onAttachToForm043u, onCertificateIssued,
}: UseWarrantyExportActionsParams) {
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedMemo, setCopiedMemo] = useState(false);
	const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
	const [attachedStatus, setAttachedStatus] = useState(false);

	const handlePrint = useCallback(() => {
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (!printWin) return;
		printWin.document.write(certificateHtml);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 300);
	}, [certificateHtml]);

	const handlePrintRemediationAct = (order: WarrantyRemediationOrder) => {
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (!printWin) return;
		printWin.document.write(generateWarrantyRemediationActHtml(order));
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 300);
	};

	const handleCopyLink = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(certificateData.verificationUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2500);
		}
	};

	const handleCopyMemo = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(generateWarrantyPatientMemo(certificateData));
			setCopiedMemo(true);
			setTimeout(() => setCopiedMemo(false), 2500);
		}
	};

	const handleShareWhatsApp = () => {
		const memo = generateWarrantyPatientMemo(certificateData);
		const phoneDigits = patient?.phone ? patient.phone.replace(/\D/g, "") : "";
		const waUrl = phoneDigits
			? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(memo)}`
			: `https://api.whatsapp.com/send?text=${encodeURIComponent(memo)}`;
		window.open(waUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	const handleShareTelegram = () => {
		const memo = generateWarrantyPatientMemo(certificateData);
		const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(certificateData.verificationUrl)}&text=${encodeURIComponent(memo)}`;
		window.open(tgUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	const handleAttachTo043u = async () => {
		setAttachedStatus(true);
		onAttachToForm043u?.({
			certificateId: certificateData.certificateId,
			attachedAt: new Date().toISOString(),
			fullHtml: certificateHtml,
			integrityHash: certificateData.integrityHash,
			itemCount: certificateData.items.length,
			adjustedWarrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
		});
		onCertificateIssued?.(certificateData);

		if (!patient?.id) return;
		try {
			const status = certificateData.calculation.warrantyStatus === "void_risk" ? "voided"
				: certificateData.calculation.warrantyStatus === "conditional" || certificateData.calculation.warrantyStatus === "reduced"
					? "conditional" : "active";
			await fetch("/api/warranty/certificates", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: patient.id,
					certificateNumber: certificateData.certificateId,
					status,
					items: certificateData.items,
					warrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
					serviceLifeMonths: certificateData.calculation.adjustedServiceLifeMonths,
					issuedAt: certificateData.issueDate ? new Date(certificateData.issueDate).toISOString() : new Date().toISOString(),
					expiresAt: certificateData.calculation.warrantyExpirationDate ? new Date(certificateData.calculation.warrantyExpirationDate).toISOString() : null,
					nextRecallDate: certificateData.calculation.nextCheckupDueDate ? new Date(certificateData.calculation.nextCheckupDueDate).toISOString() : null,
					integritySha256: certificateData.integrityHash,
					notes: `Оформлен гарантийный паспорт. Врач: ${doctorName || "Лечащий врач"}.`,
				}),
			});
		} catch (err) {
			console.error("Failed to persist warranty certificate to backend:", err);
		}
	};

	return {
		copiedLink, copiedMemo, isShareMenuOpen, setIsShareMenuOpen, attachedStatus, setAttachedStatus,
		handlePrint, handlePrintRemediationAct, handleCopyLink, handleCopyMemo, handleShareWhatsApp,
		handleShareTelegram, handleAttachTo043u,
	};
}
