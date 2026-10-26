import React from "react";
import { Camera, ShieldCheck, Sparkles, FileText } from "lucide-react";

export interface ScannerHeaderBarProps {
	readonly activeSubTab: "scanner" | "sanpin";
	readonly onSelectSubTab: (tab: "scanner" | "sanpin") => void;
}

export function ScannerHeaderBar({ activeSubTab, onSelectSubTab }: ScannerHeaderBarProps) {
	return (
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

			{/* Segmented Mode Selector: [ Журналы СанПиН | Сканер документов ] */}
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
					aria-selected={activeSubTab === "sanpin"}
					data-testid="scanner-tab-sanpin"
					onClick={() => onSelectSubTab("sanpin")}
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
				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "scanner"}
					data-testid="scanner-tab-camera"
					onClick={() => onSelectSubTab("scanner")}
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
					<span>Сканер документов</span>
				</button>
			</div>

			<div className="scanner-header-telemetry">
				<div className="scanner-status-chip">
					<span className="scanner-status-dot" />
					<span>{activeSubTab === "sanpin" ? "ЦСО активен" : "Сканер активен"}</span>
				</div>
				<div className="scanner-status-chip">
					<ShieldCheck size={13} className="text-[var(--teal)]" />
					<span>{activeSubTab === "sanpin" ? "Стерилизация и дезинфекция" : "Защита данных пациентов"}</span>
				</div>
			</div>
		</header>
	);
}

export default ScannerHeaderBar;
