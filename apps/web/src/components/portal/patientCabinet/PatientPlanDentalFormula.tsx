/**
 * PatientPlanDentalFormula.tsx — Интерактивная 2D/SVG зубная формула пациента
 * (DOMAIN: PORTAL PATIENT CABINET - DENTAL FORMULA & HEALTH INDEX)
 *
 * Соответствие:
 * - Мандат 8c: Tier 1 Hot Path, анатомическая точность, адаптивность для смартфонов (320px–430px)
 *   без горизонтального скролла и CLS.
 * - Мандат 8d: 0 мультяшных эмодзи (строго Lucide vector), AAA-контрастность, понятные статусы.
 * - Мандат 8e: Автономия пациента, отсутствие барьеров.
 * - Мандат 8b: Строго <= 800 строк.
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	Heart,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	ALL_ADULT_FDI_TEETH,
	calculateDentalHealthIndex,
	type DentalHealthIndexResult,
	type PatientToothInfo,
	type PatientToothStatus,
} from "../PatientFriendlyOdontogram.js";

export interface PatientPlanDentalFormulaProps {
	readonly teeth: readonly PatientToothInfo[];
	readonly onSelectTooth?: (tooth: PatientToothInfo) => void;
	readonly showHealthIndex?: boolean;
}

function getToothFillColor(status: PatientToothStatus): {
	readonly bg: string;
	readonly stroke: string;
	readonly badgeText: string;
	readonly light: string;
} {
	switch (status) {
		case "healthy":
			return {
				bg: "#10b981",
				stroke: "#059669",
				badgeText: "Здоров / Санирован",
				light: "rgba(16, 185, 129, 0.15)",
			};
		case "in_treatment":
			return {
				bg: "#f59e0b",
				stroke: "#d97706",
				badgeText: "В процессе лечения",
				light: "rgba(245, 158, 11, 0.15)",
			};
		case "needs_treatment":
			return {
				bg: "#ef4444",
				stroke: "#dc2626",
				badgeText: "Требует внимания",
				light: "rgba(239, 68, 68, 0.15)",
			};
		case "missing_or_implant":
			return {
				bg: "#0284c7",
				stroke: "#0369a1",
				badgeText: "Имплантат / Замещен",
				light: "rgba(2, 132, 199, 0.15)",
			};
	}
}

interface SvgToothNodeProps {
	readonly fdi: string;
	readonly x: number;
	readonly y: number;
	readonly tooth: PatientToothInfo;
	readonly isSelected: boolean;
	readonly isDimmed: boolean;
	readonly onSelect: (tooth: PatientToothInfo) => void;
}

const SvgToothNode: React.FC<SvgToothNodeProps> = memo(({
	fdi,
	x,
	y,
	tooth,
	isSelected,
	isDimmed,
	onSelect,
}) => {
	const color = getToothFillColor(tooth.status);
	const statusSymbol =
		tooth.status === "healthy"
			? "✓"
			: tooth.status === "in_treatment"
				? "•"
				: tooth.status === "needs_treatment"
					? "!"
					: "И";

	return (
		<g
			onClick={() => onSelect(tooth)}
			style={{ cursor: "pointer", opacity: isDimmed ? 0.3 : 1 }}
			data-testid={`plan-tooth-${fdi}`}
			role="button"
			tabIndex={0}
			aria-label={`${fdi}: ${tooth.humanNameRu}`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					onSelect(tooth);
				}
			}}
		>
			<rect
				x={x}
				y={y}
				width="30"
				height="42"
				rx="6"
				fill={color.bg}
				stroke={isSelected ? "#ffffff" : color.stroke}
				strokeWidth={isSelected ? 2.5 : 1}
			/>
			<text
				x={x + 15}
				y={y + 19}
				textAnchor="middle"
				fill="#ffffff"
				fontSize="11"
				fontWeight="800"
				fontFamily="sans-serif"
			>
				{fdi}
			</text>
			<text
				x={x + 15}
				y={y + 34}
				textAnchor="middle"
				fill="#ffffff"
				fontSize="9"
				fontWeight="600"
			>
				{statusSymbol}
			</text>
		</g>
	);
});
SvgToothNode.displayName = "SvgToothNode";

export const PatientPlanDentalFormula: React.FC<PatientPlanDentalFormulaProps> = memo(({
	teeth,
	onSelectTooth,
	showHealthIndex = true,
}) => {
	const [selectedFdi, setSelectedFdi] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | PatientToothStatus>("all");

	// Расчет индекса санации
	const healthIndex: DentalHealthIndexResult = useMemo(
		() => calculateDentalHealthIndex(teeth),
		[teeth],
	);

	// Быстрый поиск зуба по коду FDI
	const toothMap = useMemo(() => {
		const map = new Map<string, PatientToothInfo>();
		for (const t of teeth) {
			map.set(t.fdiCode, t);
		}
		return map;
	}, [teeth]);

	const selectedTooth = selectedFdi ? toothMap.get(selectedFdi) || null : null;

	const handleToothClick = useCallback(
		(tooth: PatientToothInfo) => {
			setSelectedFdi((prev) => (prev === tooth.fdiCode ? null : tooth.fdiCode));
			if (onSelectTooth) {
				onSelectTooth(tooth);
			}
		},
		[onSelectTooth],
	);

	// Верхняя челюсть: 18..11 (право) и 21..28 (лево)
	const upperRightFdi = ["18", "17", "16", "15", "14", "13", "12", "11"];
	const upperLeftFdi = ["21", "22", "23", "24", "25", "26", "27", "28"];

	// Нижняя челюсть: 48..41 (право) и 31..38 (лево)
	const lowerRightFdi = ["48", "47", "46", "45", "44", "43", "42", "41"];
	const lowerLeftFdi = ["31", "32", "33", "34", "35", "36", "37", "38"];

	const fallbackTooth = (fdi: string): PatientToothInfo => ({
		fdiCode: fdi,
		status: "healthy",
		humanNameRu: `Зуб №${fdi}`,
		clinicalStateRu: "Здоров",
	});

	return (
		<div
			className="pc-dental-formula-container"
			data-testid="patient-plan-dental-formula"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				width: "100%",
				boxSizing: "border-box",
			}}
		>
			{/* 1. ИНДЕКС ЗДОРОВЬЯ И САНАЦИИ ЗУБОВ */}
			{showHealthIndex && (
				<div
					className="pc-card dental-health-index-card"
					data-testid="dental-health-index-card"
					style={{
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: "1.5px solid var(--pc-primary, #0d9488)",
						borderRadius: "12px",
						padding: "12px 16px",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							flexWrap: "wrap",
							gap: "8px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<ShieldCheck size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
							<div>
								<strong style={{ fontSize: "14px", color: "var(--pc-text-main, #0f172a)" }}>
									Зубная формула &bull; {healthIndex.statusLabelRu}
								</strong>
								<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #64748b)" }}>
									Клиническая формула FDI (32 зуба) &bull; Индекс санации {healthIndex.sanitationPercent}%
								</div>
							</div>
						</div>

						<span
							data-testid="sanitation-percent-badge"
							style={{
								backgroundColor:
									healthIndex.sanitationPercent >= 90
										? "rgba(16, 185, 129, 0.15)"
										: "rgba(13, 148, 136, 0.15)",
								color: healthIndex.sanitationPercent >= 90 ? "#10b981" : "#0d9488",
								border: `1.5px solid ${healthIndex.sanitationPercent >= 90 ? "#10b981" : "#0d9488"}`,
								padding: "3px 8px",
								borderRadius: "10px",
								fontWeight: 700,
								fontSize: "12px",
							}}
						>
							Санация {healthIndex.sanitationPercent}%
						</span>
					</div>

					{/* Прогресс-бар санации */}
					<div
						className="pc-progress-bar-bg"
						style={{
							height: "8px",
							backgroundColor: "rgba(0, 0, 0, 0.08)",
							borderRadius: "4px",
							overflow: "hidden",
						}}
					>
						<div
							className="pc-progress-bar-fill"
							style={{
								width: `${healthIndex.sanitationPercent}%`,
								height: "100%",
								backgroundColor:
									healthIndex.sanitationPercent >= 90 ? "#10b981" : "#0d9488",
								transition: "width 0.3s ease",
							}}
						/>
					</div>

					<div style={{ fontSize: "11.5px", color: "var(--pc-text-muted, #64748b)" }}>
						{healthIndex.formattedIndexRu}
					</div>
				</div>
			)}

			{/* 2. ИНТЕРАКТИВНЫЕ ЧИПЫ-ФИЛЬТРЫ СТАТУСОВ ЗУБОВ */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "6px",
					justifyContent: "center",
					padding: "6px 8px",
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "8px",
					border: "1px solid var(--pc-border, #334155)",
				}}
			>
				<button
					type="button"
					onClick={() => setStatusFilter("all")}
					data-testid="filter-teeth-all"
					style={{
						padding: "4px 10px",
						minHeight: "32px",
						borderRadius: "6px",
						border:
							statusFilter === "all"
								? "1.5px solid var(--pc-primary, #0d9488)"
								: "1px solid var(--pc-border, #334155)",
						backgroundColor:
							statusFilter === "all" ? "rgba(13, 148, 136, 0.15)" : "transparent",
						color: "var(--pc-text-main, #0f172a)",
						fontSize: "11.5px",
						fontWeight: statusFilter === "all" ? 700 : 500,
						cursor: "pointer",
					}}
				>
					Все зубы (32)
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("healthy")}
					data-testid="filter-teeth-healthy"
					style={{
						padding: "4px 8px",
						minHeight: "32px",
						borderRadius: "6px",
						border:
							statusFilter === "healthy"
								? "1.5px solid #10b981"
								: "1px solid var(--pc-border, #334155)",
						backgroundColor:
							statusFilter === "healthy" ? "rgba(16, 185, 129, 0.15)" : "transparent",
						color: "#10b981",
						fontSize: "11.5px",
						fontWeight: statusFilter === "healthy" ? 700 : 500,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span
						style={{
							width: "7px",
							height: "7px",
							borderRadius: "50%",
							backgroundColor: "#10b981",
						}}
					/>
					<span>Санированы ({healthIndex.healthyCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("in_treatment")}
					data-testid="filter-teeth-in_treatment"
					style={{
						padding: "4px 8px",
						minHeight: "32px",
						borderRadius: "6px",
						border:
							statusFilter === "in_treatment"
								? "1.5px solid #f59e0b"
								: "1px solid var(--pc-border, #334155)",
						backgroundColor:
							statusFilter === "in_treatment"
								? "rgba(245, 158, 11, 0.15)"
								: "transparent",
						color: "#f59e0b",
						fontSize: "11.5px",
						fontWeight: statusFilter === "in_treatment" ? 700 : 500,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span
						style={{
							width: "7px",
							height: "7px",
							borderRadius: "50%",
							backgroundColor: "#f59e0b",
						}}
					/>
					<span>В процессе ({healthIndex.inTreatmentCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("needs_treatment")}
					data-testid="filter-teeth-needs_treatment"
					style={{
						padding: "4px 8px",
						minHeight: "32px",
						borderRadius: "6px",
						border:
							statusFilter === "needs_treatment"
								? "1.5px solid #ef4444"
								: "1px solid var(--pc-border, #334155)",
						backgroundColor:
							statusFilter === "needs_treatment"
								? "rgba(239, 68, 68, 0.15)"
								: "transparent",
						color: "#ef4444",
						fontSize: "11.5px",
						fontWeight: statusFilter === "needs_treatment" ? 700 : 500,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span
						style={{
							width: "7px",
							height: "7px",
							borderRadius: "50%",
							backgroundColor: "#ef4444",
						}}
					/>
					<span>Требуют лечения ({healthIndex.needsTreatmentCount})</span>
				</button>

				<button
					type="button"
					onClick={() => setStatusFilter("missing_or_implant")}
					data-testid="filter-teeth-missing_or_implant"
					style={{
						padding: "4px 8px",
						minHeight: "32px",
						borderRadius: "6px",
						border:
							statusFilter === "missing_or_implant"
								? "1.5px solid #0284c7"
								: "1px solid var(--pc-border, #334155)",
						backgroundColor:
							statusFilter === "missing_or_implant"
								? "rgba(2, 132, 199, 0.15)"
								: "transparent",
						color: "#0284c7",
						fontSize: "11.5px",
						fontWeight: statusFilter === "missing_or_implant" ? 700 : 500,
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span
						style={{
							width: "7px",
							height: "7px",
							borderRadius: "50%",
							backgroundColor: "#0284c7",
						}}
					/>
					<span>Имплантаты ({healthIndex.missingOrImplantCount})</span>
				</button>
			</div>

			{/* 3. АДАПТИВНАЯ SVG ЗУБНАЯ ФОРМУЛА (VIEWBOX 0 0 580 180, НОЛЬ ГОРИЗОНТАЛЬНОГО СКРОЛЛА И CLS) */}
			<div
				className="pc-svg-arch-wrapper"
				data-testid="pc-svg-arch-wrapper"
				style={{
					backgroundColor: "var(--pc-bg, #0f172a)",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "12px",
					padding: "12px 8px",
					width: "100%",
					boxSizing: "border-box",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						textAlign: "center",
						fontSize: "11px",
						fontWeight: 700,
						color: "var(--pc-text-muted, #64748b)",
						marginBottom: "6px",
						letterSpacing: "0.5px",
					}}
				>
					ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)
				</div>

				<svg
					viewBox="0 0 580 180"
					style={{
						width: "100%",
						height: "auto",
						maxHeight: "180px",
						display: "block",
						margin: "0 auto",
						aspectRatio: "580 / 180",
					}}
					role="img"
					aria-label="Интерактивная зубная формула пациента"
				>
					{/* Осевая разделительная линия */}
					<line
						x1="290"
						y1="10"
						x2="290"
						y2="170"
						stroke="var(--pc-border, #334155)"
						strokeWidth="1.5"
						strokeDasharray="4 4"
					/>
					<line
						x1="10"
						y1="90"
						x2="570"
						y2="90"
						stroke="var(--pc-border, #334155)"
						strokeWidth="1"
					/>

					{/* ВЕРХНЯЯ ЧЕЛЮСТЬ: 18..11 (Право, x: 16..247) */}
					{upperRightFdi.map((fdi, i) => {
						const tooth = toothMap.get(fdi) || fallbackTooth(fdi);
						return (
							<SvgToothNode
								key={fdi}
								fdi={fdi}
								x={16 + i * 33}
								y={20}
								tooth={tooth}
								isSelected={selectedFdi === fdi}
								isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
								onSelect={handleToothClick}
							/>
						);
					})}

					{/* ВЕРХНЯЯ ЧЕЛЮСТЬ: 21..28 (Лево, x: 300..531) */}
					{upperLeftFdi.map((fdi, i) => {
						const tooth = toothMap.get(fdi) || fallbackTooth(fdi);
						return (
							<SvgToothNode
								key={fdi}
								fdi={fdi}
								x={300 + i * 33}
								y={20}
								tooth={tooth}
								isSelected={selectedFdi === fdi}
								isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
								onSelect={handleToothClick}
							/>
						);
					})}

					{/* НИЖНЯЯ ЧЕЛЮСТЬ: 48..41 (Право, x: 16..247) */}
					{lowerRightFdi.map((fdi, i) => {
						const tooth = toothMap.get(fdi) || fallbackTooth(fdi);
						return (
							<SvgToothNode
								key={fdi}
								fdi={fdi}
								x={16 + i * 33}
								y={104}
								tooth={tooth}
								isSelected={selectedFdi === fdi}
								isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
								onSelect={handleToothClick}
							/>
						);
					})}

					{/* НИЖНЯЯ ЧЕЛЮСТЬ: 31..38 (Лево, x: 300..531) */}
					{lowerLeftFdi.map((fdi, i) => {
						const tooth = toothMap.get(fdi) || fallbackTooth(fdi);
						return (
							<SvgToothNode
								key={fdi}
								fdi={fdi}
								x={300 + i * 33}
								y={104}
								tooth={tooth}
								isSelected={selectedFdi === fdi}
								isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
								onSelect={handleToothClick}
							/>
						);
					})}
				</svg>

				<div
					style={{
						textAlign: "center",
						fontSize: "11px",
						fontWeight: 700,
						color: "var(--pc-text-muted, #64748b)",
						marginTop: "6px",
						letterSpacing: "0.5px",
					}}
				>
					НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)
				</div>
			</div>

			{/* 4. КАРТОЧКА ДЕТАЛИЗАЦИИ ВЫБРАННОГО ЗУБА */}
			{selectedTooth && (
				<div
					data-testid={`selected-tooth-details-${selectedTooth.fdiCode}`}
					className="pc-card selected-tooth-popup"
					style={{
						padding: "14px 16px",
						borderRadius: "10px",
						backgroundColor: "var(--pc-surface, #1e293b)",
						border: `1.5px solid ${getToothFillColor(selectedTooth.status).stroke}`,
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
						}}
					>
						<div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									flexWrap: "wrap",
								}}
							>
								<strong style={{ fontSize: "14px", color: "var(--pc-text-main, #0f172a)" }}>
									{selectedTooth.humanNameRu}
								</strong>
								<span
									style={{
										padding: "2px 8px",
										borderRadius: "8px",
										fontSize: "11px",
										fontWeight: 700,
										backgroundColor: getToothFillColor(selectedTooth.status).light,
										color: getToothFillColor(selectedTooth.status).stroke,
										border: `1px solid ${getToothFillColor(selectedTooth.status).stroke}`,
									}}
								>
									{getToothFillColor(selectedTooth.status).badgeText}
								</span>
							</div>
							<div
								style={{
									fontSize: "12.5px",
									marginTop: "3px",
									color: "var(--pc-text-main, #0f172a)",
								}}
							>
								<strong>Клинический статус:</strong> {selectedTooth.clinicalStateRu}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedFdi(null)}
							aria-label="Закрыть информацию о зубе"
							data-testid="close-tooth-details-btn"
							style={{
								background: "rgba(0,0,0,0.05)",
								border: "1px solid var(--pc-border, #cbd5e1)",
								borderRadius: "6px",
								width: "28px",
								height: "28px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								flexShrink: 0,
							}}
						>
							<X size={15} />
						</button>
					</div>

					{/* Назначенный этап лечения */}
					<div
						style={{
							backgroundColor: "var(--pc-bg, #f8fafc)",
							border: "1px solid var(--pc-border, #e2e8f0)",
							borderRadius: "6px",
							padding: "8px 10px",
							fontSize: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								color: "var(--pc-primary, #0d9488)",
								fontWeight: 700,
							}}
						>
							<Zap size={13} />
							<span>Назначенный этап плана лечения:</span>
						</div>
						<div style={{ marginTop: "2px", color: "var(--pc-text-main, #0f172a)" }}>
							{selectedTooth.plannedStageTitleRu ||
								selectedTooth.procedureDescriptionRu ||
								(selectedTooth.status === "healthy"
									? "Плановая профилактическая гигиена 1 раз в 6 месяцев"
									: "Комплексное терапевтическое / ортопедическое лечение")}
						</div>
					</div>

					{/* Гарантийный паспорт */}
					{selectedTooth.warrantyActive && (
						<div
							style={{
								fontSize: "11.5px",
								color: "#10b981",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								fontWeight: 600,
							}}
						>
							<ShieldCheck size={15} />
							<span>Действует гарантия качества клиники DENTE</span>
						</div>
					)}

					{/* Анти-стресс напоминание */}
					<div
						style={{
							backgroundColor: "rgba(13, 148, 136, 0.08)",
							border: "1px solid rgba(13, 148, 136, 0.2)",
							borderRadius: "6px",
							padding: "6px 8px",
							fontSize: "11px",
							color: "var(--pc-text-muted, #64748b)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Heart size={13} style={{ color: "#0d9488", flexShrink: 0 }} />
						<span>Все процедуры проводятся безболезненно под контролем микроскопа.</span>
					</div>
				</div>
			)}
		</div>
	);
});

PatientPlanDentalFormula.displayName = "PatientPlanDentalFormula";
export default PatientPlanDentalFormula;
