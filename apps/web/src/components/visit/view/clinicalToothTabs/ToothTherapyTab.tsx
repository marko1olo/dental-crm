import React from "react";
import {
	ChevronRight,
	ClipboardList,
	Crown,
	Edit3,
	Plus,
	Sparkles,
	Syringe,
} from "lucide-react";
import { TOOTH_804N_PRESETS } from "@dental/shared";
import {
	TOOTH_CLINICAL_PROTOCOLS,
	type ToothClinicalProtocol,
} from "./types";

export interface ToothTherapyTabProps {
	code: string;
	state: string;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	selectedSurfaces: string[];
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleAddClinicalProtocol: (proto: ToothClinicalProtocol) => void;
	// biome-ignore lint/suspicious/noExplicitAny: preset
	handleAdd804nService: (preset: any) => void;
	appendToEMKField: (field: string, text: string) => void;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
}

export function ToothTherapyTab({
	code,
	state,
	materialCategory,
	setMaterialCategory,
	selectedSurfaces,
	handleSelectDiagnosis,
	handleAddClinicalProtocol,
	handleAdd804nService,
	appendToEMKField,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
}: ToothTherapyTabProps) {
	return (
		<div className="_ccm-pane-section">
			{materialCategory === "filling" ? (
				<div className="_ccm-material-subview">
					<div className="_ccm-sub-label">
						Выбор композитного материала
					</div>
					<div className="_ccm-items-grid">
						{[
							{
								name: "Световой композит Filtek Z250 / Gradia",
								desc: "композит Filtek Z250 / Gradia Direct",
							},
							{
								name: "Нанокомпозит Ceram.x Spectra ST",
								desc: "эстетический нанокомпозит Ceram.x Spectra ST",
							},
							{
								name: "Премиум Estelite Asteria Tokuyama",
								desc: "высокоэстетическая пломба Estelite Asteria Tokuyama",
							},
						].map((mat) => (
							<button
								key={mat.name}
								type="button"
								className="_ccm-action-item"
								onClick={() => {
									const cavityNote =
										selectedSurfaces.length > 0
											? ` (полость ${selectedSurfaces.join("")})`
											: "";
									handleSelectDiagnosis(
										"done",
										`установлена пломба${cavityNote} (${mat.desc}), полировка`,
										"treatmentPlan",
									);
									handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
									setMaterialCategory(null);
								}}
							>
								<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
								<span className="_ccm-item-title">
									{mat.name}
									{selectedSurfaces.length > 0
										? ` [${selectedSurfaces.join("")}]`
										: ""}
								</span>
								<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
							</button>
						))}
						<button
							type="button"
							className="_ccm-action-item _ccm-back-row"
							onClick={() => setMaterialCategory(null)}
						>
							<span>← Назад к видам терапии</span>
						</button>
					</div>
				</div>
			) : (
				<div className="_ccm-items-grid">
					<div className="_ccm-sub-label">Терапевтические протоколы</div>
					<button
						type="button"
						className="_ccm-action-item"
						onClick={() => {
							const cavityNote =
								selectedSurfaces.length > 0
									? ` полости [${selectedSurfaces.join("")}]`
									: " кариозной полости";
							handleSelectDiagnosis(
								"treatment",
								`препарирование${cavityNote}, медикаментозная обработка, пломбирование`,
								"treatmentPlan",
							);
						}}
					>
						<Edit3 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="_ccm-item-title">
							Лечение кариеса
							{selectedSurfaces.length > 0
								? ` [${selectedSurfaces.join("")}]`
								: ""}
						</span>
						<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
					</button>

					<button
						type="button"
						className="_ccm-action-item"
						onClick={() => setMaterialCategory("filling")}
					>
						<Crown className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="_ccm-item-title">
							Поставить световую пломбу...
						</span>
						<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
					</button>

					<button
						type="button"
						data-testid="quick-add-protocol-caries"
						className="_ccm-action-item highlight"
						onClick={() => handleAddClinicalProtocol(TOOTH_CLINICAL_PROTOCOLS.caries)}
					>
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<div className="flex flex-col text-left truncate">
							<span className="_ccm-item-title font-semibold">+ Пакет: Лечение кариеса</span>
							<span className="text-[10px] text-[var(--muted)] font-mono">3 услуги · 6 700 ₽</span>
						</div>
						<Plus className="w-3.5 h-3.5 text-[var(--teal)] ml-auto shrink-0" />
					</button>

					<button
						type="button"
						data-testid="preset-therapy-filling"
						className="_ccm-action-item highlight"
						onClick={() => handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling)}
					>
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<div className="flex flex-col text-left truncate">
							<span className="_ccm-item-title font-semibold">+ Пломба световая</span>
							<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.002.010 · 4 500 ₽</span>
						</div>
						<Plus className="w-3.5 h-3.5 text-[var(--teal)] ml-auto shrink-0" />
					</button>

					<button
						type="button"
						data-testid="visit-view-anesthesia-dosage-btn"
						className="_ccm-action-item highlight"
						onClick={() => {
							appendToEMKField(
								"treatmentPlan",
								`Анестезия зуба ${code}: Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
							);
							handleAdd804nService(TOOTH_804N_PRESETS.anesthesiaInfiltration);
						}}
					>
						<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
						<div className="flex flex-col text-left truncate">
							<span className="_ccm-item-title font-semibold">Анестезия зуба {code} (1 карп.)</span>
							<span className="text-[10px] text-[var(--muted)] font-mono">A11.07.012 · 1 200 ₽</span>
						</div>
						<Plus className="w-3.5 h-3.5 text-sky-500 ml-auto shrink-0" />
					</button>

					<button
						type="button"
						data-testid="visit-view-endo-canal-log-btn"
						className="_ccm-action-item"
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
						<span className="_ccm-item-title">
							Журнал каналов (MB1, MB2, DB, P)
						</span>
						<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
					</button>
				</div>
			)}
		</div>
	);
}
