import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	Crown,
	Sparkles,
	Stethoscope,
	X,
	Zap,
} from "lucide-react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import type { ToothClinicalServicePayload } from "@dental/shared";
import { VisitClinicalToothTabs } from "./VisitClinicalToothTabs";

export interface VisitClinicalToothModalProps {
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	closeClinicalModal: () => void;
	toothStateByCode: Record<string, string>;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleSelectSurface: (surf: string) => void;
	selectedSurfaces: string[];
	isSurfaceMode: boolean;
	setIsSurfaceMode: React.Dispatch<React.SetStateAction<boolean>>;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	appendToEMKField: (field: string, text: string) => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[];
	onAddServiceToTooth?: ((service: ToothClinicalServicePayload) => void) | undefined;
}

type TabType = "diagnosis" | "therapy" | "endo" | "surgery";

export function VisitClinicalToothModal({
	selectedToothForMenu,
	closeClinicalModal,
	toothStateByCode,
	materialCategory,
	setMaterialCategory,
	handleSelectDiagnosis,
	handleSelectSurface,
	selectedSurfaces,
	isSurfaceMode: _isSurfaceMode,
	setIsSurfaceMode: _setIsSurfaceMode,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	appendToEMKField,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
	onAddServiceToTooth,
}: VisitClinicalToothModalProps) {
	if (!selectedToothForMenu || typeof document === "undefined") return null;

	const { code } = selectedToothForMenu;
	// biome-ignore lint/suspicious/noExplicitAny: state lookup
	const state = (toothStateByCode as any)[code] ?? "idle";
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));

	// По умолчанию открываем Терапию, если зуб в лечении/наблюдении, иначе Диагностику
	const [activeTab, setActiveTab] = useState<TabType>(() => {
		if (materialCategory) {
			return materialCategory === "crown" || materialCategory === "veneer" || materialCategory === "implant"
				? "surgery"
				: "therapy";
		}
		return state === "treatment" || state === "watch" ? "therapy" : "diagnosis";
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeClinicalModal();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeClinicalModal]);

	const FILL: Record<string, string> = {
		idle: "var(--paper)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const STROKE: Record<string, string> = {
		idle: "var(--line-strong, #64748b)",
		planned: "var(--teal, #0284c7)",
		treatment: "var(--bad-fg, #dc2626)",
		watch: "var(--warn-fg, #d97706)",
		done: "var(--ok-fg, #166534)",
		missing: "var(--line, #cbd5e1)",
	};
	const ROOT_FILL: Record<string, string> = {
		idle: "var(--paper-soft)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const ROOT_STROKE: Record<string, string> = {
		idle: "var(--line, #cbd5e1)",
		planned: "var(--teal, #38bdf8)",
		treatment: "var(--bad-fg, #f87171)",
		watch: "var(--warn-fg, #fbbf24)",
		done: "var(--ok-fg, #4ade80)",
		missing: "var(--line, #cbd5e1)",
	};

	const isLower = Number(code) >= 30;

	// Статусный лейбл
	const statusMeta =
		state === "treatment"
			? { label: "Лечение", color: "text-red-500", dot: "bg-red-500" }
			: state === "watch"
				? { label: "Кариес", color: "text-amber-500", dot: "bg-amber-500" }
				: state === "done"
					? { label: "Санирован", color: "text-emerald-500", dot: "bg-emerald-500" }
					: state === "missing"
						? { label: "Удалён", color: "text-slate-400", dot: "bg-slate-400" }
						: { label: "Интактен", color: "text-emerald-600", dot: "bg-emerald-500" };

	const toothSvgMini = (
		<svg
			aria-hidden="true"
			width="22"
			height="28"
			viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			fill="none"
			style={{ transform: isLower ? "scaleY(-1)" : "none" }}
		>
			{state === "missing" ? (
				<g>
					<path
						d={geom.root}
						fill="var(--paper-soft)"
						stroke="var(--muted)"
						strokeWidth="1.2"
						opacity="0.3"
					/>
					<path
						d={geom.crown}
						fill="var(--paper-soft)"
						stroke="var(--muted)"
						strokeWidth="1.2"
						opacity="0.3"
					/>
					<path
						d="M20 20L80 130M80 20L20 130"
						stroke="var(--bad-fg, #ef4444)"
						strokeWidth="4"
						strokeLinecap="round"
					/>
				</g>
			) : (
				<g>
					<path
						d={geom.root}
						fill={ROOT_FILL[state] ?? "var(--paper-soft)"}
						stroke={ROOT_STROKE[state] ?? "var(--line)"}
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
					{geom.canals && (state === "treatment" || state === "done") && (
						<path
							d={geom.canals}
							fill="none"
							stroke={state === "done" ? "#ec4899" : "#dc2626"}
							strokeWidth="2.5"
							strokeLinecap="round"
							opacity="0.85"
						/>
					)}
					<path
						d={geom.crown}
						fill={FILL[state] ?? "var(--paper)"}
						stroke={STROKE[state] ?? "var(--line-strong)"}
						strokeWidth="1.8"
						strokeLinejoin="round"
					/>
				</g>
			)}
		</svg>
	);

	return createPortal(
		<>
			<button
				type="button"
				className="_ccm-overlay"
				onClick={closeClinicalModal}
				onKeyDown={(e) =>
					(e.key === "Enter" || e.key === " ") && closeClinicalModal()
				}
				aria-label="Закрыть"
			/>
			<div
				className="_ccm-content"
				role="dialog"
				aria-modal="true"
				aria-label={`Клиническая карта: Зуб ${code}`}
			>
				{/* ── NATIVE APPLE HIG DRAG HANDLE FOR MOBILE BOTTOM SHEET ── */}
				<div className="_ccm-drag-handle-wrap" aria-hidden="true">
					<div className="_ccm-drag-handle" />
				</div>

				{/* ── 1. STUDIO HEADER ── */}
				<div className="_ccm-header">
					<div className="_ccm-header-left">
						<div className="_ccm-tooth-badge" aria-hidden="true">
							{toothSvgMini}
						</div>
						<div className="_ccm-header-title-wrap">
							<span className="_ccm-tooth-title">Зуб {code}</span>
							<span className="_ccm-fdi-badge">FDI</span>
							<span className="_ccm-status-pill">
								<span className={`_ccm-status-dot ${statusMeta.dot}`} />
								<span>{statusMeta.label}</span>
							</span>
						</div>
					</div>

					{/* Сегментные чипы полостей Блэка */}
					<div className="_ccm-cavity-cluster">
						<span className="_ccm-cavity-label">Блэк:</span>
						<div className="_ccm-cavity-pills">
							{["O", "MO", "OD", "MOD", "V"].map((cavity) => {
								const isSelected = selectedSurfaces.includes(cavity);
								return (
									<button
										key={cavity}
										type="button"
										data-testid={`btn-cavity-${cavity.toLowerCase()}`}
										onClick={() => handleSelectSurface(cavity)}
										className={`_ccm-cavity-btn${isSelected ? " active" : ""}`}
										title={`Полость класса ${cavity}`}
									>
										{cavity}
									</button>
								);
							})}
						</div>
					</div>

					{/* Кнопка закрытия */}
					<button
						type="button"
						onClick={closeClinicalModal}
						className="_ccm-close-btn-icon"
						aria-label="Закрыть модальное окно"
						title="Закрыть (Esc)"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>

				{/* ── 2. SEGMENTED TABS (STUDIO HIG) ── */}
				<div className="_ccm-tabs-bar">
					<button
						type="button"
						onClick={() => setActiveTab("diagnosis")}
						className={`_ccm-tab-btn${activeTab === "diagnosis" ? " active" : ""}`}
					>
						<Stethoscope className="w-3.5 h-3.5 shrink-0" />
						<span>Диагностика</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("therapy")}
						className={`_ccm-tab-btn${activeTab === "therapy" ? " active" : ""}`}
					>
						<Sparkles className="w-3.5 h-3.5 shrink-0" />
						<span>Терапия & Пломба</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("endo")}
						className={`_ccm-tab-btn${activeTab === "endo" ? " active" : ""}`}
					>
						<Zap className="w-3.5 h-3.5 shrink-0" />
						<span>Эндодонтия</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("surgery")}
						className={`_ccm-tab-btn${activeTab === "surgery" ? " active" : ""}`}
					>
						<Crown className="w-3.5 h-3.5 shrink-0" />
						<span>Орто & Хирургия</span>
					</button>
				</div>

				{/* ── 3. BODY CONTENT (STUDIO DENSITY, ZERO CLIPPING) ── */}
				<VisitClinicalToothTabs
					activeTab={activeTab}
					selectedToothForMenu={selectedToothForMenu}
					code={code}
					state={state}
					materialCategory={materialCategory}
					setMaterialCategory={setMaterialCategory}
					selectedSurfaces={selectedSurfaces}
					handleSelectDiagnosis={handleSelectDiagnosis}
					appendToEMKField={appendToEMKField}
					closeClinicalModal={closeClinicalModal}
					setEndoModalToothNumber={setEndoModalToothNumber}
					setEndoModalToothState={setEndoModalToothState}
					setIsEndoModalOpen={setIsEndoModalOpen}
					setLabOrderModalToothNumber={setLabOrderModalToothNumber}
					setIsLabOrderModalOpen={setIsLabOrderModalOpen}
					visitWarnings={visitWarnings}
					onAddServiceToTooth={onAddServiceToTooth}
				/>

				{/* ── 4. STUDIO FOOTER ── */}
				<div className="_ccm-footer">
					<span className="_ccm-footer-hint">
						{selectedSurfaces.length > 0
							? `Выбрана полость: [${selectedSurfaces.join("")}]`
							: `Зуб ${code} · Клинический протокол`}
					</span>
					<button
						type="button"
						onClick={closeClinicalModal}
						className="_ccm-footer-done-btn"
					>
						Готово
					</button>
				</div>
			</div>
		</>,
		document.body,
	);
}
