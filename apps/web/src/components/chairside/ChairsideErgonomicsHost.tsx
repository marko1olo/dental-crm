/**
 * ChairsideErgonomicsHost.tsx — Elite Clinical Ergonomics & Hardware Host Component.
 *
 * Mounts in App.tsx / AppShell.tsx.
 * Provides non-blocking HUD feedback for:
 * - Ctrl+V clipboard image paste with instant preview & 1-click attach
 * - Alt+H patient privacy shield status
 * - USB 2D hardware barcode / DataMatrix scan detection
 *
 * Rules: DESIGNER_VISUAL_INQUISITION_BIBLE.md & frontend.md
 */

import React from "react";
import { Camera, Check, Copy, QrCode, Shield, ShieldAlert, X } from "lucide-react";
import { useChairsideErgonomics } from "../../hooks/useChairsideErgonomics";
import "../../styles/modules/chairside-ergonomics.css";

export function ChairsideErgonomicsHost() {
	const {
		lastPastedImage,
		isPastedToastOpen,
		dismissPastedToast,
		lastScannedBarcode,
		isBarcodeToastOpen,
		dismissBarcodeToast,
		isPrivacyShieldActive,
		isPrivacyToastOpen,
		dismissPrivacyToast,
		togglePrivacyShield,
		attachPastedImageToVisit,
		copyPastedImageDataUrl,
	} = useChairsideErgonomics();

	const [isCopied, setIsCopied] = React.useState(false);

	const handleCopy = async () => {
		const success = await copyPastedImageDataUrl();
		if (success) {
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	};

	const hasActiveToasts = isPastedToastOpen || isBarcodeToastOpen || isPrivacyToastOpen;
	if (!hasActiveToasts && !isPrivacyShieldActive) return null;

	return (
		<>
			{isPrivacyShieldActive && (
				<button
					type="button"
					className="chairside-privacy-bottom-badge"
					data-testid="chairside-privacy-bottom-badge"
					onClick={() => togglePrivacyShield(false)}
					title="Выключить режим «Экран пациента» (Alt+H)"
				>
					<span className="pulse-dot" />
					<Shield size={14} style={{ color: "var(--teal)" }} />
					<span>Режим пациента: Конфиденциальные данные скрыты · Нажмите Alt+H для возврата</span>
				</button>
			)}
			{hasActiveToasts && (
				<div
					className="chairside-toast-container"
					role="region"
					aria-label="Уведомления клинической эргономики"
					data-testid="chairside-ergonomics-host"
				>
			{/* 1. Paste Anywhere Toast */}
			{isPastedToastOpen && lastPastedImage && (
				<div
					className="chairside-toast-card"
					data-testid="chairside-clipboard-toast"
					role="status"
					aria-live="polite"
				>
					<img
						src={lastPastedImage.dataUrl}
						alt="Превью снимка из буфера"
						className="chairside-toast-thumb"
					/>
					<div className="chairside-toast-content">
						<h4 className="chairside-toast-title">Снимок из буфера</h4>
						<p className="chairside-toast-subtitle">
							{lastPastedImage.width}×{lastPastedImage.height} ·{" "}
							{(lastPastedImage.size / 1024).toFixed(0)} КБ · {lastPastedImage.type.replace("image/", "")}
						</p>
					</div>
					<div className="chairside-toast-actions">
						<button
							type="button"
							onClick={attachPastedImageToVisit}
							className="chairside-toast-btn-primary"
							title="Прикрепить изображение к активному приёму"
							data-testid="chairside-attach-to-visit-btn"
						>
							<Camera size={14} />
							<span>✓ Прикрепить к приёму</span>
						</button>
						<button
							type="button"
							onClick={handleCopy}
							className="chairside-toast-btn-ghost"
							title={isCopied ? "Скопировано!" : "Копировать DataURL"}
						>
							{isCopied ? <Check size={14} color="var(--teal)" /> : <Copy size={14} />}
						</button>
						<button
							type="button"
							onClick={dismissPastedToast}
							className="chairside-toast-btn-ghost"
							title="Закрыть"
							data-testid="chairside-dismiss-paste-btn"
						>
							<X size={14} />
						</button>
					</div>
				</div>
			)}

			{/* 2. Hardware Barcode Sniffer Toast (Non-medication barcodes only) */}
			{isBarcodeToastOpen && lastScannedBarcode && lastScannedBarcode.type !== "datamatrix" && (
				<div
					className="chairside-toast-card"
					data-testid="chairside-barcode-toast"
					role="status"
					aria-live="polite"
				>
					<div className="chairside-toast-icon-wrap teal">
						<QrCode size={18} />
					</div>
					<div className="chairside-toast-content">
						<h4 className="chairside-toast-title">
							Отсканирован штрихкод ({lastScannedBarcode.type.toUpperCase()})
						</h4>
						<p className="chairside-toast-subtitle font-mono" title={lastScannedBarcode.code}>
							{lastScannedBarcode.code}
						</p>
					</div>
					<div className="chairside-toast-actions">
						<button
							type="button"
							onClick={dismissBarcodeToast}
							className="chairside-toast-btn-ghost"
							title="Закрыть"
							data-testid="chairside-dismiss-barcode-btn"
						>
							<X size={14} />
						</button>
					</div>
				</div>
			)}

			{/* 3. Privacy Shield Quick Toggle Toast */}
			{isPrivacyToastOpen && (
				<div
					className="chairside-toast-card"
					data-testid="chairside-privacy-toast"
					role="status"
					aria-live="polite"
				>
					<div className={`chairside-toast-icon-wrap ${isPrivacyShieldActive ? "teal" : "indigo"}`}>
						{isPrivacyShieldActive ? <Shield size={18} /> : <ShieldAlert size={18} />}
					</div>
					<div className="chairside-toast-content">
						<h4 className="chairside-toast-title">
							{isPrivacyShieldActive
								? "Режим конфиденциальности включен"
								: "Режим конфиденциальности выключен"}
						</h4>
						<p className="chairside-toast-subtitle">
							{isPrivacyShieldActive
								? "Финансовые суммы и балансы скрыты (Alt+H)"
								: "Полный доступ к финансовым данным"}
						</p>
					</div>
					<div className="chairside-toast-actions">
						<button
							type="button"
							onClick={dismissPrivacyToast}
							className="chairside-toast-btn-ghost"
							title="Закрыть"
							data-testid="chairside-dismiss-privacy-btn"
						>
							<X size={14} />
						</button>
					</div>
				</div>
			)}
				</div>
			)}
		</>
	);
}
