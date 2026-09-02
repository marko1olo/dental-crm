/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & AUTOCLAVING UNIFIED STUDIO MODAL
 * Комплексный центр управления стерилизацией, автоклавированием, пробами ПСО,
 * химическими индикаторами 4-5 классов и маркировкой крафт-пакетов.
 * ============================================================================
 */

import {
	Activity,
	AlertTriangle,
	Award,
	Calendar,
	CheckCircle2,
	Download,
	FileSpreadsheet,
	Flame,
	FlaskConical,
	Package,
	Plus,
	Printer,
	QrCode,
	Scan,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Tag,
	Thermometer,
	X,
	XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { AutoclaveRegisterTab } from "../sanpin/AutoclaveRegisterTab";
import { PsoRegisterTab } from "../sanpin/PsoRegisterTab";
import { KraftPackageBarcodeModal } from "../sanpin/kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal";
import { SeniorNurseKraftUnsealModal } from "../sanpin/kraft/SeniorNurseKraftUnsealModal";
import { KraftPackageQuickScanner } from "./KraftPackageQuickScanner";
import type { ParsedKraftBarcode } from "@dental/shared";
import "./sterilization.css";

export type SterilizationStudioTab =
	| "scanner"
	| "autoclave_cycles"
	| "pso_quality"
	| "kraft_labels";

export interface SterilizationStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: SterilizationStudioTab;
	readonly onAttachToProtocol?: (parsed: ParsedKraftBarcode) => void | Promise<void>;
	readonly currentDiaryBarcode?: string | null;
}

