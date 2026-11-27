import { useCallback, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { generateWarrantyPatientMemo, generateWarrantyRemediationActHtml, type WarrantyCertificateData, type WarrantyRemediationOrder } from "../../warrantyEngine.js";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { showToast } from "../../../GlobalToast";
import type { AttachedWarrantyPayload, HistoricalWarrantyCertificate, WarrantyPatientMeta } from "../types";

export interface UseWarrantyExportActionsParams {
	certificateData: WarrantyCertificateData;
	certificateHtml: string;
	patient?: WarrantyPatientMeta | null | undefined;
	visitId?: string | null | undefined;
	doctorName?: string | null | undefined;
	onAttachToClinicalNote?: ((payload: AttachedWarrantyPayload) => void) | undefined;
	onCertificateIssued?: ((data: WarrantyCertificateData) => void) | undefined;
	onCertificatePersisted?: ((certificate: HistoricalWarrantyCertificate) => void) | undefined;
}

export function useWarrantyExportActions({
	certificateData, certificateHtml, patient, visitId, doctorName, onAttachToClinicalNote, onCertificateIssued, onCertificatePersisted,
}: UseWarrantyExportActionsParams) {
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedMemo, setCopiedMemo] = useState(false);
	const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
	const [attachedStatus, setAttachedStatus] = useState(false);

	const persistCertificateToBackend = useCallback(async () => {
		onCertificateIssued?.(certificateData);
		if (!patient?.id) return;
		try {
			const status = certificateData.calculation.warrantyStatus === "void_risk" ? "voided"
				: certificateData.calculation.warrantyStatus === "conditional" || certificateData.calculation.warrantyStatus === "reduced"
					? "conditional" : "active";
			const cleanVisitId =
				visitId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitId)
					? visitId
					: null;
			const res = await fetch("/api/warranty/certificates", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					patientId: patient.id,
					visitId: cleanVisitId,
					certificateNumber: certificateData.certificateId,
					status,
					items: certificateData.items.map((item) => {
						const title = item.clinicalWorkTitle || "Стоматологическая работа";
						return {
							...item,
							name: title,
							clinicalWorkTitle: title,
						};
					}),
					warrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
					serviceLifeMonths: certificateData.calculation.adjustedServiceLifeMonths,
					issuedAt: certificateData.issueDate ? new Date(certificateData.issueDate).toISOString() : new Date().toISOString(),
					expiresAt: certificateData.calculation.warrantyExpirationDate ? new Date(certificateData.calculation.warrantyExpirationDate).toISOString() : null,
					nextRecallDate: certificateData.calculation.nextCheckupDueDate ? new Date(certificateData.calculation.nextCheckupDueDate).toISOString() : null,
					integritySha256: certificateData.integrityHash,
					notes: `Оформлен гарантийный паспорт. Врач: ${doctorName || "Лечащий врач"}.`,
				}),
			});
			if (!res.ok) {
				const errText = await res.text().catch(() => "");
				clientLogger.error("[useWarrantyExportActions] Не удалось сохранить гарантийный паспорт", {
					status: res.status,
					errText,
				}, { module: "Warranty" });
				showToast("Не удалось сохранить гарантийный паспорт на сервере", "error");
			} else {
				let json: {
					data?: { certificate?: HistoricalWarrantyCertificate };
					certificate?: HistoricalWarrantyCertificate;
				} | null = null;
				try {
					json = (await res.json()) as {
						data?: { certificate?: HistoricalWarrantyCertificate };
						certificate?: HistoricalWarrantyCertificate;
					} | null;
				} catch (jsonErr: unknown) {
					clientLogger.warn("[useWarrantyExportActions] Invalid JSON response on certificate save", jsonErr, {
						module: "Warranty",
					});
				}
				const savedCert = json?.data?.certificate ?? json?.certificate;
				if (savedCert?.id) {
					onCertificatePersisted?.(savedCert);
				}
			}
		} catch (err) {
			clientLogger.error("[useWarrantyExportActions] Сетевой сбой при сохранении гарантийного паспорта", err, {
				module: "Warranty",
			});
			showToast("Сетевая ошибка: гарантийный паспорт не сохранён на сервере", "error");
		}
	}, [certificateData, doctorName, onCertificateIssued, onCertificatePersisted, patient?.id, visitId]);

	const handlePrint = useCallback(() => {
		void persistCertificateToBackend();
		const printWin = window.open("", "_blank", "width=850,height=1000");
		if (!printWin) return;
		printWin.document.write(certificateHtml);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 300);
	}, [certificateHtml, persistCertificateToBackend]);

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
		void persistCertificateToBackend();
		const memo = generateWarrantyPatientMemo(certificateData);
		const phoneDigits = patient?.phone ? patient.phone.replace(/\D/g, "") : "";
		const waUrl = phoneDigits
			? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(memo)}`
			: `https://api.whatsapp.com/send?text=${encodeURIComponent(memo)}`;
		window.open(waUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	const handleShareTelegram = () => {
		void persistCertificateToBackend();
		const memo = generateWarrantyPatientMemo(certificateData);
		const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(certificateData.verificationUrl)}&text=${encodeURIComponent(memo)}`;
		window.open(tgUrl, "_blank");
		setIsShareMenuOpen(false);
	};

	const handleAttachToClinicalNote = async () => {
		setAttachedStatus(true);
		onAttachToClinicalNote?.({
			certificateId: certificateData.certificateId,
			attachedAt: new Date().toISOString(),
			fullHtml: certificateHtml,
			integrityHash: certificateData.integrityHash,
			itemCount: certificateData.items.length,
			adjustedWarrantyMonths: certificateData.calculation.adjustedWarrantyMonths,
		});
		await persistCertificateToBackend();
	};

	return {
		copiedLink, copiedMemo, isShareMenuOpen, setIsShareMenuOpen, attachedStatus, setAttachedStatus,
		handlePrint, handlePrintRemediationAct, handleCopyLink, handleCopyMemo, handleShareWhatsApp,
		handleShareTelegram, handleAttachToClinicalNote,
	};
}
