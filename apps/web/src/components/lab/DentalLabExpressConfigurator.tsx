import React from "react";
import { Sparkles, Zap } from "lucide-react";
import { addWorkingDays } from "./labMath";

export interface DentalLabExpressConfiguratorProps {
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	dueDate: string;
	setDueDate: (date: string) => void;
	shadeSystem?: ("classical" | "3d_master" | "bleach") | undefined;
	setShadeSystem?: ((system: "classical" | "3d_master" | "bleach") => void) | undefined;
	shadeClassical?: string | undefined;
	setShadeClassical?: ((shade: string) => void) | undefined;
	shadeBleach?: string | undefined;
	setShadeBleach?: ((shade: string) => void) | undefined;
	shadeBody?: string | undefined;
	setShadeBody?: ((shade: string) => void) | undefined;
	surfaceTexture?: string | undefined;
	setSurfaceTexture?: ((texture: string) => void) | undefined;
	cementGapMicrons?: number | undefined;
	setCementGapMicrons?: ((gap: number) => void) | undefined;
	occlusalScheme?: string | undefined;
	setOcclusalScheme?: ((scheme: string) => void) | undefined;
	contactTightness?: string | undefined;
	setContactTightness?: ((tightness: string) => void) | undefined;
	impressionType?: string | undefined;
	setImpressionType?: ((type: string) => void) | undefined;
	onOpenAdvancedShades?: (() => void) | undefined;
}

const PRESETS = [
	{ id: "zirconia_std", title: "Цирконий (Prettau)", desc: "Анатомическая коронка ZrO2", mat: "zirconia_multilayer", days: 5, shade: "A2" },
	{ id: "emax_press", title: "Керамика IPS e.max", desc: "Пресс-керамика высокой эстетики", mat: "emax_press", days: 4, shade: "A2" },
	{ id: "cermet_std", title: "Металлокерамика", desc: "Классическая коронка CoCr", mat: "metal_ceramic_standard", days: 5, shade: "A3" },
	{ id: "pmma_temp", title: "Временная PMMA", desc: "Провизорная фрезерованная", mat: "pmma_temporary", days: 2, shade: "A2" },
] as const;

/**
 * Экспресс-конфигуратор ортопедических конструкций в 1 клик (Мандат 8b, 8e: <= 120 строк).
 */
export function DentalLabExpressConfigurator({
	setConstructionType,
	material,
	setMaterial,
	setDueDate,
	setShadeClassical,
	setShadeBody,
}: DentalLabExpressConfiguratorProps) {
	return (
		<div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-2xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
						<Zap size={16} className="fill-current" />
					</span>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">Быстрый наряд изделия</h3>
						<p className="text-xs text-[var(--muted)]">Выбор конструкции, материала и цвета зуба в 1 клик</p>
					</div>
				</div>
				<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1">
					<Sparkles size={12} className="text-amber-600 dark:text-amber-400" />
					<span>1 клик</span>
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{PRESETS.map((p) => {
					const isSelected = material === p.mat;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => {
								setConstructionType("single_crown");
								setMaterial(p.mat);
								setDueDate(addWorkingDays(new Date(), p.days).toISOString().slice(0, 10));
								setShadeClassical?.(p.shade);
								setShadeBody?.(p.shade);
							}}
							className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[44px] ${
								isSelected
									? "bg-[var(--paper)] border-amber-500 ring-2 ring-amber-500/30 shadow-xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-[var(--paper)]"
							}`}
							data-testid={`lab-preset-btn-${p.id}`}
						>
							<div>
								<div className="font-bold text-xs text-[var(--ink)]">{p.title}</div>
								<div className="text-[11px] text-[var(--muted)] mt-0.5">{p.desc}</div>
							</div>
							<div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-amber-700 dark:text-amber-300">
								<span>Цвет: {p.shade}</span>
								<span>Срок: {p.days} раб. дн.</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default DentalLabExpressConfigurator;
