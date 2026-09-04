import React from "react";
import { CheckCircle2, ChevronDown, Layers, Palette, Crown, Sparkles, ShieldCheck, Shield, Compass, Scissors, FileText, Zap } from "lucide-react";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
	addWorkingDays,
} from "./labMath";

export interface DentalLabRestorationTabProps {
	selectedTeeth: number[];
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	toggleTooth: (tooth: number) => void;
	selectQuadrant: (teeth: number[]) => void;
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	dueDate: string;
	setDueDate: (date: string) => void;
	clinicalNotes: string;
	setClinicalNotes: (notes: string) => void;
	impressionType?: string;
	setImpressionType?: (type: string) => void;
	// Tier 1 Hot Path Shade Props
	shadeSystem?: "classical" | "3d_master" | "bleach";
	setShadeSystem?: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical?: string;
	setShadeClassical?: (shade: string) => void;
	shade3dMaster?: string;
	setShade3dMaster?: (shade: string) => void;
	shadeBleach?: string;
	setShadeBleach?: (shade: string) => void;
	shadeBody?: string;
	setShadeBody?: (shade: string) => void;
	onOpenAdvancedShades?: () => void;
	// Tier 2 Secondary Occlusion & Fit Props (Accordion)
	occlusalScheme?: string;
	setOcclusalScheme?: (scheme: string) => void;
	contactTightness?: string;
	setContactTightness?: (tightness: string) => void;
	surfaceTexture?: string;
	setSurfaceTexture?: (texture: string) => void;
	cementGapMicrons?: number;
	setCementGapMicrons?: (gap: number) => void;
}