export function SterilizationStudioModal({
	isOpen,
	onClose,
	initialTab = "scanner",
	onAttachToProtocol,
	currentDiaryBarcode,
}: SterilizationStudioModalProps) {
	const [activeTab, setActiveTab] = useState<SterilizationStudioTab>(initialTab);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isUnsealModalOpen, setIsUnsealModalOpen] = useState(false);

	if (!isOpen) return null;

	return (
		<div
			className="sterilization-studio-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Студия стерилизации и автоклавирования СанПиН 3.3686-21"
			data-testid="sterilization-studio-modal"
		>
			<div className="sterilization-studio-modal" style={{ maxWidth: "1020px", height: "88vh" }}>
				{/* Top Header */}
				<div className="sterilization-header">
					<div className="sterilization-title-wrap">
						<div className="sterilization-badge-icon">
							<Flame size={24} />
						</div>
						<div>
							<h3 className="sterilization-title">
								Студия стерилизации и автоклавирования (СанПиН 3.3686-21)
							</h3>
							<div className="sterilization-subtitle">
								Учет циклов 134°C / 121°C • Формы 257/у и 366/у • Индикаторы 4-5 классов • Маркировка крафт-пакетов
							</div>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<span className="sterilization-tag valid">
							<CheckCircle2 size={13} /> Роспотребнадзор 2026 Ready
						</span>
						<button
							type="button"
							onClick={onClose}
							className="sterilization-close-btn"
							aria-label="Закрыть студию"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="sterilization-nav-tabs">
					<button
						type="button"
						onClick={() => setActiveTab("scanner")}
						className={`sterilization-tab-btn ${activeTab === "scanner" ? "active" : ""}`}
						data-testid="tab-steril-scanner"
					>
						<Scan size={16} /> 1-Клик Сканер 043/у
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("autoclave_cycles")}
						className={`sterilization-tab-btn ${activeTab === "autoclave_cycles" ? "active" : ""}`}
						data-testid="tab-steril-autoclaves"
					>
						<Flame size={16} /> Автоклавы (Форма № 257/у)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("pso_quality")}
						className={`sterilization-tab-btn ${activeTab === "pso_quality" ? "active" : ""}`}
						data-testid="tab-steril-pso"
					>
						<FlaskConical size={16} /> ПСО (Форма № 366/у)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("kraft_labels")}
						className={`sterilization-tab-btn ${activeTab === "kraft_labels" ? "active" : ""}`}
						data-testid="tab-steril-kraft"
					>
						<QrCode size={16} /> Маркировка крафт-пакетов
					</button>
				</div>

				{/* Tab Content */}
				<div className="sterilization-body" style={{ padding: activeTab === "scanner" ? "1.5rem" : "0.5rem" }}>
					{activeTab === "scanner" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div className="sterilization-kpi-grid">
								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">
										<Flame size={14} color="var(--teal, #0284c7)" /> Режимы автоклавирования
									</span>
									<span className="sterilization-kpi-value">134°C / 121°C</span>
									<span className="sterilization-kpi-hint">Класс B (фракционированный вакуум)</span>
								</div>

								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">
										<FlaskConical size={14} color="var(--ok-fg, #059669)" /> Химические интеграторы
									</span>
									<span className="sterilization-kpi-value">4 и 5 класс</span>
									<span className="sterilization-kpi-hint">ИнтеТЕСТ / Медтест / СтериТЕСТ</span>
								</div>

								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">
										<Package size={14} color="var(--info-fg, #7c3aed)" /> Срок стерильности
									</span>
									<span className="sterilization-kpi-value">50 – 180 суток</span>
									<span className="sterilization-kpi-hint">СанПиН 3.3686-21 табл. 3.14</span>
								</div>
							</div>

							<KraftPackageQuickScanner
								isOpen={true}
								onClose={onClose}
								onAttachToProtocol={onAttachToProtocol}
								currentDiaryBarcode={currentDiaryBarcode}
							/>
						</div>
					)}

					{activeTab === "autoclave_cycles" && (
						<div style={{ padding: "0.5rem", overflowY: "auto" }}>
							<AutoclaveRegisterTab />
						</div>
					)}

					{activeTab === "pso_quality" && (
						<div style={{ padding: "0.5rem", overflowY: "auto" }}>
							<PsoRegisterTab />
						</div>
					)}

					{activeTab === "kraft_labels" && (
						<div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
								<div>
									<h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
										Студия термомаркировки и печати крафт-пакетов
									</h4>
									<p style={{ margin: "0.2rem 0 0", fontSize: "0.825rem", color: "var(--muted)" }}>
										Генерация этикеток 58x40 мм, 43x25 мм, DataMatrix 2D и Code128 со сроками 50–180 суток
									</p>
								</div>

								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={() => setIsKraftModalOpen(true)}
										className="sterilization-action-btn primary"
										style={{ minHeight: "44px", fontSize: "0.875rem" }}
									>
										<QrCode size={16} /> Открыть студию печати
									</button>
									<button
										type="button"
										onClick={() => setIsUnsealModalOpen(true)}
										className="sterilization-action-btn secondary"
										style={{ minHeight: "44px", fontSize: "0.875rem" }}
									>
										<Tag size={16} /> Вскрытие пакета
									</button>
								</div>
							</div>

							<div className="sterilization-kpi-grid">
								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">Крафт одинарный (самоклеящийся)</span>
									<span className="sterilization-kpi-value">50 суток</span>
									<span className="sterilization-kpi-hint">СанПиН 3.3686-21 п. 3632</span>
								</div>

								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">Крафт двойной (двойной пакет)</span>
									<span className="sterilization-kpi-value">60 суток</span>
									<span className="sterilization-kpi-hint">СанПиН 3.3686-21 п. 3634</span>
								</div>

								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">Комбинированный (бумага + пленка)</span>
									<span className="sterilization-kpi-value">180 суток (6 мес)</span>
									<span className="sterilization-kpi-hint">Термосварка &gt;= 8 мм</span>
								</div>

								<div className="sterilization-kpi-card">
									<span className="sterilization-kpi-title">Бикс КСПФ с фильтром</span>
									<span className="sterilization-kpi-value">20 суток</span>
									<span className="sterilization-kpi-hint">После вскрытия — 24 ч</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Sub-modals */}
				<KraftPackageBarcodeModal
					isOpen={isKraftModalOpen}
					onClose={() => setIsKraftModalOpen(false)}
				/>
				<AutoclaveLog257Modal
					isOpen={isJournal257ModalOpen}
					onClose={() => setIsJournal257ModalOpen(false)}
				/>
				<SeniorNurseKraftUnsealModal
					isOpen={isUnsealModalOpen}
					onClose={() => setIsUnsealModalOpen(false)}
				/>
			</div>
		</div>
	);
}
