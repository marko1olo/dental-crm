/**
 * PlanBeforeAfterGallery.tsx — Клинический фотопротокол «До / После» с интерактивной шторкой-слайдером
 * (DOMAIN: PORTAL PATIENT CABINET / CLINICAL PHOTO PROTOCOL & VITA SHADES)
 *
 * Соответствие:
 * - Мандат 8b: Модуль строго <= 800 строк.
 * - Мандат 8c: Тач-таргеты >= 44px на мобильных устройствах.
 * - Мандат 8d: Векторные иконки Lucide, ноль эмодзи.
 * - Мандат 11: Честные клинические фото, нулевые SVG-диорамы (data:image/svg+xml запрещен).
 * - Шкала VITA 3D-Master / Classical (A1..D4, Bleach BL1..BL4), расчет перехода оттенков.
 */

import React, { useState, useMemo } from "react";
import {
	Camera,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Eye,
	Layers,
	Sliders,
	Sparkles,
	Star,
	User,
} from "lucide-react";
import {
	type PatientBeforeAfterCase,
	PATIENT_PORTAL_BEFORE_AFTER_CASES,
} from "../patientCabinet/patientCabinetAppointments.js";
import {
	calculateSplitClipPath,
	type BeforeAfterComparisonPair,
} from "../patientWebappEngine.js";

export interface PlanBeforeAfterGalleryProps {
	readonly cases?: readonly PatientBeforeAfterCase[] | undefined;
	readonly pairs?: readonly BeforeAfterComparisonPair[] | undefined;
	readonly titleRu?: string | undefined;
	readonly subtitleRu?: string | undefined;
	readonly onCaseSelected?: ((c: PatientBeforeAfterCase) => void) | undefined;
}

