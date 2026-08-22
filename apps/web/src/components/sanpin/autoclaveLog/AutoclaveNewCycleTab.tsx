/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — NEW STERILIZATION CYCLE TAB
 * Регистрация нового цикла стерилизации, выбор режима в 1 клик,
 * физические параметры, типы упаковок и 5 контрольных точек.
 * ============================================================================
 */

import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Flame,
	Gauge,
	PackageCheck,
	Plus,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
} from "lucide-react";
import React, { useState } from "react";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	evaluateCycleParameters,
	type ChamberPointEvaluation,
	type Form257Record,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type PackagingTypeId,
	type SterilizationRegimeId,
} from "./autoclaveLogPresets.js";

export interface AutoclaveNewCycleTabProps {
	readonly onSaveRecord: (record: Form257Record) => void;
	readonly defaultOperatorName?: string;
	readonly defaultHeadNurseName?: string;
	readonly latestCycleNumber?: number;
}

export function AutoclaveNewCycleTab({
	onSaveRecord,
	defaultOperatorName = "Смирнова Анна Викторовна (Медсестра ЦСО)",
	defaultHeadNurseName = "Иванова Ольга Николаевна (Главная медсестра)",
	latestCycleNumber = 1,
}: AutoclaveNewCycleTabProps) {
	const [selectedSterilizerId, setSelectedSterilizerId] = useState<string>(
		STATUTORY_STERILIZERS_CATALOG[0]?.id ?? "autoclave-melag-vacuklav-23b",
	);
	const [selectedRegimeId, setSelectedRegimeId] = useState<SterilizationRegimeId>("steam_134_5min");
	const [cycleDate, setCycleDate] = useState<string>(new Date().toISOString().split("T")[0] ?? "2026-08-22");
	const [cycleNumber, setCycleNumber] = useState<number>(latestCycleNumber);
	const [itemsDescription, setItemsDescription] = useState<string>(
		"Наконечники турбинные и угловые, смотровые лотки (зеркала, зонды, пинцеты), хирургический инструмент",
	);
	const [packsCount, setPacksCount] = useState<number>(14);
	const [packagingType, setPackagingType] = useState<PackagingTypeId>("kraft_pouch_sealed");
	const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>("intetest_v_134_5");
	const [operatorFullName, setOperatorFullName] = useState<string>(defaultOperatorName);
	const [headNurseFullName, setHeadNurseFullName] = useState<string>(defaultHeadNurseName);
	const [isHeadNurseVerified, setIsHeadNurseVerified] = useState<boolean>(true);
	const [notes, setNotes] = useState<string>("");

	// Текущий режим
	const currentRegime =
		STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === selectedRegimeId) ?? STATUTORY_STERILIZATION_REGIMES[0];

	// Фактические показания датчиков
	const [actualTemp, setActualTemp] = useState<number>(currentRegime?.targetTemperatureCelsius ?? 134);
	const [actualPressure, setActualPressure] = useState<number>(currentRegime?.targetPressureBar ?? 2.1);
	const [actualTime, setActualTime] = useState<number>(currentRegime?.exposureTimeMinutes ?? 5);

	// 5 контрольных точек камеры
	const [chamberPoints, setChamberPoints] = useState<ChamberPointEvaluation[]>(() =>
		createDefault5ChamberPoints(selectedIndicatorId, true),
	);

	// Быстрое переключение режима
	const handleSelectRegime = (regimeId: SterilizationRegimeId) => {
		setSelectedRegimeId(regimeId);
		const reg = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId);
		if (reg) {
			setActualTemp(reg.targetTemperatureCelsius);
			setActualPressure(reg.targetPressureBar);
			setActualTime(reg.exposureTimeMinutes);
		}
	};

	// Переключение статуса точки
	const togglePointStatus = (pointIndex: 1 | 2 | 3 | 4 | 5) => {
		setChamberPoints((prev) =>
			prev.map((pt) => {
				if (pt.pointIndex === pointIndex) {
					const nextStatus = pt.status === "passed" ? "failed" : "passed";
					const indicator =
						STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === pt.indicatorId) ??
						STATUTORY_CHEMICAL_INDICATORS[0];
					return {
						...pt,
						status: nextStatus,
						actualColorRu:
							nextStatus === "passed"
								? (indicator?.passedColorRu ?? "Темно-коричневый")
								: (indicator?.failedColorRu ?? "Неполный переход"),
					};
				}
				return pt;
			}),
		);
	};

	// Быстрая установка всех точек в СТЕРИЛЬНО / БРАК
	const setAllPointsStatus = (passed: boolean) => {
		setChamberPoints(createDefault5ChamberPoints(selectedIndicatorId, passed));
	};

	// Проверка параметров на лету
	const compliance = evaluateCycleParameters(selectedRegimeId, {
		actualTemperatureCelsius: actualTemp,
		actualPressureBar: actualPressure,
		actualExposureMinutes: actualTime,
	});

	const areAllPointsPassed = chamberPoints.every((pt) => pt.status === "passed");
	const isFormValid = itemsDescription.trim().length > 0 && packsCount > 0 && operatorFullName.trim().length > 0;

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isFormValid) return;

		const newRecord = createForm257Record({
			date: cycleDate,
			cycleNumber,
			sterilizerId: selectedSterilizerId,
			regimeId: selectedRegimeId,
			sensors: {
				actualTemperatureCelsius: actualTemp,
				actualPressureBar: actualPressure,
				actualExposureMinutes: actualTime,
			},
			itemsDescriptionRu: itemsDescription.trim(),
			packsCount,
			packagingType,
			chamberPoints,
			operatorStaffFullName: operatorFullName.trim(),
			headNurseSignatureFullName: isHeadNurseVerified ? headNurseFullName.trim() : undefined,
			isHeadNurseVerified,
			notes: notes.trim() || undefined,
		});

		onSaveRecord(newRecord);
		setCycleNumber((prev) => prev + 1);
	};

	return (
		<form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			{/* 1. Быстрый выбор регламентного режима (1-Click) */}
			<div>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
					<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<Sparkles size={16} color="var(--teal, #0d9488)" />
						Регламентные режимы стерилизации (СанПиН 3.3686-21)
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Автоматическая калибровка T°, давления и времени
					</span>
				</div>

				<div className="autoclave-regime-grid">
					{STATUTORY_STERILIZATION_REGIMES.map((reg) => {
						const isSelected = reg.id === selectedRegimeId;
						return (
							<button
								key={reg.id}
								type="button"
								onClick={() => handleSelectRegime(reg.id)}
								className={`autoclave-regime-card ${isSelected ? "selected" : ""}`}
							>
								<div className="autoclave-regime-card-header">
									<span>{reg.shortLabelRu}</span>
									{isSelected && <CheckCircle2 size={16} color="var(--teal, #0d9488)" />}
								</div>
								<div className="autoclave-regime-card-sub">{reg.targetItemsDescriptionRu}</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Основные параметры цикла и аппарата */}
			<div className="autoclave-form-grid">
				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="sterilizer-select">
						Стерилизационный аппарат (Автоклав / Сухожар)
					</label>
					<select
						id="sterilizer-select"
						className="autoclave-select"
						value={selectedSterilizerId}
						onChange={(e) => setSelectedSterilizerId(e.target.value)}
					>
						{STATUTORY_STERILIZERS_CATALOG.map((st) => (
							<option key={st.id} value={st.id}>
								{st.code} — {st.brand} {st.model} ({st.chamberVolumeLiters} л)
							</option>
						))}
					</select>
				</div>

				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="cycle-date">
						Дата и номер цикла
					</label>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.5rem" }}>
						<input
							id="cycle-date"
							type="date"
							className="autoclave-input"
							value={cycleDate}
							onChange={(e) => setCycleDate(e.target.value)}
							required
						/>
						<input
							type="number"
							min={1}
							max={99}
							className="autoclave-input"
							value={cycleNumber}
							onChange={(e) => setCycleNumber(Number(e.target.value))}
							title="Номер цикла за день"
							required
						/>
					</div>
				</div>

				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="packaging-type">
						Вид упаковки и срок стерильности
					</label>
					<select
						id="packaging-type"
						className="autoclave-select"
						value={packagingType}
						onChange={(e) => setPackagingType(e.target.value as PackagingTypeId)}
					>
						{STATUTORY_PACKAGING_TYPES.map((pkg) => (
							<option key={pkg.id} value={pkg.id}>
								{pkg.shortLabelRu} (Срок: {pkg.shelfLifeDays > 0 ? `${pkg.shelfLifeDays} дн.` : "Без хранения"})
							</option>
						))}
					</select>
				</div>

				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="packs-count">
						Количество упаковок / наборов (шт.)
					</label>
					<input
						id="packs-count"
						type="number"
						min={1}
						max={500}
						className="autoclave-input"
						value={packsCount}
						onChange={(e) => setPacksCount(Number(e.target.value))}
						required
					/>
				</div>
			</div>

			{/* 3. Физические параметры датчиков (T°, P, время) */}
			<div
				style={{
					background: "var(--paper-strong, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "1rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<Gauge size={16} color="var(--brand-500, #3b82f6)" />
						Физический контроль по датчикам автоклава
					</span>
					{compliance.isCompliant ? (
						<span className="status-badge passed">
							<CheckCircle2 size={14} /> Параметры в норме
						</span>
					) : (
						<span className="status-badge failed">
							<AlertTriangle size={14} /> Отклонение от нормы
						</span>
					)}
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
					<div className="autoclave-form-group">
						<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
							Температура (°C) [Норма: {currentRegime?.tempToleranceCelsius.min}–{currentRegime?.tempToleranceCelsius.max}]
						</label>
						<input
							type="number"
							step="0.1"
							className="autoclave-input"
							value={actualTemp}
							onChange={(e) => setActualTemp(Number(e.target.value))}
						/>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
							Давление пара (бар) [Норма: {currentRegime?.pressureToleranceBar.min}–{currentRegime?.pressureToleranceBar.max}]
						</label>
						<input
							type="number"
							step="0.05"
							className="autoclave-input"
							value={actualPressure}
							onChange={(e) => setActualPressure(Number(e.target.value))}
							disabled={currentRegime?.methodType === "dry_heat_air"}
						/>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" style={{ fontSize: "0.75rem" }}>
							Экспозиция (мин) [Норма: ≥ {currentRegime?.exposureTimeMinutes}]
						</label>
						<input
							type="number"
							step="0.5"
							className="autoclave-input"
							value={actualTime}
							onChange={(e) => setActualTime(Number(e.target.value))}
						/>
					</div>
				</div>

				{!compliance.isCompliant && (
					<div style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: 600 }}>
						Внимание: {compliance.failureReasons.join("; ")}
					</div>
				)}
			</div>

			{/* 4. Химический контроль в 5 точках камеры */}
			<div className="chamber-matrix-wrapper">
				<div className="chamber-matrix-header">
					<div>
						<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
							<ShieldCheck size={16} color="var(--teal, #0d9488)" />
							Химический контроль в 5 контрольных точках камеры (СанПиН 3.3686-21)
						</span>
						<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
							Кликните на маркер точки для смены статуса (ОК / Брак)
						</div>
					</div>

					<div style={{ display: "flex", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={() => setAllPointsStatus(true)}
							className="autoclave-btn autoclave-btn-secondary"
							style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", minHeight: "44px" }}
						>
							Все 5 точек СТЕРИЛЬНО
						</button>
						<button
							type="button"
							onClick={() => setAllPointsStatus(false)}
							className="autoclave-btn autoclave-btn-secondary"
							style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", minHeight: "44px", color: "#dc2626" }}
						>
							Сброс (Брак)
						</button>
					</div>
				</div>

				{/* 5 Points Interactive Badges */}
				<div className="chamber-points-list-grid">
					{chamberPoints.map((pt) => {
						const isPassed = pt.status === "passed";
						return (
							<button
								key={pt.pointIndex}
								type="button"
								onClick={() => togglePointStatus(pt.pointIndex)}
								className="chamber-point-card"
								style={{
									cursor: "pointer",
									textAlign: "left",
									borderColor: isPassed ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
									background: isPassed ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<strong>{pt.code}</strong>
									<span className={`status-badge ${isPassed ? "passed" : "failed"}`}>
										{isPassed ? "ОК" : "БРАК"}
									</span>
								</div>
								<div style={{ color: "var(--muted, #64748b)", fontSize: "0.6875rem" }}>{pt.nameRu}</div>
								<div style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Цвет: {pt.actualColorRu}</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 5. Наименование изделий и подписи */}
			<div className="autoclave-form-group">
				<label className="autoclave-form-label" htmlFor="items-desc">
					Наименование стерилизуемых изделий (состав загрузки)
				</label>
				<textarea
					id="items-desc"
					rows={2}
					className="autoclave-textarea"
					value={itemsDescription}
					onChange={(e) => setItemsDescription(e.target.value)}
					required
				/>
			</div>

			<div className="autoclave-form-grid">
				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="operator-name">
						Медсестра ЦСО (проводившая стерилизацию)
					</label>
					<input
						id="operator-name"
						type="text"
						className="autoclave-input"
						value={operatorFullName}
						onChange={(e) => setOperatorFullName(e.target.value)}
						required
					/>
				</div>

				<div className="autoclave-form-group">
					<label className="autoclave-form-label" htmlFor="nurse-verify">
						Контрольная заверка (Главная медсестра)
					</label>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", height: "44px" }}>
						<input
							id="nurse-verify"
							type="checkbox"
							checked={isHeadNurseVerified}
							onChange={(e) => setIsHeadNurseVerified(e.target.checked)}
							style={{ width: "20px", height: "20px", accentColor: "var(--teal, #0d9488)" }}
						/>
						<span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
							{isHeadNurseVerified ? "Электронная подпись подтверждена" : "Без отметки гл. медсестры"}
						</span>
					</div>
				</div>
			</div>

			{/* Submit & Status Bar */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					borderTop: "1px solid var(--line, #e2e8f0)",
					paddingTop: "1rem",
				}}
			>
				<div>
					{compliance.isCompliant && areAllPointsPassed ? (
						<span style={{ color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
							<CheckCircle2 size={18} />
							Партия готова к внесению в Журнал 257/у (Статус: СТЕРИЛЬНО)
						</span>
					) : (
						<span style={{ color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
							<AlertTriangle size={18} />
							Внимание: Обнаружены отклонения параметров (Будет зарегистрирован БРАК)
						</span>
					)}
				</div>

				<button
					type="submit"
					disabled={!isFormValid}
					className="autoclave-btn autoclave-btn-primary"
					style={{ minWidth: "220px" }}
				>
					<Save size={18} />
					Записать цикл в Форму 257/у
				</button>
			</div>
		</form>
	);
}
