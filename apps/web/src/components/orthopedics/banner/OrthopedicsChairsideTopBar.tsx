import React from "react";
import { Camera, X, Box } from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import type { OrthopedicsChairsideTopBarProps } from "./orthopedicsBannerTypes.js";

export function OrthopedicsChairsideTopBar({
	selectId,
	activeTeethInput,
	onChangeActiveTeethInput,
	activeXrayUrl,
	onDetachXray,
	jawScope,
	onChangeJawScope,
	selectedMaterial,
	onChangeSelectedMaterial,
	is3dViewerOpen,
	onToggle3dViewer,
}: OrthopedicsChairsideTopBarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-[var(--line)]">
			<div className="flex items-center gap-2">
				<DentalCrown size={18} className="text-[var(--primary)] shrink-0" />
				<div className="leading-tight">
					<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight">
						Ортопедический протокол у кресла
					</h3>
					<p className="text-[11px] text-[var(--muted)]">
						Клинические протоколы · Оттенки VITA · Наряды ЗТЛ
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5">
					<label htmlFor={`${selectId}-teeth`} className="text-xs font-semibold text-[var(--ink)]">
						Зуб(ы):
					</label>
					<input
						id={`${selectId}-teeth`}
						type="text"
						value={activeTeethInput}
						onChange={(e) => onChangeActiveTeethInput(e.target.value)}
						placeholder="16, 21"
						aria-label="Номера зубов FDI"
						className="min-h-[44px] sm:min-h-[34px] w-20 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
						data-testid="ortho-teeth-input"
					/>
				</div>

				<div
					className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-xs min-h-[44px] sm:min-h-[34px]"
					data-testid="attached-xray-badge"
				>
					<Camera size={15} className={activeXrayUrl ? "text-[var(--primary)] shrink-0" : "text-[var(--muted)] shrink-0"} />
					{activeXrayUrl ? (
						<div className="flex items-center gap-1.5">
							<span className="text-[var(--primary)] font-bold truncate max-w-[110px]" title="Снимок визита прикреплен к наряду ЗТЛ">
								Снимок привязан
							</span>
							<button
								type="button"
								onClick={onDetachXray}
								className="text-xs text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer font-bold px-0.5 inline-flex items-center"
								title="Открепить снимок"
							>
								<X className="w-3 h-3" />
							</button>
						</div>
					) : (
						<span className="text-[var(--muted)] font-medium">Без снимка</span>
					)}
				</div>

				<div
					className="p-0.5 bg-[var(--paper-subtle)] rounded-lg border border-[var(--line)] inline-flex items-center gap-0.5 shrink-0"
					data-testid="jaw-scope-selector"
					role="group"
					aria-label="Область челюсти"
				>
					{(["upper", "lower", "both"] as const).map((scope) => {
						const labels: Record<typeof scope, { short: string; full: string }> = {
							upper: { short: "ВЧ", full: "Верхняя челюсть" },
							lower: { short: "НЧ", full: "Нижняя челюсть" },
							both: { short: "Обе", full: "Обе челюсти" },
						};
						const isSelected = jawScope === scope;
						return (
							<button
								key={scope}
								type="button"
								onClick={() => onChangeJawScope(isSelected ? "none" : scope)}
								className={`min-h-[44px] sm:min-h-[30px] px-2.5 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
									isSelected
										? "bg-[var(--primary)] text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title={labels[scope].full}
								data-testid={`jaw-scope-${scope}-btn`}
							>
								{labels[scope].short}
							</button>
						);
					})}
				</div>

				{onToggle3dViewer && (
					<button
						type="button"
						onClick={onToggle3dViewer}
						className={`min-h-[44px] sm:min-h-[34px] px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
							is3dViewerOpen
								? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/40 shadow-xs"
								: "bg-[var(--paper-subtle)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						title="3D Интраоральный просмотрщик челюстей и прикуса"
						data-testid="toggle-ortho-3d-viewer-btn"
					>
						<Box className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
						<span>3D-скан</span>
					</button>
				)}

				<select
					value={selectedMaterial}
					onChange={(e) => onChangeSelectedMaterial(e.target.value)}
					aria-label="Материал конструкции"
					className="min-h-[44px] sm:min-h-[34px] px-2.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
				>
					<option value="ZrO2 Multi-Layer">ZrO2 Multi-Layer</option>
					<option value="IPS e.max Press">IPS e.max Press</option>
					<option value="Металлокерамика Noritake">Металлокерамика Noritake</option>
					<option value="PMMA CAD/CAM">PMMA CAD/CAM</option>
					<option value="Acry-Free / Квадротти">Acry-Free / Квадротти</option>
					<option value="Временная Protemp 4">Временная Protemp 4</option>
				</select>
			</div>
		</div>
	);
}
