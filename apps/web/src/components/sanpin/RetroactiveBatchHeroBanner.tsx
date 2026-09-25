/**
 * ============================================================================
 * RETROACTIVE BATCH HERO BANNER (SanPiN 3.3686-21)
 * Верхний баннер выбора периода, кабинетов, медсестры, автоклава и запуска
 * пакетной генерации журналов СанПиН в 1 клик.
 * ============================================================================
 */

import {
	Calendar,
	Check,
	CheckCircle2,
	Plus,
	Rocket,
} from "lucide-react";
import React from "react";
import {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
	type PeriodPreset,
} from "./retroactiveSanpinEngine.js";

export interface RetroactiveBatchHeroBannerProps {
	readonly periodPreset: PeriodPreset;
	readonly setPeriodPreset: (preset: PeriodPreset) => void;
	readonly customStartDate: string;
	readonly setCustomStartDate: (d: string) => void;
	readonly customEndDate: string;
	readonly setCustomEndDate: (d: string) => void;
	readonly selectedCabinetIds: string[];
	readonly toggleCabinet: (id: string) => void;
	readonly selectAllCabinets: () => void;
	readonly nurseFullName: string;
	readonly setNurseFullName: (n: string) => void;
	readonly sterilizerModel: string;
	readonly setSterilizerModel: (m: string) => void;
	readonly availableSterilizers: Array<{ id: string; label: string; modelName: string }>;
	readonly onOpenEquipmentModal: () => void;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly setAutoclaveRegimeId: (r: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min") => void;
	readonly onGenerateBatch: () => void;
}

export function RetroactiveBatchHeroBanner({
	periodPreset,
	setPeriodPreset,
	customStartDate,
	setCustomStartDate,
	customEndDate,
	setCustomEndDate,
	selectedCabinetIds,
	toggleCabinet,
	selectAllCabinets,
	nurseFullName,
	setNurseFullName,
	sterilizerModel,
	setSterilizerModel,
	availableSterilizers,
	onOpenEquipmentModal,
	autoclaveRegimeId,
	setAutoclaveRegimeId,
	onGenerateBatch,
}: RetroactiveBatchHeroBannerProps) {
	return (
		<div
			style={{
				background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)",
				border: "1px solid rgba(37, 99, 235, 0.2)",
				borderRadius: "0.75rem",
				padding: "1.25rem 1.5rem",
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
				<div>
					<h2
						style={{
							margin: 0,
							fontSize: "1.2rem",
							fontWeight: 800,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							color: "var(--ink, #0f172a)",
						}}
					>
						<Rocket size={24} color="var(--teal)" />
						Пакетное заполнение журналов СанПиН за период (1 клик)
					</h2>
					<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", marginTop: "0.25rem" }}>
						Моментальное оформление журналов 257/у (Автоклавы), 366/у (ПСО Азопирам), бактерицидных ламп, уборок, медотходов и готовности кабинетов.
					</div>
				</div>

				<span
					style={{
						background: "rgba(5, 150, 105, 0.12)",
						color: "var(--ok-fg)",
						border: "1px solid rgba(5, 150, 105, 0.3)",
						borderRadius: "9999px",
						padding: "0.35rem 0.75rem",
						fontSize: "0.82rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.35rem",
					}}
				>
					<CheckCircle2 size={16} /> 100% Норма Роспотребнадзора
				</span>
			</div>

			{/* 1. Quick Period Selection Buttons (Крупные кнопки быстрого выбора) */}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted, #475569)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
					1. Выберите период отчета:
				</span>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "0.5rem",
						alignItems: "center",
					}}
				>
					<button
						type="button"
						onClick={() => setPeriodPreset("last_week")}
						className={`sanpin-btn ${periodPreset === "last_week" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
						style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
						data-testid="period-last-week-btn"
					>
						<Calendar size={18} /> За последнюю неделю
					</button>

					<button
						type="button"
						onClick={() => setPeriodPreset("current_month")}
						className={`sanpin-btn ${periodPreset === "current_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
						style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
						data-testid="period-current-month-btn"
					>
						<Calendar size={18} /> За текущий месяц
					</button>

					<button
						type="button"
						onClick={() => setPeriodPreset("previous_month")}
						className={`sanpin-btn ${periodPreset === "previous_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
						style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
						data-testid="period-previous-month-btn"
					>
						<Calendar size={18} /> За прошлый месяц
					</button>

					<button
						type="button"
						onClick={() => setPeriodPreset("current_quarter")}
						className={`sanpin-btn ${periodPreset === "current_quarter" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
						style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
						data-testid="period-current-quarter-btn"
					>
						<Calendar size={18} /> За квартал
					</button>

					<button
						type="button"
						onClick={() => setPeriodPreset("custom")}
						className={`sanpin-btn ${periodPreset === "custom" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
						style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700 }}
						data-testid="period-custom-dates-btn"
					>
						<Calendar size={18} /> Выбрать даты
					</button>
				</div>

				{/* Custom date range inputs */}
				{periodPreset === "custom" && (
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: "0.75rem",
							marginTop: "0.5rem",
							padding: "0.75rem 1rem",
							background: "var(--paper, #ffffff)",
							borderRadius: "0.5rem",
							border: "1px solid var(--line, #cbd5e1)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
							<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>C:</span>
							<input
								type="date"
								value={customStartDate}
								onChange={(e) => setCustomStartDate(e.target.value)}
								className="sanpin-input"
								style={{ minHeight: "40px", padding: "0.35rem 0.65rem" }}
							/>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
							<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>По:</span>
							<input
								type="date"
								value={customEndDate}
								onChange={(e) => setCustomEndDate(e.target.value)}
								className="sanpin-input"
								style={{ minHeight: "40px", padding: "0.35rem 0.65rem" }}
							/>
						</div>
						<span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
							Активный диапазон: <strong>{customStartDate}</strong> — <strong>{customEndDate}</strong>
						</span>
					</div>
				)}
			</div>

			{/* 2. Generation Settings (Настройки генерации) */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
					gap: "1rem",
					paddingTop: "0.75rem",
					borderTop: "1px solid rgba(148, 163, 184, 0.2)",
				}}
			>
				{/* Cabinets Selection */}
				<div className="sanpin-form-group">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
							Кабинеты клиники ({selectedCabinetIds.length}/{STATUTORY_CLINIC_CABINETS.length}):
						</label>
						<button
							type="button"
							onClick={selectAllCabinets}
							style={{
								background: "none",
								border: "none",
								color: "var(--brand-primary, #2563eb)",
								fontSize: "0.75rem",
								cursor: "pointer",
								padding: 0,
								textDecoration: "underline",
							}}
						>
							Выбрать все
						</button>
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
						{STATUTORY_CLINIC_CABINETS.map((cab) => {
							const isSelected = selectedCabinetIds.includes(cab.id);
							return (
								<button
									key={cab.id}
									type="button"
									onClick={() => toggleCabinet(cab.id)}
									style={{
										padding: "0.4rem 0.7rem",
										borderRadius: "0.375rem",
										fontSize: "0.82rem",
										fontWeight: isSelected ? 700 : 500,
										border: isSelected ? "1px solid var(--teal)" : "1px solid var(--line, #cbd5e1)",
										background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.12))" : "var(--paper, #ffffff)",
										color: isSelected ? "var(--teal)" : "var(--ink, #334155)",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "0.35rem",
										transition: "all 0.15s ease",
									}}
								>
									{isSelected && <Check size={14} color="var(--teal)" />}
									{cab.shortName}
								</button>
							);
						})}
					</div>
				</div>

				{/* Duty Nurse Selection */}
				<div className="sanpin-form-group">
					<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
						Дежурная медсестра ЦСО (ФИО):
					</label>
					<select
						value={nurseFullName}
						onChange={(e) => setNurseFullName(e.target.value)}
						className="sanpin-select"
						style={{ minHeight: "44px" }}
					>
						<option value="Медсестра ЦСО">Медсестра ЦСО</option>
						<option value="Главная медсестра">Главная медсестра</option>
						<option value="Оператор стерилизационной">Оператор стерилизационной</option>
						<option value="Ассистент стоматолога">Ассистент стоматолога</option>
					</select>
				</div>

				{/* Sterilizer Apparatus Selection */}
				<div className="sanpin-form-group">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
							Аппарат стерилизатора клиники:
						</label>
						<button
							type="button"
							onClick={onOpenEquipmentModal}
							style={{
								background: "none",
								border: "none",
								color: "var(--brand-primary, #2563eb)",
								fontSize: "0.75rem",
								cursor: "pointer",
								padding: 0,
								textDecoration: "underline",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.2rem",
							}}
						>
							<Plus size={12} /> Добавить аппарат
						</button>
					</div>
					<select
						value={sterilizerModel}
						onChange={(e) => setSterilizerModel(e.target.value)}
						className="sanpin-select"
						style={{ minHeight: "44px" }}
					>
						{availableSterilizers.map((s) => (
							<option key={s.id} value={s.modelName}>
								{s.label}
							</option>
						))}
					</select>
				</div>

				{/* Autoclave Regime Selection */}
				<div className="sanpin-form-group">
					<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
						Режим автоклавирования (Форма 257/у):
					</label>
					<select
						value={autoclaveRegimeId}
						onChange={(e) => setAutoclaveRegimeId(e.target.value as any)}
						className="sanpin-select"
						style={{ minHeight: "44px" }}
					>
						{AUTOCLAVE_REGIME_PRESETS.map((r) => (
							<option key={r.id} value={r.id}>
								{r.nameRu}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* 3. PROMINENT 1-CLICK GENERATION BUTTON (Кнопка >= 52px, контрастный акцентный цвет) */}
			<div style={{ display: "flex", justifyContent: "stretch", marginTop: "0.25rem" }}>
				<button
					type="button"
					onClick={onGenerateBatch}
					style={{
						width: "100%",
						minHeight: "56px",
						padding: "0.85rem 1.5rem",
						fontSize: "1.05rem",
						fontWeight: 900,
						letterSpacing: "0.02em",
						background: "var(--ok-fg)",
						borderColor: "var(--ok-fg)",
						color: "var(--on-teal, #ffffff)",
						borderRadius: "0.5rem",
						cursor: "pointer",
						boxShadow: "0 4px 14px rgba(5, 150, 105, 0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.75rem",
						border: "none",
						transition: "all 0.2s ease",
					}}
					data-testid="execute-sanpin-batch-1click-btn"
				>
					<Rocket size={22} color="var(--on-teal, #ffffff)" />
					<span>Заполнить все журналы СанПиН за период в 1 клик</span>
				</button>
			</div>
		</div>
	);
}
