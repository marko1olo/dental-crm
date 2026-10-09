import React from "react";
import {
	Stethoscope,
	Calendar,
	Plus,
	Trash2,
	CheckCircle2
} from "lucide-react";
import {
	IncapacityReasonCode,
	IncapacityRegimeType,
	SickLeaveClosingCode,
	RegimeViolationCode,
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES
} from "../sickLeaveElnPresets";
import {
	IncapacityPeriod,
	calculateDaysBetween,
	formatDateRu
} from "../sickLeaveElnEngine";
import type { ElnDiagnosisAndPeriodSectionProps } from "./types";

export function ElnDiagnosisAndPeriodSection({
	formState,
	setFormState,
	handleAddPeriod,
	handleRemovePeriod,
	handlePeriodDateChange
}: ElnDiagnosisAndPeriodSectionProps) {
	return (
		<>
			{/* Clinical Diagnosis & Parameters */}
			<div className="sick-leave-section">
				<h4 className="sick-leave-section-title">
					<Stethoscope size={16} />
					Клинические параметры временной нетрудоспособности
				</h4>
				<div className="sick-leave-grid-3">
					<div className="sick-leave-field">
						<label className="sick-leave-label">Причина нетрудоспособности (СФР)</label>
						<select
							className="sick-leave-select"
							value={formState.reasonCode}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									reasonCode: e.target.value as IncapacityReasonCode
								}))
							}
						>
							{Object.values(INCAPACITY_REASON_CODES).map((r) => (
								<option key={r.code} value={r.code}>
									{r.titleRu}
								</option>
							))}
						</select>
					</div>

					<div className="sick-leave-field">
						<label className="sick-leave-label">Режим лечения</label>
						<select
							className="sick-leave-select"
							value={formState.regimeType}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									regimeType: e.target.value as IncapacityRegimeType
								}))
							}
						>
							<option value="ambulatory">01 - Амбулаторный</option>
						</select>
					</div>

					<div className="sick-leave-field">
						<label className="sick-leave-label">Код диагноза МКБ-10</label>
						<input
							type="text"
							className="sick-leave-input"
							value={formState.icd10Code}
							onChange={(e) =>
								setFormState((prev) => ({ ...prev, icd10Code: e.target.value }))
							}
						/>
					</div>
				</div>

				<div className="sick-leave-field">
					<label className="sick-leave-label">Клиническое описание диагноза</label>
					<textarea
						className="sick-leave-textarea"
						value={formState.diagnosisText}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, diagnosisText: e.target.value }))
						}
						rows={2}
					/>
				</div>
			</div>

			{/* Incapacity Periods Table */}
			<div className="sick-leave-section">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<h4 className="sick-leave-section-title">
						<Calendar size={16} />
						Периоды освобождения от работы
					</h4>
					<button type="button" className="sick-leave-add-period-btn" onClick={handleAddPeriod}>
						<Plus size={14} />
						Добавить период продления
					</button>
				</div>

				<div className="sick-leave-periods-list">
					{formState.periods.map((period, index) => {
						const pDays = calculateDaysBetween(period.dateFrom, period.dateTo);
						return (
							<div key={period.id} className="sick-leave-period-card">
								<div className="sick-leave-period-header">
									<span>
										Период №{index + 1}: с {formatDateRu(period.dateFrom)} по {formatDateRu(period.dateTo)}{' '}
										({pDays} кал. дн.)
									</span>
									{formState.periods.length > 1 && (
										<button
											type="button"
											onClick={() => handleRemovePeriod(index)}
											className="sick-leave-delete-period-btn"
											title="Удалить период"
											aria-label="Удалить период"
										>
											<Trash2 size={18} />
										</button>
									)}
								</div>

								<div className="sick-leave-grid-4">
									<div className="sick-leave-field">
										<label className="sick-leave-label">Дата с</label>
										<input
											type="date"
											className="sick-leave-input"
											value={period.dateFrom}
											onChange={(e) => handlePeriodDateChange(index, 'dateFrom', e.target.value)}
										/>
									</div>
									<div className="sick-leave-field">
										<label className="sick-leave-label">Дата по</label>
										<input
											type="date"
											className="sick-leave-input"
											value={period.dateTo}
											onChange={(e) => handlePeriodDateChange(index, 'dateTo', e.target.value)}
										/>
									</div>
									<div className="sick-leave-field">
										<label className="sick-leave-label">Врач</label>
										<input
											type="text"
											className="sick-leave-input"
											value={period.doctorFio}
											onChange={(e) => {
												const existing = formState.periods[index];
												if (!existing) return;
												const updated = [...formState.periods];
												const item: IncapacityPeriod = { ...existing, doctorFio: e.target.value };
												updated[index] = item;
												setFormState((prev) => ({ ...prev, periods: updated }));
											}}
										/>
									</div>
									<div className="sick-leave-field">
										<label className="sick-leave-label">Полномочие</label>
										<select
											className="sick-leave-select"
											value={period.doctorRole}
											onChange={(e) => {
												const existing = formState.periods[index];
												if (!existing) return;
												const updated = [...formState.periods];
												const item: IncapacityPeriod = {
													...existing,
													doctorRole: e.target.value as 'attending' | 'vk_member' | 'vk_chairperson'
												};
												updated[index] = item;
												setFormState((prev) => ({ ...prev, periods: updated }));
											}}
										>
											<option value="attending">Лечащий врач</option>
											<option value="vk_member">Член ВК + Председатель</option>
										</select>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Closing Status & Violations */}
			<div className="sick-leave-section">
				<h4 className="sick-leave-section-title">
					<CheckCircle2 size={16} />
					Закрытие ЭЛН и выход на работу
				</h4>
				<div className="sick-leave-grid-3">
					<div className="sick-leave-field">
						<label className="sick-leave-label">Итоговый статус</label>
						<select
							className="sick-leave-select"
							value={formState.closingCode}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									closingCode: e.target.value as SickLeaveClosingCode
								}))
							}
						>
							{Object.values(SICK_LEAVE_CLOSING_CODES).map((c) => (
								<option key={c.code} value={c.code}>
									{c.titleRu}
								</option>
							))}
						</select>
					</div>

					{formState.closingCode === '31' && (
						<div className="sick-leave-field">
							<label className="sick-leave-label">Приступить к работе с</label>
							<input
								type="date"
								className="sick-leave-input"
								value={formState.workResumeDate || ''}
								onChange={(e) =>
									setFormState((prev) => ({ ...prev, workResumeDate: e.target.value }))
								}
							/>
						</div>
					)}

					{formState.closingCode === '32' && (
						<div className="sick-leave-field">
							<label className="sick-leave-label">Номер нового ЭЛН (продолжения)</label>
							<input
								type="text"
								className="sick-leave-input"
								value={formState.nextElnNumber || ''}
								placeholder="999..."
								onChange={(e) =>
									setFormState((prev) => ({ ...prev, nextElnNumber: e.target.value }))
								}
							/>
						</div>
					)}

					<div className="sick-leave-field">
						<label className="sick-leave-label">Отметка о нарушении режима</label>
						<select
							className="sick-leave-select"
							value={formState.violationCode || ''}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									violationCode: (e.target.value || undefined) as RegimeViolationCode | undefined
								}))
							}
						>
							<option value="">Без нарушений</option>
							{Object.values(REGIME_VIOLATION_CODES).map((v) => (
								<option key={v.code} value={v.code}>
									{v.titleRu}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
		</>
	);
}
