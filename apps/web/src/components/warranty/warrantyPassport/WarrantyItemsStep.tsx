/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 1: ITEMS & RISK FACTORS STEP
 * Редактор позиций гарантийного сертификата, зубная формула, СтАР и риски OHI-S
 * ============================================================================
 */

import {
	Award,
	CheckCircle2,
	FileCheck,
	FileText,
	Layers,
	Plus,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import type React from "react";
import {
	formatShortDate,
	type WarrantyCalculationResult,
	type WarrantyItem,
	type WarrantyRiskFactors,
} from "../warrantyEngine.js";
import {
	getAllWarrantyPresets,
	STAR_QUICK_PRESETS,
	type StarQuickPreset,
	VITA_SHADES,
	type WarrantyCategory,
} from "../warrantyPresets.js";
import {
	LOWER_LEFT_TEETH,
	LOWER_RIGHT_TEETH,
	UPPER_LEFT_TEETH,
	UPPER_RIGHT_TEETH,
} from "./constants";
import type { CompletedTreatmentStage } from "./types";

export interface WarrantyItemsStepProps {
	completedStages?: CompletedTreatmentStage[] | undefined;
	onOpenRemediation: () => void;
	onImportCompletedStages: () => void;
	selectedTeeth: string[];
	onToggleTooth: (tooth: string) => void;
	items: WarrantyItem[];
	activeCategory: WarrantyCategory;
	currentWorkTitle: string;
	onWorkTitleChange: (val: string) => void;
	currentMaterial: string;
	onMaterialChange: (val: string) => void;
	currentManufacturer: string;
	onManufacturerChange: (val: string) => void;
	currentShade: string;
	onShadeChange: (val: string) => void;
	currentLot: string;
	onLotChange: (val: string) => void;
	currentServiceCode804n: string;
	onServiceCode804nChange: (val: string) => void;
	currentLabOrderNumber: string;
	onLabOrderNumberChange: (val: string) => void;
	onApplyStarQuickPreset: (qp: StarQuickPreset) => void;
	onSelectCategory: (cat: WarrantyCategory) => void;
	onAddItem: () => void;
	onRemoveItem: (id: string) => void;
	riskFactors: WarrantyRiskFactors;
	onRiskFactorsChange: React.Dispatch<React.SetStateAction<WarrantyRiskFactors>>;
	calculation: WarrantyCalculationResult;
}

export const WarrantyItemsStep: React.FC<WarrantyItemsStepProps> = ({
	completedStages,
	onOpenRemediation,
	onImportCompletedStages,
	selectedTeeth,
	onToggleTooth,
	items,
	activeCategory,
	currentWorkTitle,
	onWorkTitleChange,
	currentMaterial,
	onMaterialChange,
	currentManufacturer,
	onManufacturerChange,
	currentShade,
	onShadeChange,
	currentLot,
	onLotChange,
	currentServiceCode804n,
	onServiceCode804nChange,
	currentLabOrderNumber,
	onLabOrderNumberChange,
	onApplyStarQuickPreset,
	onSelectCategory,
	onAddItem,
	onRemoveItem,
	riskFactors,
	onRiskFactorsChange,
	calculation,
}) => {
	return (
		<div className="warranty-studio-grid">
			{/* Left Column: Form and Items */}
			<div className="warranty-studio-main">
				{/* Баннер гарантийного приёма */}
				<div className="warranty-quick-remediation-banner">
					<div className="warranty-remediation-banner-left">
						<ShieldAlert size={20} className="warranty-remediation-banner-icon" />
						<div>
							<strong>Гарантийный приём (выпала пломба, расцементировка коронки, скол)</strong>
							<p>Оформление гарантии: пациент платит 0 ₽ • Списание со склада по факту</p>
						</div>
					</div>
					<button
						type="button"
						className="warranty-btn-remediation-quick"
						onClick={onOpenRemediation}
					>
						Оформить переделку (0 ₽)
					</button>
				</div>

				{/* Импорт из завершенных этапов плана лечения */}
				{completedStages && completedStages.length > 0 && (
					<div className="warranty-stages-import-banner">
						<div className="warranty-stages-banner-left">
							<FileCheck size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<div>
								<strong>Завершенные этапы плана лечения ({completedStages.length} поз.)</strong>
								<p>Формирование гарантийного паспорта по всем выполненным манипуляциям</p>
							</div>
						</div>
						<button
							type="button"
							className="warranty-btn-secondary"
							onClick={onImportCompletedStages}
							title="Сформировать позиции паспорта из завершенного плана лечения"
						>
							<CheckCircle2 size={14} style={{ color: "var(--ok-fg)" }} />
							Заполнить из плана ({completedStages.length})
						</button>
					</div>
				)}

				{/* Зубная формула */}
				<div className="warranty-card-section">
					<div className="warranty-section-header">
						<h4>
							<Award size={16} />
							1. Выберите зубы для включения в сертификат:
						</h4>
						<span className="warranty-label truncate min-w-0">
							Выбрано: {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "нет"}
						</span>
					</div>

					<div className="warranty-teeth-formula">
						{/* Верхняя челюсть */}
						<div className="warranty-arch-row">
							{UPPER_RIGHT_TEETH.map((t) => {
								const f = `${t[0]}.${t[1]}`;
								const isSel = selectedTeeth.includes(f);
								const hasW = items.some((it) => it.toothNumber === f);
								return (
									<button
										key={t}
										type="button"
										className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
										onClick={() => onToggleTooth(t)}
									>
										{f}
									</button>
								);
							})}
							<div className="warranty-arch-divider" />
							{UPPER_LEFT_TEETH.map((t) => {
								const f = `${t[0]}.${t[1]}`;
								const isSel = selectedTeeth.includes(f);
								const hasW = items.some((it) => it.toothNumber === f);
								return (
									<button
										key={t}
										type="button"
										className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
										onClick={() => onToggleTooth(t)}
									>
										{f}
									</button>
								);
							})}
						</div>

						{/* Нижняя челюсть */}
						<div className="warranty-arch-row">
							{LOWER_RIGHT_TEETH.map((t) => {
								const f = `${t[0]}.${t[1]}`;
								const isSel = selectedTeeth.includes(f);
								const hasW = items.some((it) => it.toothNumber === f);
								return (
									<button
										key={t}
										type="button"
										className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
										onClick={() => onToggleTooth(t)}
									>
										{f}
									</button>
								);
							})}
							<div className="warranty-arch-divider" />
							{LOWER_LEFT_TEETH.map((t) => {
								const f = `${t[0]}.${t[1]}`;
								const isSel = selectedTeeth.includes(f);
								const hasW = items.some((it) => it.toothNumber === f);
								return (
									<button
										key={t}
										type="button"
										className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
										onClick={() => onToggleTooth(t)}
									>
										{f}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Категории и нормативы СтАР */}
				<div className="warranty-card-section">
					<div className="warranty-section-header">
						<h4>
							<Layers size={16} />
							2. Нормативная категория стоматологической помощи:
						</h4>
					</div>

					{/* Нормативные пресеты СтАР */}
					<div className="warranty-star-presets-bar">
						<div className="warranty-star-presets-title">
							<Award size={14} style={{ color: "var(--teal)" }} />
							<span>Нормативные пресеты СтАР:</span>
						</div>
						<div className="warranty-star-presets-grid">
							{STAR_QUICK_PRESETS.map((qp) => (
								<button
									key={qp.id}
									type="button"
									className={`warranty-star-chip ${activeCategory === qp.category && currentWorkTitle === qp.title ? "active" : ""}`}
									onClick={() => onApplyStarQuickPreset(qp)}
									title={`${qp.title} (${qp.statutoryNote})`}
								>
									<strong className="truncate min-w-0">{qp.title}</strong>
									<span className="truncate min-w-0">{qp.subtitle}</span>
								</button>
							))}
						</div>
					</div>

					<div className="warranty-presets-grid">
						{getAllWarrantyPresets().map((preset) => (
							<button
								key={preset.category}
								type="button"
								className={`warranty-preset-card ${activeCategory === preset.category ? "active" : ""}`}
								onClick={() => onSelectCategory(preset.category)}
							>
								<span className="warranty-preset-title">{preset.shortTitle}</span>
								<div className="warranty-preset-meta">
									<span>Гарантия: {preset.baseWarrantyMonths} мес.</span>
									<span>Срок сл.: {Math.round(preset.baseServiceLifeMonths / 12)} г.</span>
								</div>
							</button>
						))}
					</div>

					{/* Форма параметров материала */}
					<div className="warranty-form-row">
						<div className="warranty-form-group full-width">
							<label className="warranty-label">Клиническое описание работы</label>
							<input
								type="text"
								className="warranty-input"
								value={currentWorkTitle}
								onChange={(e) => onWorkTitleChange(e.target.value)}
								placeholder="Например: Пломбирование нанокомпозитом Filtek Ultimate"
							/>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Материал & Препарат</label>
							<input
								type="text"
								className="warranty-input"
								value={currentMaterial}
								onChange={(e) => onMaterialChange(e.target.value)}
								placeholder="IPS e.max Press, Katana Zirconia..."
							/>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Производитель & Страна</label>
							<input
								type="text"
								className="warranty-input"
								value={currentManufacturer}
								onChange={(e) => onManufacturerChange(e.target.value)}
								placeholder="Ivoclar Vivadent (Лихтенштейн)"
							/>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Оттенок по шкале VITA</label>
							<select
								className="warranty-select"
								value={currentShade}
								onChange={(e) => onShadeChange(e.target.value)}
							>
								{VITA_SHADES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Партия МДЛП / LOT / Серия</label>
							<input
								type="text"
								className="warranty-input"
								value={currentLot}
								onChange={(e) => onLotChange(e.target.value)}
								placeholder="LOT #984214 / SN-842"
							/>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Код услуги</label>
							<input
								type="text"
								className="warranty-input"
								value={currentServiceCode804n}
								onChange={(e) => onServiceCode804nChange(e.target.value)}
								placeholder="A16.07.002.010"
							/>
						</div>

						<div className="warranty-form-group">
							<label className="warranty-label">Наряд ЗТЛ (лаборатория)</label>
							<input
								type="text"
								className="warranty-input"
								value={currentLabOrderNumber}
								onChange={(e) => onLabOrderNumberChange(e.target.value)}
								placeholder="ЗТЛ-2026-0842"
							/>
						</div>
					</div>

					<button
						type="button"
						className="warranty-btn-primary"
						onClick={onAddItem}
					>
						<Plus size={16} />
						Добавить в гарантийный паспорт (
						{selectedTeeth.length > 0
							? `${selectedTeeth.length} поз.`
							: "общая конструкция"}
						)
					</button>
				</div>

				{/* Список добавленных позиций */}
				<div className="warranty-card-section">
					<div className="warranty-section-header">
						<h4>
							<FileText size={16} />
							Позиции гарантийного сертификата ({items.length}):
						</h4>
					</div>

					{items.length === 0 ? (
						<div style={{ color: "var(--ink-2)", fontSize: "13px", padding: "10px 0" }}>
							Позиции не добавлены. Выберите зубы и нажмите «Добавить в гарантийный паспорт».
						</div>
					) : (
						<table className="warranty-items-table">
							<thead>
								<tr>
									<th>Зуб</th>
									<th>Вид работы & код</th>
									<th>Материал & ЗТЛ</th>
									<th>Оттенок & LOT (МДЛП)</th>
									<th>Гарантия</th>
									<th>Действия</th>
								</tr>
							</thead>
							<tbody>
								{items.map((it) => (
									<tr key={it.id}>
										<td>
											<strong>{it.toothNumber}</strong>
										</td>
										<td style={{ maxWidth: "200px" }}>
											<div className="truncate min-w-0" title={it.clinicalWorkTitle}>{it.clinicalWorkTitle}</div>
											{it.serviceCode804n && (
												<div className="warranty-804n-badge" title="Код услуги">
													Код: {it.serviceCode804n}
												</div>
											)}
										</td>
										<td style={{ maxWidth: "220px" }}>
											<div className="truncate min-w-0" title={it.materialName}>{it.materialName}</div>
											{it.labOrderNumber && (
												<div className="warranty-ztl-badge" title="Номер наряда зуботехнической лаборатории">
													ЗТЛ: {it.labOrderNumber}
												</div>
											)}
										</td>
										<td>
											{it.vitaShade ? <span>Шейд: <strong>{it.vitaShade}</strong></span> : "—"}
											{it.lotNumber && (
												<div style={{ fontSize: "11px", color: "var(--ink-2)", marginTop: "2px" }}>
													Партия/МДЛП: {it.lotNumber}
												</div>
											)}
										</td>
										<td>{it.customWarrantyMonths ?? calculation.adjustedWarrantyMonths} мес.</td>
										<td>
											<button
												type="button"
												className="warranty-btn-icon"
												onClick={() => onRemoveItem(it.id)}
												title="Удалить позицию"
											>
												<Trash2 size={14} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{/* Right Column: Risk Factors & HUD */}
			<div className="warranty-studio-sidebar">
				<div className="warranty-risk-panel">
					<div className="warranty-risk-header">
						<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
							Калькулятор рисков (OHI-S & Соматика)
						</h4>
						<span className={`warranty-risk-score-badge ${calculation.riskLevel}`}>
							{calculation.riskLevel === "low"
								? "Низкий риск"
								: calculation.riskLevel === "moderate"
									? "Умеренный"
									: calculation.riskLevel === "high"
										? "Высокий риск"
										: "Критический"}
						</span>
					</div>

					{/* OHI-S Гигиенический индекс */}
					<div className="warranty-slider-wrap">
						<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
							<span className="warranty-label">Индекс гигиены OHI-S (Green-Vermillion):</span>
							<strong style={{ color: "var(--teal)" }}>{riskFactors.hygieneScore.toFixed(1)}</strong>
						</div>
						<input
							type="range"
							min="0.0"
							max="3.0"
							step="0.1"
							value={riskFactors.hygieneScore}
							onChange={(e) =>
								onRiskFactorsChange((prev) => ({ ...prev, hygieneScore: parseFloat(e.target.value) }))
							}
							style={{ width: "100%", accentColor: "var(--teal)" }}
						/>
						<div className="warranty-slider-labels">
							<span>0.0 (Отл.)</span>
							<span>1.2 (Норма)</span>
							<span>1.8 (Удовл.)</span>
							<span>3.0 (Плохо)</span>
						</div>
					</div>

					{/* Бруксизм и каппа */}
					<div className="warranty-toggle-row">
						<span>Бруксизм / Гипертонус мышц</span>
						<button
							type="button"
							className={`warranty-toggle-switch ${riskFactors.bruxism ? "active" : ""}`}
							onClick={() => onRiskFactorsChange((prev) => ({ ...prev, bruxism: !prev.bruxism }))}
							aria-label="Бруксизм"
						/>
					</div>

					{riskFactors.bruxism && (
						<div className="warranty-toggle-row" style={{ paddingLeft: "16px", background: "var(--paper-soft)" }}>
							<span>Ношение защитной каппы</span>
							<button
								type="button"
								className={`warranty-toggle-switch ${riskFactors.nightGuardUsed ? "active" : ""}`}
								onClick={() =>
									onRiskFactorsChange((prev) => ({
										...prev,
										nightGuardUsed: !prev.nightGuardUsed,
										nightGuardPrescribed: true,
									}))
								}
								aria-label="Ночная каппа"
							/>
						</div>
					)}

					{/* Курение */}
					<div className="warranty-form-group">
						<label className="warranty-label">Статус курения табака</label>
						<select
							className="warranty-select"
							value={riskFactors.smoking}
							onChange={(e) =>
								onRiskFactorsChange((prev) => ({
									...prev,
									smoking: e.target.value as "none" | "light" | "heavy",
								}))
							}
						>
							<option value="none">Не курит (0 сигарет)</option>
							<option value="light">Умеренно (до 10 сигарет/сутки)</option>
							<option value="heavy">Интенсивно (&gt; 10 сигарет/сутки)</option>
						</select>
					</div>

					{/* Сахарный диабет */}
					<div className="warranty-form-group">
						<label className="warranty-label">Сахарный диабет</label>
						<select
							className="warranty-select"
							value={riskFactors.diabetes}
							onChange={(e) =>
								onRiskFactorsChange((prev) => ({
									...prev,
									diabetes: e.target.value as "none" | "compensated" | "decompensated",
								}))
							}
						>
							<option value="none">Отсутствует</option>
							<option value="compensated">Компенсированный (HbA1c &lt; 7.0%)</option>
							<option value="decompensated">Декомпенсированный (HbA1c &ge; 7.0%)</option>
						</select>
					</div>

					{/* Патология прикуса */}
					<div className="warranty-toggle-row">
						<span>Травматический прикус / окклюзия</span>
						<button
							type="button"
							className={`warranty-toggle-switch ${riskFactors.malocclusion ? "active" : ""}`}
							onClick={() => onRiskFactorsChange((prev) => ({ ...prev, malocclusion: !prev.malocclusion }))}
							aria-label="Малокклюзия"
						/>
					</div>

					{/* Пародонтит */}
					<div className="warranty-form-group">
						<label className="warranty-label">Заболевания пародонта</label>
						<select
							className="warranty-select"
							value={riskFactors.periodontitis}
							onChange={(e) =>
								onRiskFactorsChange((prev) => ({
									...prev,
									periodontitis: e.target.value as "none" | "mild" | "moderate" | "severe",
								}))
							}
						>
							<option value="none">Пародонт здоров (интактен)</option>
							<option value="mild">Пародонтит легкой степени</option>
							<option value="moderate">Пародонтит средней степени</option>
							<option value="severe">Генерализованный тяжелый пародонтит</option>
						</select>
					</div>

					{/* Итоговый HUD */}
					<div className="warranty-hud-summary">
						<div className="warranty-hud-row">
							<span className="lbl">Базовая гарантия:</span>
							<span className="val">{calculation.baseWarrantyMonths} мес.</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Коэффициент надежности:</span>
							<span className="val">{Math.round(calculation.totalRiskMultiplier * 100)}%</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Адаптированная гарантия:</span>
							<span className="val highlight">{calculation.adjustedWarrantyMonths} мес.</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Срок службы конструкций:</span>
							<span className="val">
								{calculation.adjustedServiceLifeMonths} мес. (
								{(calculation.adjustedServiceLifeMonths / 12).toFixed(1)} лет)
							</span>
						</div>
						<div className="warranty-hud-row">
							<span className="lbl">Следующий обязательный чекап:</span>
							<span className="val" style={{ color: "var(--teal)" }}>
								{formatShortDate(calculation.nextCheckupDueDate)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
