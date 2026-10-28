import React from "react";
import { Bookmark, Layers, Palette } from "lucide-react";
import { addWorkingDays } from "./labMath";

export interface DentalLabExpressConfiguratorProps {
	constructionType?: string;
	setConstructionType: (type: string) => void;
	material?: string;
	setMaterial: (mat: string) => void;
	dueDate?: string;
	setDueDate: (date: string) => void;
	shadeClassical?: string | undefined;
	setShadeClassical?: ((shade: string) => void) | undefined;
	shadeBleach?: string | undefined;
	setShadeBleach?: ((shade: string) => void) | undefined;
	shadeBody?: string | undefined;
	setShadeBody?: ((shade: string) => void) | undefined;
	onOpenAdvancedShades?: (() => void) | undefined;
}

export const CHAIRSIDE_EXPRESS_PRESETS = [
	{ id: "zirconia_prettau", title: "Коронка диоксид циркония (Katana STML)", shortTitle: "Коронка Katana STML (ZrO2)", mat: "zirconia_multilayer", type: "single_crown", days: 5, shade: "A2" },
	{ id: "emax_press", title: "Коронка E.max прессованная", shortTitle: "Коронка E.max прессованная", mat: "emax_lithium_disilicate", type: "single_crown", days: 5, shade: "A2" },
	{ id: "pfm_cocr", title: "Металлокерамика", shortTitle: "Металлокерамика CoCr", mat: "pfm_cocr", type: "single_crown", days: 5, shade: "A3" },
	{ id: "pmma_cadcam", title: "Временная PMMA CAD/CAM", shortTitle: "Временная PMMA CAD/CAM", mat: "pmma_temporary", type: "single_crown", days: 2, shade: "A2" },
	{ id: "buegel_clasp", title: "Съемный бюгельный протез", shortTitle: "Съемный бюгельный протез", mat: "buegel_cocr_clasp", type: "clasp_denture", days: 7, shade: "A3" },
	{ id: "aligners_set", title: "Элайнеры (набор капп)", shortTitle: "Элайнеры (набор капп)", mat: "biocompatible_3d_resin", type: "aligners", days: 7, shade: "BL2" },
] as const;

export const VITA_EXPRESS_SHADES = ["A1", "A2", "A3", "A3.5", "B1", "Bleach"] as const;

export function DentalLabExpressConfigurator(props: DentalLabExpressConfiguratorProps) {
	const currentShade = props.shadeClassical || "A2";
	const handleSelectShade = (sh: string) => {
		if (sh === "Bleach") {
			props.setShadeBleach?.("BL2");
			props.setShadeBody?.("BL2");
		} else {
			props.setShadeClassical?.(sh);
			props.setShadeBody?.(sh);
		}
	};

	return (
		<div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 shadow-2xs" data-testid="chairside-express-configurator">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shadow-2xs">
						<Layers size={16} />
					</span>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">1-клик наряд у кресла ортопеда</h3>
						<p className="text-xs text-[var(--muted)]">Готовые клинические пресеты со сроками и цветом</p>
					</div>
				</div>
				<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper)] text-[var(--ink-secondary)] border border-[var(--line)] flex items-center gap-1">
					<Bookmark size={12} className="text-teal-600 dark:text-teal-400" />
					<span>1 клик</span>
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{CHAIRSIDE_EXPRESS_PRESETS.map((p) => {
					const isSelected = props.material === p.mat;
					return (
						<button
							key={p.id} type="button"
							onClick={() => {
								props.setConstructionType(p.type);
								props.setMaterial(p.mat);
								props.setDueDate(addWorkingDays(new Date(), p.days).toISOString().slice(0, 10));
								handleSelectShade(p.shade === "BL2" ? "Bleach" : p.shade);
							}}
							className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[44px] ${
								isSelected
									? "bg-[var(--paper)] border-[var(--teal,#0d9488)] ring-2 ring-teal-500/20 shadow-2xs"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`chairside-preset-${p.id}`}
						>
							<div className="font-bold text-xs text-[var(--ink)]">{p.shortTitle}</div>
							<div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-teal-700 dark:text-teal-300">
								<span>Цвет: {p.shade}</span>
								<span>+{p.days} раб. дн.</span>
							</div>
						</button>
					);
				})}
			</div>

			<div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
					<Palette size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Цвет VITA (в 1 тап):</span>
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{VITA_EXPRESS_SHADES.map((sh) => {
						const isSel = sh === "Bleach" ? props.shadeBleach?.startsWith("BL") : currentShade === sh;
						return (
							<button
								key={sh} type="button" onClick={() => handleSelectShade(sh)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`express-vita-shade-${sh}`}
							>
								{sh}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default DentalLabExpressConfigurator;
