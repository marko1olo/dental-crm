import React from "react";
import { Zap, Sparkles, CheckCircle2, Crown, Layers, Palette } from "lucide-react";
import { SHADE_SWATCH_MAP, addWorkingDays } from "./labMath";

export interface DentalLabExpressConfiguratorProps {
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	dueDate: string;
	setDueDate: (date: string) => void;
	shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
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

export function DentalLabExpressConfigurator({
	constructionType,
	setConstructionType,
	material,
	setMaterial,
	dueDate,
	setDueDate,
	shadeSystem = "classical",
	setShadeSystem,
	shadeClassical = "A2",
	setShadeClassical,
	shadeBleach = "BL2",
	setShadeBleach,
	shadeBody,
	setShadeBody,
	surfaceTexture,
	setSurfaceTexture,
	cementGapMicrons,
	setCementGapMicrons,
	occlusalScheme,
	setOcclusalScheme,
	contactTightness,
	setContactTightness,
	impressionType,
	setImpressionType,
	onOpenAdvancedShades,
}: DentalLabExpressConfiguratorProps) {
	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-amber-500/5 border-2 border-amber-500/30 space-y-4 shadow-sm">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
						<Zap size={18} className="fill-current" />
					</span>
					<div>
						<h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 m-0 leading-tight">
							Оформление наряда ЗТЛ в 3 клика (Автономия врача)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
							Клик 1: Зуб/Мост · Клик 2: Конструкция · Клик 3: Цвет VITA · Авто-срок сдачи
						</p>
					</div>
				</div>
				<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 inline-flex items-center gap-1">
					<Zap size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Hot Path ортопеда</span>
				</span>
			</div>

			{/* 1-CLICK STANDARD PRESETS (Mandate 8e: 4 Canonical Presets) */}
			<div className="space-y-2">
				<div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
					<Sparkles size={15} className="text-amber-500 shrink-0" />
					<span>4 КАНОНИЧЕСКИХ 1-КЛИК ПРЕСЕТА (ОРТОПЕДИЯ БЕЗ СИМУЛЯТОРА):</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{[
						{
							id: "zirconia_std",
							title: "Цирконий (Prettau / Katana)",
							subtitle: "Анатомическая форма · А-силикон · зазор 30 мкм",
							materialId: "zirconia_multilayer",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							days: 5,
							cementGap: 30,
							occlusion: "mutually_protected",
							contact: "normal",
							texture: "natural_anatomy",
							impression: "a_silicone",
							pricePatientRub: 24000,
							costLabRub: 7500,
							badge: "5 раб. дней",
						},
						{
							id: "pmma_temp",
							title: "Временная PMMA CAD/CAM",
							subtitle: "Фрезерованная провизорная · зазор 40 мкм",
							materialId: "pmma_temporary",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							days: 2,
							cementGap: 40,
							occlusion: "group_function",
							contact: "normal",
							texture: "natural_anatomy",
							impression: "a_silicone",
							pricePatientRub: 3500,
							costLabRub: 1200,
							badge: "2 раб. дня",
						},
						{
							id: "pfm_duceram",
							title: "Металлокерамика (Duceram)",
							subtitle: "Классика Co-Cr · VITA A2 · зазор 40 мкм",
							materialId: "pfm_cocr",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							days: 7,
							cementGap: 40,
							occlusion: "group_function",
							contact: "normal",
							texture: "natural_anatomy",
							impression: "a_silicone",
							pricePatientRub: 15000,
							costLabRub: 5000,
							badge: "7 раб. дней",
						},
						{
							id: "implant_screw",
							title: "Винтовая фиксация Ti-Base",
							subtitle: "ZrO₂ + Ti-Base / Multi-unit · зазор 30 мкм",
							materialId: "titanium_custom_abutment",
							constructionId: "implant_abutment",
							days: 7,
							cementGap: 30,
							occlusion: "mutually_protected",
							contact: "normal",
							texture: "natural_anatomy",
							impression: "digital_scan_stl_ply",
							pricePatientRub: 38000,
							costLabRub: 13000,
							badge: "7 раб. дней",
						},
					].map((preset) => {
						const isMatch =
							material === preset.materialId &&
							(preset.constructionId === "implant_abutment" ? constructionType === "implant_abutment" : true);
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => {
									setConstructionType(preset.constructionId);
									setMaterial(preset.materialId);
									setShadeSystem?.("classical");
									setShadeClassical?.("A2");
									setShadeBody?.("A2");
									setSurfaceTexture?.(preset.texture);
									setCementGapMicrons?.(preset.cementGap);
									setOcclusalScheme?.(preset.occlusion);
									setContactTightness?.(preset.contact);
									if (preset.impression) {
										setImpressionType?.(preset.impression);
									}
									const due = addWorkingDays(new Date(), preset.days);
									setDueDate(due.toISOString().slice(0, 10));
								}}
								className={`min-h-[64px] p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
									isMatch
										? "bg-[var(--teal-surface)] border-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
										: "bg-white dark:bg-slate-900 border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 shadow-2xs"
								}`}
								data-testid={`btn-apply-${preset.id}-preset`}
								title={`${preset.title}: ${preset.subtitle} (${preset.pricePatientRub.toLocaleString("ru-RU")} ₽ / ${preset.costLabRub.toLocaleString("ru-RU")} ₽)`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug">
										{preset.title}
									</span>
									{isMatch && <CheckCircle2 size={15} className="text-[var(--teal)] shrink-0" />}
								</div>
								<div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
									{preset.subtitle}
								</div>
								<div className="flex items-center justify-between gap-1 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
									<span className="font-mono font-bold text-[var(--teal)]">
										{preset.pricePatientRub.toLocaleString("ru-RU")} ₽
									</span>
									<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold">
										{preset.badge}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* STEP 1: Зуб / Мост (1 клик) */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
						1. Зуб или Мост (Клик 1):
					</span>
					<span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
						{constructionType === "bridge" ? "Мостовидный протез" : "Одиночная коронка / зуб"}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setConstructionType("single_crown")}
						className={`min-h-[44px] p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
							constructionType === "single_crown"
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400"
						}`}
						data-testid="fast-type-single-crown"
					>
						<Crown size={15} />
						<span>Одиночная коронка (Зуб)</span>
					</button>
					<button
						type="button"
						onClick={() => setConstructionType("bridge")}
						className={`min-h-[44px] p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
							constructionType === "bridge"
								? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400"
						}`}
						data-testid="fast-type-bridge"
					>
						<Layers size={15} />
						<span>Мостовидный протез (Мост)</span>
					</button>
				</div>
			</div>

			{/* STEP 2: Выбор конструкции из 6 канонических + PMMA (Клик 2) */}
			<div className="space-y-2">
				<div className="flex items-center justify-between flex-wrap gap-1">
					<span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
						2. Конструкция (Клик 2):
					</span>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						ZrO2 Katana · МК Co-Cr · IPS e.max · Винир · Бюгель · Ti-Base · PMMA
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
					{[
						{
							id: "zirconia",
							title: "Цирконий (Prettau / Katana)",
							subtitle: "Анатомическая коронка ZrO₂ (1100 МПа)",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							materialId: "zirconia_multilayer",
							days: 5,
							costRub: 7500,
							badge: "5 раб. дней",
						},
						{
							id: "pfm",
							title: "Металлокерамика (PFM Co-Cr)",
							subtitle: "Классический Co-Cr каркас + Duceram Plus",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							materialId: "pfm_cocr",
							days: 7,
							costRub: 5000,
							badge: "7 раб. дней",
						},
						{
							id: "emax_press",
							title: "IPS e.max Press (Дисиликат)",
							subtitle: "Прессованная стеклокерамика (500 МПа)",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							materialId: "emax_lithium_disilicate",
							days: 4,
							costRub: 8000,
							badge: "4 раб. дня",
						},
						{
							id: "ceramic_veneer",
							title: "Керамический винир (E.max)",
							subtitle: "Ультратонкая эстетическая накладка / рефрактор",
							constructionId: "veneer",
							materialId: "emax_lithium_disilicate",
							days: 5,
							costRub: 9000,
							badge: "5 раб. дней",
						},
						{
							id: "clasp_denture",
							title: "Съемный бюгель (Co-Cr)",
							subtitle: "Бюгельный протез на кламмерах / замках Bredent",
							constructionId: "clasp_denture",
							materialId: "cobalt_chrome_cocr",
							days: 10,
							costRub: 18000,
							badge: "10 раб. дней",
						},
						{
							id: "implant_screw",
							title: "Винтовая фиксация Ti-Base",
							subtitle: "ZrO₂ + титановое основание Multi-unit",
							constructionId: "implant_abutment",
							materialId: "titanium_custom_abutment",
							days: 7,
							costRub: 13000,
							badge: "7 раб. дней",
						},
						{
							id: "pmma",
							title: "Временная PMMA CAD/CAM",
							subtitle: "Фрезерованная провизорная пластмасса",
							constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
							materialId: "pmma_temporary",
							days: 2,
							costRub: 1200,
							badge: "2 раб. дня",
						},
					].map((opt) => {
						const isMatch =
							(opt.id === "ceramic_veneer" && constructionType === "veneer") ||
							(opt.id === "clasp_denture" && constructionType === "clasp_denture") ||
							(opt.id === "implant_screw" && constructionType === "implant_abutment") ||
							(opt.id === "zirconia" && constructionType !== "veneer" && material === "zirconia_multilayer") ||
							(opt.id === "pfm" && material === "pfm_cocr") ||
							(opt.id === "emax_press" && constructionType !== "veneer" && material === "emax_lithium_disilicate") ||
							(opt.id === "pmma" && material === "pmma_temporary");
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => {
									setConstructionType(opt.constructionId);
									setMaterial(opt.materialId);
									const due = addWorkingDays(new Date(), opt.days);
									setDueDate(due.toISOString().slice(0, 10));
								}}
								className={`min-h-[56px] p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
									isMatch
										? "bg-[var(--teal-surface)] border-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
										: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-500/5"
								}`}
								data-testid={`fast-ortho-${opt.id}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
										{opt.title}
									</span>
									{isMatch && <CheckCircle2 size={15} className="text-[var(--teal)] shrink-0" />}
								</div>
								<div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
									{opt.subtitle}
								</div>
								<div className="flex items-center justify-between gap-1 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
									<span className="font-mono font-bold text-[var(--teal)]">{opt.costRub.toLocaleString("ru-RU")} ₽</span>
									<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold">{opt.badge}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* STEP 3: Цвет шкалы VITA (Клик 3) — Полный спектр A1..D4 + Bleach */}
			<div className="space-y-2.5 pt-2 border-t border-amber-500/20">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
							3. Цвет шкалы VITA (Клик 3):
						</span>
						<span className="text-xs font-bold text-[var(--teal)]">
							Выбран: {shadeSystem === "bleach" ? (shadeBleach || "BL2") : (shadeClassical || "A2")}
						</span>
					</div>
					{onOpenAdvancedShades && (
						<button
							type="button"
							onClick={onOpenAdvancedShades}
							className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition cursor-pointer inline-flex items-center gap-1"
						>
							<Palette size={13} />
							<span>Шкала культи ND / 3D-Master</span>
						</button>
					)}
				</div>

				{/* 1-Click Fast VITA Shades Matrix (A1..D4 + Bleach) */}
				<div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-1.5">
					{[
						// Group A (Standard 60% patients)
						{ shade: "A1", desc: "Светлый", isBleach: false },
						{ shade: "A2", desc: "Стандарт", isBleach: false },
						{ shade: "A3", desc: "Дентин", isBleach: false },
						{ shade: "A3.5", desc: "Темный A", isBleach: false },
						{ shade: "A4", desc: "Интенсив", isBleach: false },
						// Group B (Yellowish)
						{ shade: "B1", desc: "Светло-желтый", isBleach: false },
						{ shade: "B2", desc: "Желтый", isBleach: false },
						{ shade: "B3", desc: "Насыщ. желтый", isBleach: false },
						{ shade: "B4", desc: "Темно-желтый", isBleach: false },
						// Bleach
						{ shade: "BL2", desc: "Bleach", isBleach: true },
						// Group C (Greyish)
						{ shade: "C1", desc: "Светло-серый", isBleach: false },
						{ shade: "C2", desc: "Серый", isBleach: false },
						{ shade: "C3", desc: "Насыщ. серый", isBleach: false },
						{ shade: "C4", desc: "Темно-серый", isBleach: false },
						// Group D (Reddish-grey)
						{ shade: "D2", desc: "Красно-серый", isBleach: false },
						{ shade: "D3", desc: "Насыщ. D3", isBleach: false },
						{ shade: "D4", desc: "Темный D4", isBleach: false },
						// Additional Bleach
						{ shade: "BL1", desc: "Ultra-White", isBleach: true },
						{ shade: "BL3", desc: "Soft Bleach", isBleach: true },
						{ shade: "BL4", desc: "Natural BL", isBleach: true },
					].map((item) => {
						const swatch = SHADE_SWATCH_MAP[item.shade];
						const isSelected = item.isBleach
							? shadeSystem === "bleach" && shadeBleach === item.shade
							: shadeSystem === "classical" && shadeClassical === item.shade;

						return (
							<button
								key={item.shade}
								type="button"
								onClick={() => {
									if (item.isBleach) {
										setShadeSystem?.("bleach");
										setShadeBleach?.(item.shade);
										setShadeBody?.(item.shade);
									} else {
										setShadeSystem?.("classical");
										setShadeClassical?.(item.shade);
										setShadeBody?.(item.shade);
									}
								}}
								className={`min-h-[44px] p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
										: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300"
								}`}
								data-testid={`fast-shade-${item.shade}`}
								title={`${item.shade}: ${item.desc}`}
							>
								<div className="flex items-center gap-1">
									<span
										className="w-3 h-3 rounded-full border shadow-2xs shrink-0"
										style={{
											backgroundColor: swatch?.bg || "#f0eae0",
											borderColor: swatch?.border || "#ccc",
										}}
									/>
									<span className="text-[11px] font-black text-slate-900 dark:text-slate-100">
										{item.shade}
									</span>
								</div>
								<span className="text-[9px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-full">
									{item.desc}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* STEP 4: Срок сдачи (авто-расчет + быстрая корректировка) */}
			<div className="p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
				<div>
					<span className="font-bold text-slate-800 dark:text-slate-200 block">
						Плановый срок сдачи работы из ЗТЛ:
					</span>
					<span className="text-slate-500 dark:text-slate-400 text-[11px]">
						Дата готовности в клинике (без учета выходных): <strong className="text-teal-600 dark:text-teal-400 font-mono">{dueDate || "Не указана"}</strong>
					</span>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					{[
						{ label: "+3 дн (Срочно)", days: 3 },
						{ label: "+5 дн (Стандарт)", days: 5 },
						{ label: "+7 дн", days: 7 },
						{ label: "+10 дн", days: 10 },
					].map((chip) => (
						<button
							key={chip.days}
							type="button"
							onClick={() => {
								const due = addWorkingDays(new Date(), chip.days);
								setDueDate(due.toISOString().slice(0, 10));
							}}
							className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
						>
							{chip.label}
						</button>
					))}
					<input
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500"
						title="Выбрать точную дату сдачи"
					/>
				</div>
			</div>
		</div>
	);
}