export function DentalLabRestorationTab({
	selectedTeeth,
	setSelectedTeeth,
	toggleTooth,
	selectQuadrant,
	constructionType,
	setConstructionType,
	material,
	setMaterial,
	dueDate,
	setDueDate,
	clinicalNotes,
	setClinicalNotes,
	impressionType = "a_silicone",
	setImpressionType,
	shadeSystem = "classical",
	setShadeSystem,
	shadeClassical = "A2",
	setShadeClassical,
	shade3dMaster = "2M2",
	setShade3dMaster,
	shadeBleach = "BL2",
	setShadeBleach,
	shadeBody,
	setShadeBody,
	onOpenAdvancedShades,
	occlusalScheme = "mutually_protected",
	setOcclusalScheme,
	contactTightness = "normal",
	setContactTightness,
	surfaceTexture = "natural_anatomy",
	setSurfaceTexture,
	cementGapMicrons = 30,
	setCementGapMicrons,
}: DentalLabRestorationTabProps) {
	const [manualFdiInput, setManualFdiInput] = React.useState(selectedTeeth.join(", "));
	const [fdiValidationError, setFdiValidationError] = React.useState<string | null>(null);

	// Sync manual input when selectedTeeth changes externally
	React.useEffect(() => {
		setManualFdiInput(selectedTeeth.join(", "));
	}, [selectedTeeth]);

	const handleManualFdiChange = (val: string) => {
		setManualFdiInput(val);
		if (!val.trim()) {
			setSelectedTeeth([]);
			setFdiValidationError(null);
			return;
		}

		const tokens = val.split(/[\s,;-]+/).filter(Boolean);
		const parsedNumbers: number[] = [];
		let hasInvalid = false;

		for (const tok of tokens) {
			const n = Number.parseInt(tok, 10);
			if (Number.isNaN(n) || (n < 11 || (n > 48 && n < 51) || n > 85)) {
				hasInvalid = true;
			} else {
				parsedNumbers.push(n);
			}
		}

		if (hasInvalid) {
			setFdiValidationError("Укажите корректные номера зубов FDI (11–48 постоянные, 51–85 временные)");
		} else {
			setFdiValidationError(null);
			setSelectedTeeth(Array.from(new Set(parsedNumbers)).sort((a, b) => a - b));
		}
	};

	return (
		<div className="space-y-6">
			{/* FDI Direct Input with autoFocus & Validation */}
			<div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-2">
				<div className="flex items-center justify-between">
					<label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
						Быстрый ввод номеров зубов по формуле FDI (11–48 / 51–85)
					</label>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						Например: 11, 12, 21, 22 или выберите на схеме ниже
					</span>
				</div>
				<input
					type="text"
					autoFocus
					placeholder="16, 17, 26..."
					value={manualFdiInput}
					onChange={(e) => handleManualFdiChange(e.target.value)}
					className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
				/>
				{fdiValidationError && (
					<p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold m-0">
						{fdiValidationError}
					</p>
				)}
			</div>

			{/* Impression Type & Scan File Selection */}
			<div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-3">
				<div className="flex items-center justify-between">
					<label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
						Этап 1: Слепок / Интраоральный цифровой скан (Оттискная масса)
					</label>
					<span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
						СанПиН 3.3686-21
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{[
						{ id: "a_silicone", label: "А-силикон (VPS)", desc: "Прецизионный оттиск" },
						{ id: "c_silicone", label: "С-силикон", desc: "Базовый слепок" },
						{ id: "polyether", label: "Полиэфир (Impregum)", desc: "Имплантология" },
						{ id: "hydrocolloid", label: "Гидроколлоид", desc: "Сверхточный уступ" },
						{ id: "alginate", label: "Альгинат", desc: "Диагностика/каппы" },
						{ id: "digital_scan_stl_ply", label: "3D-скан (STL/PLY)", desc: "Интраоральный CAD" },
					].map((mat) => {
						const isSelected = impressionType === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => setImpressionType?.(mat.id)}
								className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-xs ring-1 ring-[var(--teal)]"
										: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
								}`}
							>
								<div className="font-bold truncate">{mat.label}</div>
								<div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
									{mat.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* FDI Odontogram Mini-Picker with Compact Upper / Lower / Reset Controls */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-2.5">
					<div className="flex items-center gap-2">
						<span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
							Зубная формула (FDI ISO 3950)
						</span>
						<span className="text-xs px-3 py-1 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
							{selectedTeeth.length > 0
								? `Выбрано: ${selectedTeeth.join(", ")} (${selectedTeeth.length} ед.)`
								: "Выберите зубы для наряда"}
						</span>
					</div>
					<div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
						<button
							type="button"
							onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
							className="lab-quadrant-btn"
							title="Выбрать верхний зубной ряд (18–28)"
						>
							Верхняя
						</button>
						<button
							type="button"
							onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
							className="lab-quadrant-btn"
							title="Выбрать нижний зубной ряд (48–38)"
						>
							Нижняя
						</button>
						<button
							type="button"
							onClick={() => setSelectedTeeth([])}
							className="lab-quadrant-clear-btn"
							title="Сбросить выбор зубов"
						>
							Сброс
						</button>
					</div>
				</div>

				{/* Quadrant Visual Grid with >= 34x34px tooth buttons (1-touch interactive FDI formula) */}
				<div className="space-y-4 select-none pt-1">
					{/* Desktop & Tablet View (16-teeth horizontal arch per jaw with distinct 4-quadrant separation) */}
					<div className="hidden md:block space-y-3.5">
						{/* Upper Maxilla: Q1 (18-11) and Q2 (21-28) */}
						<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
								<span>1-й квадрант (18–11) • Верхний правый</span>
								<span>2-й квадрант (21–28) • Верхний левый</span>
							</div>
							<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
								{/* Q1: 18 to 11 */}
								<div className="flex items-center gap-1.5">
									{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t} (Q1)`}
										>
											{t}
										</button>
									))}
								</div>

								{/* Vertical Midline Divider */}
								<div className="flex flex-col items-center justify-center px-2 shrink-0">
									<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
									<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
								</div>

								{/* Q2: 21 to 28 */}
								<div className="flex items-center gap-1.5">
									{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t} (Q2)`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Lower Mandible: Q4 (48-41) and Q3 (31-38) */}
						<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
								<span>4-й квадрант (48–41) • Нижний правый</span>
								<span>3-й квадрант (31–38) • Нижний левый</span>
							</div>
							<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
								{/* Q4: 48 to 41 */}
								<div className="flex items-center gap-1.5">
									{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t} (Q4)`}
										>
											{t}
										</button>
									))}
								</div>

								{/* Vertical Midline Divider */}
								<div className="flex flex-col items-center justify-center px-2 shrink-0">
									<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
									<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
								</div>

								{/* Q3: 31 to 38 */}
								<div className="flex items-center gap-1.5">
									{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t} (Q3)`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Mobile & Small Screen View (Clean 4 Quadrants: Q1, Q2, Q4, Q3 with min 32-34px tactile buttons) */}
					<div className="block md:hidden space-y-3">
						{/* Upper Maxilla: Q1 (18-11) */}
						<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
								1-й квадрант Q1 (18–11) • Верхний правый
							</div>
							<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
								<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
									{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t}`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Upper Maxilla: Q2 (21-28) */}
						<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
								2-й квадрант Q2 (21–28) • Верхний левый
							</div>
							<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
								<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
									{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t}`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Lower Mandible: Q4 (48-41) */}
						<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
								4-й квадрант Q4 (48–41) • Нижний правый
							</div>
							<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
								<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
									{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t}`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Lower Mandible: Q3 (31-38) */}
						<div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
							<div className="text-xs font-bold text-slate-600 dark:text-slate-300">
								3-й квадрант Q3 (31–38) • Нижний левый
							</div>
							<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 touch-pan-x">
								<div className="grid grid-cols-8 gap-1 sm:gap-1.5 min-w-[260px] pr-2 sm:pr-0">
									{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => toggleTooth(t)}
											className={`lab-tooth-btn !min-w-[28px] xs:!min-w-[32px] sm:!min-w-[34px] !min-h-[38px] !w-full !px-0 text-xs font-bold ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
											title={`Зуб ${t}`}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 3-CLICK EXPRESS ORTHOPEDIC CONFIGURATOR (Mandate 8e: Fast 0-Click Core Loop & 3-Click Law) */}
			<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-amber-500/5 border-2 border-amber-500/30 space-y-4 shadow-sm">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
							<Zap size={18} className="fill-current" />
						</span>
						<div>
							<h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 m-0 leading-tight">
								Оформление наряда ЗТЛ в 3 клика (Мандат 8e)
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
								Клик 1: Зуб/Мост · Клик 2: Конструкция · Клик 3: Цвет VITA · Авто-срок сдачи
							</p>
						</div>
					</div>
					<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
						⚡ Hot Path ортопеда
					</span>
				</div>

				{/* 1-CLICK STANDARD PRESET BUTTON (LAW 4) */}
				<div className="p-3 bg-white dark:bg-slate-900/90 border border-amber-500/40 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
							<Sparkles size={15} className="text-amber-500 shrink-0" />
							<span>1-КЛИК ПРЕСЕТ СТАНДАРТНОГО НАРЯДА:</span>
						</div>
						<p className="text-[11px] text-slate-600 dark:text-slate-300 m-0 mt-0.5 font-medium">
							«Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней»
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							setConstructionType("single_crown");
							setMaterial("zirconia_multilayer");
							setShadeSystem?.("classical");
							setShadeClassical?.("A2");
							setShadeBody?.("A2");
							setSurfaceTexture?.("natural_anatomy");
							setCementGapMicrons?.(30);
							setOcclusalScheme?.("mutually_protected");
							setContactTightness?.("normal");
							const due = addWorkingDays(new Date(), 5);
							setDueDate(due.toISOString().slice(0, 10));
						}}
						className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
						data-testid="btn-apply-standard-zirconia-preset"
						title="Применить стандартный ортопедический пресет (ZrO2, A2, анатомическая форма, 5 дней)"
					>
						<Zap size={14} className="fill-current" />
						<span>⚡ Применить пресет (ZrO2 A2, 5 дней)</span>
					</button>
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

				{/* STEP 2: Выбор конструкции из 4 ключевых (Клик 2) */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
							2. Конструкция (Клик 2):
						</span>
						<span className="text-[11px] text-slate-500 dark:text-slate-400">
							ZrO2 · E.max · Металлокерамика · Съемный протез
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
						{[
							{
								id: "zirconia",
								title: "Коронка ZrO2 (диоксид циркония)",
								subtitle: "Katana Multilayer (1100 МПа)",
								constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
								materialId: "zirconia_multilayer",
								days: 5,
								costRub: 6500,
								badge: "5 раб. дней",
							},
							{
								id: "emax",
								title: "E.max (дисиликат лития)",
								subtitle: "IPS e.max Press / CAD (500 МПа)",
								constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
								materialId: "emax_lithium_disilicate",
								days: 5,
								costRub: 7500,
								badge: "5 раб. дней",
							},
							{
								id: "pfm",
								title: "Металлокерамика (Co-Cr)",
								subtitle: "Фрезерованный / литой КХС каркас",
								constructionId: constructionType === "bridge" ? "bridge" : "single_crown",
								materialId: "pfm_cocr",
								days: 7,
								costRub: 4000,
								badge: "7 раб. дней",
							},
							{
								id: "removable",
								title: "Съемный протез (бюгель / акрил)",
								subtitle: "Кламмерная или замковая фиксация",
								constructionId: "clasp_denture",
								materialId: "cobalt_chrome_cocr",
								days: 10,
								costRub: 12000,
								badge: "10 раб. дней",
							},
						].map((opt) => {
							const isMatch =
								(opt.id === "removable" && constructionType === "clasp_denture") ||
								(opt.id !== "removable" && material === opt.materialId);
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

				{/* STEP 3: Цвет шкалы VITA (Клик 3) */}
				<div className="space-y-2 pt-1 border-t border-amber-500/20">
					<div className="flex items-center justify-between">
						<span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
							3. Цвет шкалы VITA (Клик 3):
						</span>
						<span className="text-xs font-bold text-[var(--teal)]">
							Выбран: {shadeSystem === "bleach" ? (shadeBleach || "BL2") : (shadeClassical || "A2")}
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
						{[
							{ shade: "A1", desc: "Светлый естественный", isBleach: false },
							{ shade: "A2", desc: "Стандарт (60% пациентов)", isBleach: false },
							{ shade: "A3", desc: "Насыщенный дентинный", isBleach: false },
							{ shade: "BL2", desc: "Bleach отбеленный", isBleach: true },
							{ shade: "B1", desc: "Светло-желтый тон", isBleach: false },
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
									className={`min-h-[44px] p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
										isSelected
											? "bg-[var(--teal-surface)] border-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
											: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300"
									}`}
									data-testid={`fast-shade-${item.shade}`}
								>
									<div className="flex items-center gap-1.5">
										<span
											className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0"
											style={{
												backgroundColor: swatch?.bg || "#f0eae0",
												borderColor: swatch?.border || "#ccc",
											}}
										/>
										<span className="text-xs font-black text-slate-900 dark:text-slate-100">
											{item.shade}
										</span>
									</div>
									<span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-full">
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

			{/* Construction Type Grid with >= 44px touch targets */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Тип ортопедической конструкции (Анатомический вид)
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{CONSTRUCTION_TYPES.map((c) => {
						const isSelected = constructionType === c.id;
						const IconComp =
							c.category === "Несъемное"
								? Crown
								: c.category === "Эстетика"
								? Sparkles
								: c.category === "Имплантология"
								? ShieldCheck
								: c.category === "Съемное"
								? Layers
								: c.category === "Каппы"
								? Compass
								: FileText;

						return (
							<button
								key={c.id}
								type="button"
								onClick={() => setConstructionType(c.id)}
								className={`lab-construct-card ${isSelected ? "is-active" : ""}`}
							>
								<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[var(--teal)] border border-teal-200 dark:border-teal-800 flex-shrink-0">
									<IconComp className="w-5 h-5" />
								</div>
								<div className="space-y-1 flex-1">
									<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
										<span>{c.name}</span>
										{isSelected && (
											<CheckCircle2 className="w-4 h-4 text-[var(--teal)] flex-shrink-0 ml-1" />
										)}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
										{c.desc}
									</div>
									<span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1">
										{c.category}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Material Selection with >= 44px touch targets */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Материал изготовления (CAD/CAM и Керамика)
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{LAB_MATERIALS.map((m) => {
						const isSelected = material === m.id;
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => setMaterial(m.id)}
								className={`min-h-[52px] p-3.5 text-left rounded-xl border transition-all flex items-center justify-between gap-3 ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)]"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
								}`}
							>
								<div className="space-y-1">
									<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
										{m.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400">
										{m.desc}
									</div>
								</div>
								<div className="flex flex-col items-end gap-1 flex-shrink-0">
									<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap">
										{m.tag}
									</span>
									<span className="text-[11px] font-mono font-bold text-[var(--teal)]">
										{(m as any).unitCostRub ? `${(m as any).unitCostRub.toLocaleString("ru-RU")} ₽/ед.` : "6 500 ₽/ед."}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* VITA Ceramic Shade Selector (Classical, 3D-Master, Bleach) — Tier 1 Hot Path */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<Palette className="w-4 h-4 text-[var(--teal)]" />
						<label className="text-sm font-bold text-slate-900 dark:text-slate-100">
							Расцветка керамики VITA:
						</label>
						<span className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
							{shadeSystem === "3d_master" ? (shade3dMaster || "2M2") : shadeSystem === "bleach" ? (shadeBleach || "BL2") : (shadeClassical || "A2")}
						</span>
					</div>

					{/* Shade System Switcher Tabs */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
							<button
								type="button"
								onClick={() => {
									setShadeSystem?.("classical");
									setShadeBody?.(shadeClassical);
								}}
								className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
									shadeSystem === "classical"
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
							>
								VITA Classical
							</button>
							<button
								type="button"
								onClick={() => {
									setShadeSystem?.("3d_master");
									setShadeBody?.(shade3dMaster);
								}}
								className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
									shadeSystem === "3d_master"
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
							>
								3D-Master
							</button>
							<button
								type="button"
								onClick={() => {
									setShadeSystem?.("bleach");
									setShadeBody?.(shadeBleach);
								}}
								className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
									shadeSystem === "bleach"
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
							>
								Bleach
							</button>
						</div>

						{onOpenAdvancedShades && (
							<button
								type="button"
								onClick={onOpenAdvancedShades}
								className="text-xs font-bold text-[var(--teal)] hover:underline cursor-pointer flex items-center gap-1"
							>
								<span>3-Зонная стратификация и Культя →</span>
							</button>
						)}
					</div>
				</div>

				{/* VITA Classical Swatches */}
				{shadeSystem === "classical" && (
					<div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
						{VITA_CLASSICAL_SHADES.map((shade) => {
							const isSelected = shadeClassical === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShadeClassical?.(shade);
										setShadeBody?.(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
									title={`Оттенок VITA ${shade}: ${swatch?.desc || ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#f0eae0", borderColor: swatch?.border || "#ccc" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}

				{/* VITA 3D-Master Swatches */}
				{shadeSystem === "3d_master" && (
					<div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-2 max-h-48 overflow-y-auto pr-1">
						{VITA_3D_MASTER_SHADES.map((shade) => {
							const isSelected = shade3dMaster === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShade3dMaster?.(shade);
										setShadeBody?.(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
									title={`3D-Master ${shade}: ${swatch?.desc || ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#f0eae0", borderColor: swatch?.border || "#ccc" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}

				{/* VITA Bleach Swatches */}
				{shadeSystem === "bleach" && (
					<div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
						{VITA_BLEACH_SHADES.map((shade) => {
							const isSelected = shadeBleach === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShadeBleach?.(shade);
										setShadeBody?.(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
									title={`Bleach ${shade}: ${swatch?.desc || ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#ffffff", borderColor: swatch?.border || "#eee" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Due Date & General Clinical Notes */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Срок сдачи работы (Дедлайн лаборатории)
					</label>
					<input
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
					/>
					<div className="flex items-center gap-1.5 flex-wrap pt-1">
						{[
							{ label: "+2 дн. (PMMA)", days: 2 },
							{ label: "+3 дн. (Вкладка)", days: 3 },
							{ label: "+5 дн. (E.max)", days: 5 },
							{ label: "+7 дн. (ZrO₂)", days: 7 },
							{ label: "+10 дн. (Мосты)", days: 10 },
						].map((item) => (
							<button
								key={item.days}
								type="button"
								onClick={() => {
									const due = addWorkingDays(new Date(), item.days);
									setDueDate(due.toISOString().slice(0, 10));
								}}
								className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer"
								data-testid={`fast-date-${item.days}`}
							>
								{item.label}
							</button>
						))}
					</div>
				</div>
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Особые пожелания врачу / технику
					</label>
					<input
						type="text"
						placeholder="Напр. Пациент уезжает 25 числа, примерка на воске..."
						value={clinicalNotes}
						onChange={(e) => setClinicalNotes(e.target.value)}
						className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
					/>
					<div className="flex items-center gap-1.5 flex-wrap pt-1">
						{[
							"Примерка каркаса",
							"Примерка на воске",
							"Срочно! Пациент уезжает",
							"Окклюзия под контролем",
							"Подбор по фото",
							"Индивидуальный абатмент",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => {
									setClinicalNotes(clinicalNotes ? `${clinicalNotes}, ${chip}` : chip);
								}}
								className="px-2 py-0.5 text-[10px] font-medium rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
								data-testid={`fast-chip-${chip.slice(0, 8)}`}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Accordion: Secondary Technical & Occlusal Parameters (Tier 2 Context) */}
			<details className="group border border-slate-200 dark:border-slate-700/60 rounded-2xl bg-slate-50 dark:bg-slate-800/40 transition-all overflow-hidden">
				<summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 select-none hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
					<div className="flex items-center gap-2">
						<Layers className="w-4 h-4 text-[var(--teal)]" />
						<span>Вторичные параметры: Окклюзия, контакты, текстура и цементный зазор</span>
					</div>
					<span className="text-xs text-slate-400 font-normal group-open:rotate-180 transition-transform">
						▼
					</span>
				</summary>
				<div className="p-4 pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-5 bg-white/60 dark:bg-slate-900/40">
					{/* Occlusal Scheme */}
					<div className="space-y-2">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							Окклюзионная концепция и Биомеханика
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							{OCCLUSAL_SCHEMES.map((scheme) => {
								const isSelected = occlusalScheme === scheme.id;
								return (
									<button
										key={scheme.id}
										type="button"
										onClick={() => setOcclusalScheme?.(scheme.id)}
										className={`min-h-[48px] p-3 text-left rounded-xl border text-xs transition-all ${
											isSelected
												? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)] font-bold text-[var(--teal)]"
												: "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
										}`}
									>
										<div className="font-bold flex items-center justify-between">
											<span>{scheme.name}</span>
											{isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />}
										</div>
										<div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
											{scheme.desc}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Contact Tightness */}
					<div className="space-y-2">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							Плотность апроксимальных контактов
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{CONTACT_TIGHTNESS_OPTIONS.map((c) => {
								const isSelected = contactTightness === c.id;
								return (
									<button
										key={c.id}
										type="button"
										onClick={() => setContactTightness?.(c.id)}
										className={`min-h-[44px] p-2.5 text-left rounded-xl border text-xs transition-all ${
											isSelected
												? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)] font-bold text-[var(--teal)]"
												: "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
										}`}
									>
										<div className="font-bold">{c.name}</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
											{c.desc}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Surface Texture */}
					<div className="space-y-2">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							Текстура поверхности и Финишная обработка
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{SURFACE_TEXTURE_OPTIONS.map((t) => {
								const isSelected = surfaceTexture === t.id;
								return (
									<button
										key={t.id}
										type="button"
										onClick={() => setSurfaceTexture?.(t.id)}
										className={`min-h-[44px] p-2.5 text-left rounded-xl border text-xs transition-all ${
											isSelected
												? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)] font-bold text-[var(--teal)]"
												: "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
										}`}
									>
										<div className="font-bold">{t.name}</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
											{t.desc}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Cement Gap */}
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
								Цементный зазор CAD/CAM (Cement Space Gap)
							</label>
							<span className="text-sm font-black text-[var(--teal)] font-mono">
								{cementGapMicrons} мкм
							</span>
						</div>
						<input
							type="range"
							min="10"
							max="100"
							step="5"
							value={cementGapMicrons}
							onChange={(e) => setCementGapMicrons?.(Number(e.target.value))}
							className="w-full h-2.5 accent-[var(--teal)] cursor-pointer"
						/>
						<div className="flex justify-between text-[11px] text-slate-500 font-medium">
							<span>10 мкм (Прецизионный)</span>
							<span>30–40 мкм (Стандарт ISO)</span>
							<span>100 мкм (Широкий)</span>
						</div>
					</div>
				</div>
			</details>
		</div>
	);
}