export const PlanBeforeAfterGallery: React.FC<PlanBeforeAfterGalleryProps> = ({
	cases = PATIENT_PORTAL_BEFORE_AFTER_CASES,
	pairs,
	titleRu = "Клинический фотопротокол «До / После»",
	subtitleRu = "Наглядные результаты лечения пациентов DENTE с фиксацией оттенков по шкале VITA",
	onCaseSelected,
}) => {
	// Категория фильтра
	const [activeCategory, setActiveCategory] = useState<string>("all");
	// Выбранный клинический кейс для интерактивного слайдера
	const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id ?? "");
	// Положение шторки-слайдера (0% - 100%)
	const [sliderPercent, setSliderPercent] = useState<number>(50);
	// Развернутость клинических деталей
	const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

	const categories = useMemo(() => {
		const cats = Array.from(new Set(cases.map((c) => c.categoryRu)));
		return ["all", ...cats];
	}, [cases]);

	const filteredCases = useMemo(() => {
		if (activeCategory === "all") return cases;
		return cases.filter((c) => c.categoryRu === activeCategory);
	}, [cases, activeCategory]);

	const activeCase = useMemo(() => {
		return cases.find((c) => c.id === selectedCaseId) ?? cases[0] ?? null;
	}, [cases, selectedCaseId]);

	const toggleDetails = (id: string) => {
		setExpandedDetails((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	if (!cases || cases.length === 0) {
		return (
			<div
				className="pc-card pc-before-after-empty"
				data-testid="plan-before-after-empty"
				style={{
					padding: "32px 16px",
					textAlign: "center",
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "12px",
					border: "1px dashed var(--pc-border, #334155)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
				}}
			>
				<Camera size={32} style={{ color: "var(--pc-text-muted, #94a3b8)", opacity: 0.6 }} />
				<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
					Клинический фотопротокол формируется
				</h4>
				<p style={{ margin: 0, fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)", maxWidth: "340px" }}>
					Фотографии зубов до и после лечения будут загружены вашим лечащим врачом после завершения санации.
				</p>
			</div>
		);
	}

	return (
		<div
			className="pc-card pc-before-after-gallery-section"
			data-testid="plan-before-after-gallery"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1.5px solid var(--pc-border, #334155)",
				padding: "18px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			{/* Заголовок секции */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Sparkles size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
					<div>
						<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{titleRu}
						</h4>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							{subtitleRu}
						</p>
					</div>
				</div>
				<span
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: "var(--pc-primary, #0d9488)",
						backgroundColor: "rgba(13, 148, 136, 0.15)",
						padding: "4px 8px",
						borderRadius: "6px",
						border: "1px solid rgba(13, 148, 136, 0.3)",
					}}
				>
					VITA 3D-Master
				</span>
			</div>

			{/* Категории фильтра */}
			<div
				style={{
					display: "flex",
					gap: "6px",
					flexWrap: "wrap",
					paddingBottom: "4px",
				}}
			>
				{categories.map((cat) => {
					const isActive = activeCategory === cat;
					const label = cat === "all" ? "Все кейсы" : cat;
					return (
						<button
							key={cat}
							type="button"
							data-testid={`before-after-filter-${cat}`}
							onClick={() => setActiveCategory(cat)}
							style={{
								minHeight: "44px",
								padding: "8px 14px",
								borderRadius: "20px",
								border: `1px solid ${isActive ? "var(--pc-primary, #0d9488)" : "var(--pc-border, #334155)"}`,
								backgroundColor: isActive ? "rgba(13, 148, 136, 0.2)" : "var(--pc-surface, var(--paper-strong, #ffffff))",
								color: isActive ? "var(--pc-primary, #0d9488)" : "var(--pc-text-muted, #94a3b8)",
								fontSize: "12px",
								fontWeight: isActive ? 700 : 500,
								cursor: "pointer",
								touchAction: "manipulation",
							}}
						>
							{label}
						</button>
					);
				})}
			</div>

			{/* Интерактивный слайдер выбранного кейса (Wiper Slider) */}
			{activeCase && (
				<div
					data-testid="before-after-active-wiper-card"
					style={{
						backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "10px",
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
					}}
				>
					{/* Хэдер кейса */}
					<div
						style={{
							padding: "12px 14px",
							borderBottom: "1px solid var(--pc-border, #334155)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							flexWrap: "wrap",
							gap: "6px",
						}}
					>
						<div>
							<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", textTransform: "uppercase" }}>
								{activeCase.categoryRu}
							</span>
							<h5 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
								{activeCase.titleRu}
							</h5>
						</div>

						<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							{activeCase.doctorName} &bull; {activeCase.durationRu}
						</div>
					</div>

					{/* Интерактивная область сравнения До / После со шторкой */}
					<div
						data-testid="before-after-wiper-container"
						style={{
							position: "relative",
							height: "280px",
							backgroundColor: "#020617",
							overflow: "hidden",
							userSelect: "none",
						}}
					>
						{/* Слой "После" (нижний, полный) */}
						<img
							src={activeCase.afterImageUrl}
							alt={activeCase.afterLabelRu}
							loading="lazy"
							decoding="async"
							style={{
								position: "absolute",
								inset: 0,
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>

						{/* Слой "До" (верхний, с clip-path) */}
						<div
							style={{
								position: "absolute",
								inset: 0,
								clipPath: calculateSplitClipPath(sliderPercent, "vertical"),
								overflow: "hidden",
							}}
						>
							<img
								src={activeCase.beforeImageUrl}
								alt={activeCase.beforeLabelRu}
								loading="lazy"
								decoding="async"
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
							/>
						</div>

						{/* Плашка "До" (слева сверху) */}
						<span
							style={{
								position: "absolute",
								top: "10px",
								left: "10px",
								backgroundColor: "rgba(15, 23, 42, 0.85)",
								color: "#ffffff",
								fontSize: "11px",
								fontWeight: 700,
								padding: "3px 8px",
								borderRadius: "4px",
								border: "1px solid rgba(255, 255, 255, 0.2)",
								backdropFilter: "blur(4px)",
								zIndex: 5,
							}}
						>
							{activeCase.beforeLabelRu}
						</span>

						{/* Плашка "После" (справа сверху) */}
						<span
							style={{
								position: "absolute",
								top: "10px",
								right: "10px",
								backgroundColor: "rgba(13, 148, 136, 0.9)",
								color: "#ffffff",
								fontSize: "11px",
								fontWeight: 800,
								padding: "3px 8px",
								borderRadius: "4px",
								border: "1px solid rgba(255, 255, 255, 0.3)",
								backdropFilter: "blur(4px)",
								zIndex: 5,
							}}
						>
							{activeCase.afterLabelRu}
						</span>

						{/* Вертикальная линия разделителя */}
						<div
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								left: `${sliderPercent}%`,
								width: "2px",
								backgroundColor: "#ffffff",
								boxShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
								zIndex: 6,
								pointerEvents: "none",
							}}
						>
							{/* Кругляш ползунка */}
							<div
								style={{
									position: "absolute",
									top: "50%",
									left: "50%",
									transform: "translate(-50%, -50%)",
									width: "32px",
									height: "32px",
									borderRadius: "50%",
									backgroundColor: "#ffffff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#0f172a",
									fontSize: "12px",
									fontWeight: 800,
								}}
							>
								↔
							</div>
						</div>
					</div>

					{/* Ползунок слайдера */}
					<div
						style={{
							padding: "10px 16px",
							backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
							borderTop: "1px solid var(--pc-border, #334155)",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}
					>
						<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--pc-text-muted, #94a3b8)", whiteSpace: "nowrap" }}>
							До ({100 - sliderPercent}%)
						</span>
						<input
							type="range"
							min="0"
							max="100"
							value={sliderPercent}
							onChange={(e) => setSliderPercent(Number(e.target.value))}
							aria-label="Сравнение До и После"
							data-testid="before-after-slider-input"
							style={{
								flex: 1,
								minHeight: "44px",
								cursor: "pointer",
								accentColor: "var(--pc-primary, #0d9488)",
							}}
						/>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", whiteSpace: "nowrap" }}>
							После ({sliderPercent}%)
						</span>
					</div>

					{/* Описание клинического случая */}
					<div
						style={{
							padding: "12px 16px",
							backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
							borderTop: "1px solid var(--pc-border, #334155)",
							fontSize: "12px",
							lineHeight: "1.4",
						}}
					>
						<p style={{ margin: "0 0 6px 0", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{activeCase.descriptionRu}
						</p>

						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
							<span style={{ color: "var(--pc-text-muted, #94a3b8)" }}>
								{activeCase.toothFdi ? `Зубы FDI: ${activeCase.toothFdi}` : ""}
							</span>
							<button
								type="button"
								onClick={() => toggleDetails(activeCase.id)}
								style={{
									minHeight: "44px",
									background: "transparent",
									border: "none",
									color: "var(--pc-primary, #0d9488)",
									fontSize: "12px",
									fontWeight: 700,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "4px",
									padding: "4px 8px",
								}}
							>
								{expandedDetails[activeCase.id] ? (
									<>
										<span>Скрыть детали</span>
										<ChevronUp size={14} />
									</>
								) : (
									<>
										<span>Клинические протоколы</span>
										<ChevronDown size={14} />
									</>
								)}
							</button>
						</div>

						{expandedDetails[activeCase.id] && (
							<div
								style={{
									marginTop: "8px",
									padding: "10px",
									backgroundColor: "rgba(13, 148, 136, 0.08)",
									borderRadius: "6px",
									border: "1px solid rgba(13, 148, 136, 0.2)",
									color: "var(--pc-text-main, var(--ink, #0f172a))",
								}}
							>
								<strong>Протокол фиксации и материалы:</strong> {activeCase.clinicalDetailsRu}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Миниатюры остальных кейсов для быстрого выбора */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "10px",
					marginTop: "4px",
				}}
			>
				{filteredCases.map((c) => {
					const isCurrent = c.id === activeCase?.id;
					return (
						<div
							key={c.id}
							data-testid={`before-after-case-card-${c.id}`}
							onClick={() => {
								setSelectedCaseId(c.id);
								setSliderPercent(50);
								if (onCaseSelected) onCaseSelected(c);
							}}
							style={{
								padding: "10px",
								borderRadius: "8px",
								border: `1px solid ${isCurrent ? "var(--pc-primary, #0d9488)" : "var(--pc-border, #334155)"}`,
								backgroundColor: isCurrent ? "rgba(13, 148, 136, 0.12)" : "var(--pc-surface, var(--paper-strong, #ffffff))",
								cursor: "pointer",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								transition: "all 0.15s ease",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pc-primary, #0d9488)" }}>
									{c.categoryRu}
								</span>
								{isCurrent && <CheckCircle2 size={14} style={{ color: "var(--pc-primary, #0d9488)" }} />}
							</div>
							<strong style={{ fontSize: "12px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
								{c.titleRu}
							</strong>
							<span style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
								{c.durationRu} &bull; {c.doctorName}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export { PlanBeforeAfterGallery as PatientPlanBeforeAfterGallery };
export default PlanBeforeAfterGallery;
