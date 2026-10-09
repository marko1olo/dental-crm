import React from "react";
import {
	Anchor,
	ChevronRight,
	Crown,
	FileCheck2,
	Plus,
	Scissors,
	Sparkles,
} from "lucide-react";
import { TOOTH_804N_PRESETS } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import {
	TOOTH_CLINICAL_PROTOCOLS,
	type ToothClinicalProtocol,
} from "./types";

export interface ToothSurgeryTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[] | undefined;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleAddClinicalProtocol: (proto: ToothClinicalProtocol) => void;
	// biome-ignore lint/suspicious/noExplicitAny: preset
	handleAdd804nService: (preset: any) => void;
	closeClinicalModal: () => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
}

export function ToothSurgeryTab({
	selectedToothForMenu,
	visitWarnings,
	handleSelectDiagnosis,
	handleAddClinicalProtocol,
	handleAdd804nService,
	closeClinicalModal,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
}: ToothSurgeryTabProps) {
	return (
		<div className="_ccm-pane-section">
			<div className="_ccm-sub-label">Ортопедия (CAD/CAM & Лаборатория)</div>
			<div className="_ccm-items-grid">
				<button
					type="button"
					className="_ccm-action-item"
					onClick={() => {
						setLabOrderModalToothNumber(
							selectedToothForMenu?.code,
						);
						setIsLabOrderModalOpen(true);
						closeClinicalModal();
					}}
				>
					<FileCheck2 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="_ccm-item-title font-semibold">
						Наряд в ЗТЛ (CAD/CAM коронка ZrO2 / E.max)
					</span>
					<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
				</button>

				<button
					type="button"
					data-testid="preset-surgery-crown"
					className="_ccm-action-item highlight"
					onClick={() => {
						handleSelectDiagnosis(
							"done",
							"установлена и зафиксирована металлокерамическая / диоксид циркония коронка",
							"treatmentPlan",
						);
						handleAdd804nService(TOOTH_804N_PRESETS.crownZirconia);
						closeClinicalModal();
					}}
				>
					<Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title font-semibold">+ Коронка цирконий / МК</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.004 · 24 000 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
				</button>

				<button
					type="button"
					className="_ccm-action-item"
					onClick={() => {
						handleSelectDiagnosis(
							"done",
							"установлен керамический винир IPS e.max Press с адгезивной фиксацией",
							"treatmentPlan",
						);
						closeClinicalModal();
					}}
				>
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="_ccm-item-title">
						Керамический винир E.max зафиксирован
					</span>
				</button>
			</div>

			<div className="_ccm-sub-label">Хирургия & Имплантация</div>
			<div className="_ccm-items-grid">
				<button
					type="button"
					data-testid="quick-add-protocol-extraction"
					className="_ccm-action-item highlight"
					onClick={() => handleAddClinicalProtocol(TOOTH_CLINICAL_PROTOCOLS.extraction)}
				>
					<Scissors className="w-3.5 h-3.5 text-red-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title font-semibold">+ Пакет: Удаление зуба</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">3 услуги · 5 500 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
				</button>

				<button
					type="button"
					data-testid="preset-surgery-extraction"
					className="_ccm-action-item highlight"
					onClick={() => {
						handleSelectDiagnosis(
							"treatment",
							"удаление зуба: анестезия, синдесмотомия, экстракция, кюретаж лунки",
							"treatmentPlan",
						);
						handleAdd804nService(TOOTH_804N_PRESETS.extractionPermanent);
					}}
				>
					<Scissors className="w-3.5 h-3.5 text-red-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title font-semibold">+ Удаление постоянного зуба</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.001 · 3 500 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
				</button>

				<button
					type="button"
					className="_ccm-action-item"
					onClick={() => {
						if (
							visitWarnings?.some((w: any) =>
								/бисфосф|bisph/i.test(w.title + w.detail),
							)
						) {
							showToast(
								"Предупреждение: у пациента бисфосфонаты в анамнезе (риск остеонекроза челюсти).",
								"warning",
							);
						}
						handleSelectDiagnosis(
							"treatment",
							"дентальная имплантация в позиции зуба",
							"treatmentPlan",
						);
						closeClinicalModal();
					}}
				>
					<Anchor className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="_ccm-item-title">
						Дентальная имплантация
					</span>
				</button>
			</div>
		</div>
	);
}
