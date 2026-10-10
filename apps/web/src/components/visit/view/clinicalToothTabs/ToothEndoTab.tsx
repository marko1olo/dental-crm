import React from "react";
import {
	CheckCircle2,
	ChevronRight,
	ClipboardList,
	FileCheck2,
	Plus,
	Syringe,
	Zap,
} from "lucide-react";
import { TOOTH_804N_PRESETS } from "@dental/shared";
import {
	TOOTH_CLINICAL_PROTOCOLS,
	type ToothClinicalProtocol,
} from "./types";

export interface ToothEndoTabProps {
	code: string;
	state: string;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleAddClinicalProtocol: (proto: ToothClinicalProtocol) => void;
	// biome-ignore lint/suspicious/noExplicitAny: preset
	handleAdd804nService: (preset: any) => void;
	appendToEMKField: (field: string, text: string) => void;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
}

export function ToothEndoTab({
	code,
	state,
	handleSelectDiagnosis,
	handleAddClinicalProtocol,
	handleAdd804nService,
	appendToEMKField,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
}: ToothEndoTabProps) {
	return (
		<div className="_ccm-pane-section">
			<div className="_ccm-sub-label">Эндодонтический протокол</div>
			<div className="_ccm-items-grid">
				<button
					type="button"
					data-testid="visit-view-endo-canal-log-btn"
					className="_ccm-action-item highlight"
					onClick={() => {
						setEndoModalToothNumber(Number(code));
						setEndoModalToothState(
							state === "treatment"
								? "Пульпит / Периодонтит"
								: state,
						);
						setIsEndoModalOpen(true);
					}}
				>
					<ClipboardList className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="_ccm-item-title font-semibold">
						Журнал каналов (MB1, MB2, DB, P) — рабочая длина
					</span>
					<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
				</button>

				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"treatment",
							"депульпирование, хемомеханическая обработка каналов никель-титановыми инструментами",
							"treatmentPlan",
						)
					}
				>
					<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<span className="_ccm-item-title">
						Первичное эндо: депульпирование, расширение
					</span>
				</button>

				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"treatment",
							"временная обтурация каналов пастой гидроксида кальция",
							"treatmentPlan",
						)
					}
				>
					<FileCheck2 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="_ccm-item-title">
						Временная обтурация (Гидроксид кальция)
					</span>
				</button>

				<button
					type="button"
					className="_ccm-action-item"
					onClick={() =>
						handleSelectDiagnosis(
							"done",
							"постоянная обтурация каналов гуттаперчей с эпоксидным силером методом латеральной компакции",
							"treatmentPlan",
						)
					}
				>
					<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
					<span className="_ccm-item-title">
						Постоянная обтурация (Гуттаперча + силер)
					</span>
				</button>

				<button
					type="button"
					data-testid="quick-add-protocol-pulpitis"
					className="_ccm-action-item highlight"
					onClick={() => handleAddClinicalProtocol(TOOTH_CLINICAL_PROTOCOLS.pulpitis)}
				>
					<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title font-semibold">+ Пакет: Лечение пульпита</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">4 услуги · 12 700 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
				</button>

				<button
					type="button"
					data-testid="preset-endo-canals"
					className="_ccm-action-item highlight"
					onClick={() => handleAdd804nService(TOOTH_804N_PRESETS.endoCanals)}
				>
					<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title font-semibold">+ Лечение каналов</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.030 · 3 500 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
				</button>

				<button
					type="button"
					data-testid="visit-view-anesthesia-dosage-btn"
					className="_ccm-action-item"
					onClick={() => {
						appendToEMKField(
							"treatmentPlan",
							`Анестезия зуба ${code}: Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная.`,
						);
						handleAdd804nService(TOOTH_804N_PRESETS.anesthesiaInfiltration);
					}}
				>
					<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
					<div className="flex flex-col text-left truncate">
						<span className="_ccm-item-title">Анестезия зуба {code} (1 карп.)</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">A11.07.012 · 1 200 ₽</span>
					</div>
					<Plus className="w-3.5 h-3.5 text-sky-500 ml-auto shrink-0" />
				</button>
			</div>
		</div>
	);
}
