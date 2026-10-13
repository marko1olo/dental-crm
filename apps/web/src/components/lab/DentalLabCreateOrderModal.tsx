/**
 * DentalLabCreateOrderModal.tsx — Компактный фасад модального окна создания наряд-заказа в ЗТЛ.
 *
 * Архитектура декомпозиции (Mandate 8b <= 250 строк):
 * - orderCreateModules/labOrderCreateTypes.ts
 * - orderCreateModules/useLabOrderCreateForm.ts
 * - orderCreateModules/LabOrderTeethSelector.tsx
 * - orderCreateModules/LabOrderMaterialAndShadeSelector.tsx
 * - orderCreateModules/LabOrderTimelineAndCostCard.tsx
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Zap, Layers } from "lucide-react";
import {
	type DentalLabCreateOrderModalProps,
	LAB_ORDER_QUICK_PRESETS,
} from "./orderCreateModules/labOrderCreateTypes";
import { useLabOrderCreateForm } from "./orderCreateModules/useLabOrderCreateForm";
import { LabOrderTeethSelector } from "./orderCreateModules/LabOrderTeethSelector";
import { LabOrderMaterialAndShadeSelector } from "./orderCreateModules/LabOrderMaterialAndShadeSelector";
import { LabOrderTimelineAndCostCard } from "./orderCreateModules/LabOrderTimelineAndCostCard";

export type { DentalLabCreateOrderModalProps };

const DEFAULT_SAMPLE_LABS: readonly string[] = [
	"Центральная зуботехническая лаборатория «Денте-Лаб»",
	"Цифровая CAD/CAM лаборатория «Циркон-Про»",
	"Собственная ЗТЛ клиники",
];

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		sampleLabs = DEFAULT_SAMPLE_LABS,
		stageNumber,
		stageTitle,
	} = props;

	const form = useLabOrderCreateForm({ ...props, sampleLabs });

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const modalContent = (
		<div className="ztl-detail-overlay" style={{ zIndex: 99999 }}>
			<div className="ztl-detail-card" data-testid="dental-lab-create-order-modal" role="dialog" aria-modal="true" aria-labelledby="ztl-create-order-title">
				<header className="ztl-detail-header">
					<div className="flex items-center gap-2 flex-wrap min-w-0">
						<h3 id="ztl-create-order-title" className="m-0 text-sm font-bold">
							Оформление наряд-заказа в зуботехническую лабораторию (ЗТЛ)
						</h3>
						{(stageTitle || stageNumber != null) && (
							<span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs" data-testid="lab-create-order-stage-badge">
								<Layers size={11} className="text-teal-600 dark:text-teal-400" />
								<span>Этап {stageNumber ?? 1}: {stageTitle || "Ортопедия"}</span>
							</span>
						)}
					</div>
					<button type="button" className="ztl-btn-icon" onClick={onClose} aria-label="Закрыть" data-testid="btn-close-create-lab-order">
						<X size={16} />
					</button>
				</header>

				<form onSubmit={form.handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
					<div className="ztl-detail-body flex-1 overflow-y-auto min-h-0 space-y-3 p-3 sm:p-4">
						{/* 1-Click Chairside Express Presets Bar */}
						<div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
							<span className="text-xs font-bold flex items-center gap-1 text-[var(--ink)]">
								<Zap size={13} className="text-amber-500" />
								<span>Шаблоны:</span>
							</span>
							{LAB_ORDER_QUICK_PRESETS.map((qp) => (
								<button
									key={qp.id}
									type="button"
									className="ztl-chip text-[11px] py-1 px-2 cursor-pointer hover:border-teal-500 transition-colors"
									onClick={() => form.handleApplyQuickPreset(qp.workType, qp.shade, qp.stumpShade)}
									title={qp.tooltip}
								>
									{qp.labelRu}
								</button>
							))}
						</div>

						{/* Пациент и врач */}
						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label" htmlFor="input-patient-name">Пациент (Ф.И.О.) *</label>
								<input id="input-patient-name" type="text" className="ztl-form-input w-full" required placeholder="Ф.И.О. пациента" value={form.newPatientName} onChange={(e) => form.setNewPatientName(e.target.value)} />
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label" htmlFor="input-chart-number">№ Медкарты</label>
								<input id="input-chart-number" type="text" className="ztl-form-input w-full" placeholder="№ 1234" value={form.newChartNumber} onChange={(e) => form.setNewChartNumber(e.target.value)} />
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label" htmlFor="input-doctor-name">Врач-ортопед</label>
								<input id="input-doctor-name" type="text" className="ztl-form-input w-full" placeholder="Ф.И.О. врача" value={form.newDoctorName} onChange={(e) => form.setNewDoctorName(e.target.value)} />
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label" htmlFor="select-lab-name">Лаборатория (ЗТЛ)</label>
								<select id="select-lab-name" className="ztl-select w-full" value={form.newLabName} onChange={(e) => form.setNewLabName(e.target.value)}>
									{sampleLabs.map((lab) => (<option key={lab} value={lab}>{lab}</option>))}
								</select>
							</div>
						</div>

						{/* Зубная формула и мостовидные конструкции */}
						<LabOrderTeethSelector
							value={form.newTeethInput}
							onChange={(str) => form.setNewTeethInput(str)}
							isBridge={form.isBridge}
							onToggleBridge={form.setIsBridge}
						/>

						{/* Материал, шкала VITA, абатменты */}
						<LabOrderMaterialAndShadeSelector
							workType={form.newWorkType}
							onWorkTypeChange={form.handleWorkTypeChange}
							shade={form.newShade}
							onShadeChange={form.setNewShade}
							stumpShade={form.newStumpShade}
							onStumpShadeChange={form.setNewStumpShade}
							implantPlatform={form.newImplantPlatform}
							onImplantPlatformChange={form.setNewImplantPlatform}
							abutmentType={form.newAbutmentType}
							onAbutmentTypeChange={form.setNewAbutmentType}
							fixationType={form.newFixationType}
							onFixationTypeChange={form.setNewFixationType}
							clinicalNotes={form.newClinicalNotes}
							onClinicalNotesChange={form.setNewClinicalNotes}
						/>

						{/* Сроки, дедлайны и финансовый расчет */}
						<LabOrderTimelineAndCostCard
							workType={form.newWorkType}
							expectedLabDate={form.newExpectedLabDate}
							onExpectedLabDateChange={form.setNewExpectedLabDate}
							fittingDate={form.newFittingDate}
							onFittingDateChange={form.setNewFittingDate}
							hasCollision={form.collision.hasCollision}
							collisionWarningRu={form.collision.warningRu}
							autoBookFitting={form.autoBookFitting}
							onAutoBookFittingChange={form.setAutoBookFitting}
							techStage={form.newTechStage}
							onTechStageChange={form.setNewTechStage}
							initialStatus={form.newInitialStatus}
							onInitialStatusChange={form.setNewInitialStatus}
							priceRub={form.newPriceRub}
							onPriceRubChange={form.setNewPriceRub}
							costRub={form.newCostRub}
							onCostRubChange={form.setNewCostRub}
							toothCount={form.newTeethInput.split(",").filter((s) => s.trim().length > 0).length || 1}
						/>
					</div>

					<footer className="ztl-detail-footer flex-shrink-0 flex items-center justify-end gap-2 p-3 border-t border-[var(--line)]">
						<button type="button" className="ztl-btn-secondary" onClick={onClose}>
							Отмена
						</button>
						<button type="submit" className="ztl-btn-primary" data-testid="btn-submit-create-lab-order">
							<CheckCircle2 size={14} />
							<span>Сформировать наряд</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
