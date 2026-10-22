/**
 * ScannerView.tsx
 *
 * Dedicated Document Scanner Cockpit (Рабочее пространство оцифровки документов регистратуры).
 * Integrated live webcam/UVC scanner feed, document aspect-ratio presets (Passport РФ, СНИЛС,
 * ОМС/ДМС, Согласия), contrast & binarization enhancements, instant OCR detection,
 * patient search, and 1-click attachment to electronic medical records (EMR).
 */

import React, { useState, useEffect } from "react";
import { Camera, ShieldCheck, Sparkles, FileText } from "lucide-react";
import { AutoclaveSterilizationLogModal, AutoclaveLog257Modal } from "./components/sanpin/autoclaveLog/AutoclaveSterilizationLogModal";
import { KraftPackageBarcodeModal } from "./components/sanpin/kraft/KraftPackageBarcodeModal";
import { SanpinRegisters, SanpinRegisters as SanpinRegistersView } from "./components/sanpin/SanpinRegisters";
import { DocumentCameraScannerModal } from "./components/scanner/DocumentCameraScannerModal";
import { ScannerDocumentStage } from "./components/scanner/ScannerDocumentStage";
import { ScannerPatientIntakePanel } from "./components/scanner/ScannerPatientIntakePanel";
import { useScannerCockpit } from "./components/scanner/useScannerCockpit";
import "./components/scanner/scannerCockpit.css";

export function ScannerView() {
	const cockpit = useScannerCockpit();

	const [activeSubTab, setActiveSubTab] = useState<"scanner" | "sanpin">(() => {
		if (typeof window !== "undefined") {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("sanpin") || search.includes("steril") || hash.includes("sanpin") || hash.includes("steril")) {
				return "sanpin";
			}
		}
		return "scanner";
	});

	useEffect(() => {
		const checkHash = () => {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("sanpin") || search.includes("steril") || hash.includes("sanpin") || hash.includes("steril")) {
				setActiveSubTab("sanpin");
			}
		};
		window.addEventListener("hashchange", checkHash);
		return () => window.removeEventListener("hashchange", checkHash);
	}, []);

	return (
		<div className="scanner-cockpit-root" data-testid="scanner-view-root">
			{/* Header Bar with Sub-Tab Switcher */}
			<header className="scanner-header-bar">
				<div className="scanner-header-title-group">
					<div className="scanner-header-icon">
						{activeSubTab === "sanpin" ? <Sparkles size={22} /> : <Camera size={22} />}
					</div>
					<div>
						<h1 className="scanner-header-title">
							{activeSubTab === "sanpin"
								? "Журналы стерилизации и санитарного режима"
								: "Оцифровка документов регистратуры"}
						</h1>
						<p className="scanner-header-subtitle">
							{activeSubTab === "sanpin"
								? "Автоклавирование, предстерилизационная очистка, упаковка инструментов и списание в 1 клик"
								: "Быстрое сканирование паспорта, СНИЛС, полиса ОМС и прикрепление к медкарте"}
						</p>
					</div>
				</div>

				{/* Segmented Mode Selector */}
				<div
					className="scanner-mode-switcher"
					role="tablist"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px",
						borderRadius: "12px",
						background: "var(--paper-soft, #f1f5f9)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "scanner"}
						data-testid="scanner-tab-camera"
						onClick={() => setActiveSubTab("scanner")}
						style={{
							height: "34px",
							padding: "0 14px",
							borderRadius: "8px",
							border: "none",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "0.85rem",
							fontWeight: activeSubTab === "scanner" ? 600 : 500,
							background: activeSubTab === "scanner" ? "var(--paper, #ffffff)" : "transparent",
							color: activeSubTab === "scanner" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
							boxShadow: activeSubTab === "scanner" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
							transition: "all 0.15s ease",
						}}
					>
						<FileText size={16} />
						<span>Документы</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "sanpin"}
						data-testid="scanner-tab-sanpin"
						onClick={() => setActiveSubTab("sanpin")}
						style={{
							height: "34px",
							padding: "0 14px",
							borderRadius: "8px",
							border: "none",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "0.85rem",
							fontWeight: activeSubTab === "sanpin" ? 600 : 500,
							background: activeSubTab === "sanpin" ? "var(--paper, #ffffff)" : "transparent",
							color: activeSubTab === "sanpin" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
							boxShadow: activeSubTab === "sanpin" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
							transition: "all 0.15s ease",
						}}
					>
						<Sparkles size={16} />
						<span>Журналы СанПиН</span>
					</button>
				</div>

				<div className="scanner-header-telemetry">
					<div className="scanner-status-chip">
						<span className="scanner-status-dot" />
						<span>{activeSubTab === "sanpin" ? "ЦСО активен" : "Сканер активен"}</span>
					</div>
					<div className="scanner-status-chip">
						<ShieldCheck size={13} className="text-[var(--teal)]" />
						<span>{activeSubTab === "sanpin" ? "СанПиН 3.3686-21" : "152-ФЗ защита ПДн"}</span>
					</div>
				</div>
			</header>

			{/* Sub-view Rendering */}
			{activeSubTab === "sanpin" ? (
				<div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
					<SanpinRegisters />
				</div>
			) : (
				<div className="scanner-grid-layout">
					{/* Left Column: Viewport, Presets, Filters & Capture Controls */}
					<ScannerDocumentStage cockpit={cockpit} />

					{/* Right Column: Patient Intake, OCR Inspector & Primary CTA */}
					<ScannerPatientIntakePanel cockpit={cockpit} />
				</div>
			)}
		</div>
	);
}

// Preserve backwards-compatible exports for any legacy consumers
export {
	SanpinRegisters,
	SanpinRegistersView,
	KraftPackageBarcodeModal,
	AutoclaveSterilizationLogModal,
	AutoclaveLog257Modal,
	DocumentCameraScannerModal,
};
export default ScannerView;
