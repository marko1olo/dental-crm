/**
 * VisiographDropzoneActions.tsx — Кнопки действий зоны загрузки визиографа (RVG, DICOM, направление)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Activity, FileText, FileUp } from "lucide-react";
import { showToast } from "../../GlobalToast";

interface Props {
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onConnectRvg?: (() => void) | undefined;
	onUploadDicom?: (() => void) | undefined;
	onReferToRadiology?: (() => void) | undefined;
	toothCode?: string | undefined;
	effectivePatientId?: string | null | undefined;
	demoScanButton: React.ReactNode;
}

export const VisiographDropzoneActions: React.FC<Props> = ({
	fileInputRef, onConnectRvg, onUploadDicom, onReferToRadiology,
	toothCode, effectivePatientId, demoScanButton,
}) => {
	const handleConnect = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onConnectRvg) onConnectRvg();
		else {
			window.dispatchEvent(new CustomEvent("dente-open-rvg-capture", {
				detail: { toothCode, patientId: effectivePatientId },
			}));
			showToast("Запуск прямого захвата с визиографа RVG...", "info");
		}
	};

	const handleUpload = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onUploadDicom) onUploadDicom(); else fileInputRef.current?.click();
	};

	const handleReferral = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onReferToRadiology) onReferToRadiology();
		else {
			window.dispatchEvent(new CustomEvent("dente-open-radiology-referral", {
				detail: { toothCode, patientId: effectivePatientId },
			}));
			showToast("Открытие формы направления на рентген-диагностику", "info");
		}
	};

	const baseBtnStyle: React.CSSProperties = {
		display: "inline-flex", alignItems: "center", gap: "6px", height: "32px",
		borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
	};

	return (
		<div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: "6px" }}>
			<span role="button" tabIndex={0} data-tour="visiograph-open" data-testid="btn-visiograph-connect-rvg" onClick={handleConnect}
				style={{ ...baseBtnStyle, padding: "0 16px", background: "var(--teal)", color: "var(--on-teal, white)", border: "1px solid var(--teal)" }}>
				<Activity size={14} /> Подключить визиограф RVG
			</span>
			<span role="button" tabIndex={0} data-testid="btn-visiograph-upload-dicom" onClick={handleUpload}
				style={{ ...baseBtnStyle, padding: "0 14px", background: "var(--paper-strong, #1e293b)", color: "var(--ink, #f8fafc)", border: "1px solid var(--line, #334155)" }}>
				<FileUp size={14} /> Загрузить DICOM / КТ-архив
			</span>
			<span role="button" tabIndex={0} data-testid="btn-visiograph-referral" onClick={handleReferral}
				style={{ ...baseBtnStyle, padding: "0 14px", fontWeight: 500, background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)" }}>
				<FileText size={14} /> Направить на рентген
			</span>
			<span className="btn-primary"
				style={{ ...baseBtnStyle, padding: "0 14px", fontWeight: 500, background: "transparent", color: "var(--teal)", border: "1px solid var(--teal)" }}>
				Выбрать файл
			</span>
			{demoScanButton}
		</div>
	);
};
