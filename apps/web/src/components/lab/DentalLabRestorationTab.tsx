import React from "react";
import {
	CheckCircle2,
	Layers,
	Palette,
	Crown,
	Sparkles,
	ShieldCheck,
	Compass,
	FileText,
	Zap,
	RefreshCw,
	ArrowUp,
	ArrowDown,
} from "lucide-react";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	addWorkingDays,
	type JawScope,
	isJawWideConstruction,
} from "./labMath";
import {
	DentalLabFdiOdontogramPicker,
	type DentalLabFdiOdontogramPickerProps,
} from "./DentalLabFdiOdontogramPicker";
import {
	DentalLabExpressConfigurator,
	type DentalLabExpressConfiguratorProps,
} from "./DentalLabExpressConfigurator";

export {
	DentalLabFdiOdontogramPicker,
	type DentalLabFdiOdontogramPickerProps,
	DentalLabExpressConfigurator,
	type DentalLabExpressConfiguratorProps,
};

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
	// Jaw scope for full arch orders (splints, guards, full dentures)
	jawScope?: JawScope | null;
	setJawScope?: (scope: JawScope | null) => void;
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
	jawScope = null,
	setJawScope,
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
			{/* ─── ОБЩЕЧЕЛЮСТНОЙ ТУМБЛЕР / ЧИПЫ ВЫБОРА ЧЕЛЮСТИ (Мандат 8e / Без блокировок) ─── */}
			<div
				className={`p-4 rounded-2xl border transition-all ${
					jawScope
						? "bg-teal-500/10 dark:bg-teal-950/30 border-teal-500/50 shadow-xs"
						: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60"
				}`}
				data-testid="lab-jaw-scope-panel"
			>
				<div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
					<div className="flex items-center gap-2">
						<span className="p-1 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] font-bold text-xs">
							<Layers size={15} />
						</span>
						<label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 m-0">
							Наряд на челюсть целиком (Общечелюстное изделие)
						</label>
					</div>
					<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
						Каппы, сплинты, ПСПП, шаблоны — выбор зубов не обязателен!
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => setJawScope?.(jawScope === "upper" ? null : "upper")}
						className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 touch-manipulation ${
							jawScope === "upper"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm ring-2 ring-teal-400/40"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 hover:bg-teal-50/20"
						}`}
						data-testid="jaw-scope-upper-btn"
						aria-pressed={jawScope === "upper"}
					>
						<div className="flex items-center gap-2">
							<ArrowUp size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<div className="text-left">
								<div className="leading-tight">Верхняя челюсть</div>
								<div className={`text-[10px] font-normal ${jawScope === "upper" ? "text-teal-100" : "text-slate-400"}`}>
									(В/Ч)
								</div>
							</div>
						</div>
						{jawScope === "upper" && <CheckCircle2 size={16} className="text-white shrink-0" />}
					</button>

					<button
						type="button"
						onClick={() => setJawScope?.(jawScope === "lower" ? null : "lower")}
						className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 touch-manipulation ${
							jawScope === "lower"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm ring-2 ring-teal-400/40"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 hover:bg-teal-50/20"
						}`}
						data-testid="jaw-scope-lower-btn"
						aria-pressed={jawScope === "lower"}
					>
						<div className="flex items-center gap-2">
							<ArrowDown size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<div className="text-left">
								<div className="leading-tight">Нижняя челюсть</div>
								<div className={`text-[10px] font-normal ${jawScope === "lower" ? "text-teal-100" : "text-slate-400"}`}>
									(Н/Ч)
								</div>
							</div>
						</div>
						{jawScope === "lower" && <CheckCircle2 size={16} className="text-white shrink-0" />}
					</button>

					<button
						type="button"
						onClick={() => setJawScope?.(jawScope === "both" ? null : "both")}
						className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 touch-manipulation ${
							jawScope === "both"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm ring-2 ring-teal-400/40"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 hover:bg-teal-50/20"
						}`}
						data-testid="jaw-scope-both-btn"
						aria-pressed={jawScope === "both"}
					>
						<div className="flex items-center gap-2">
							<RefreshCw size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<div className="text-left">
								<div className="leading-tight">Обе челюсти</div>
								<div className={`text-[10px] font-normal ${jawScope === "both" ? "text-teal-100" : "text-slate-400"}`}>
									(В/Ч + Н/Ч)
								</div>
							</div>
						</div>
						{jawScope === "both" && <CheckCircle2 size={16} className="text-white shrink-0" />}
					</button>
				</div>

				{jawScope && (
					<div className="mt-2.5 p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
						<div className="flex items-center gap-1.5 font-bold truncate">
							<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>
								Наряд на челюсть:{" "}
								<strong>
									{jawScope === "upper"
										? "Верхняя челюсть"
										: jawScope === "lower"
										? "Нижняя челюсть"
										: "Обе челюсти"}
								</strong>
							</span>
							<span className="text-[11px] font-normal opacity-85 hidden sm:inline">
								· Врач свободен от выбора отдельных зубов (Автономия врача)
							</span>
						</div>
						<button
							type="button"
							onClick={() => setJawScope?.(null)}
							className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer shrink-0 ml-2"
						>
							Сбросить челюсть
						</button>
					</div>
				)}
			</div>
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
						Дезинфекция оттиска
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
			<DentalLabFdiOdontogramPicker
				selectedTeeth={selectedTeeth}
				setSelectedTeeth={setSelectedTeeth}
				toggleTooth={toggleTooth}
				selectQuadrant={selectQuadrant}
				jawScope={jawScope}
			/>

			{/* 3-CLICK EXPRESS ORTHOPEDIC CONFIGURATOR (Mandate 8e: Fast 0-Click Core Loop & 3-Click Law) */}
			<DentalLabExpressConfigurator
				constructionType={constructionType}
				setConstructionType={setConstructionType}
				material={material}
				setMaterial={setMaterial}
				dueDate={dueDate}
				setDueDate={setDueDate}
				shadeSystem={shadeSystem}
				setShadeSystem={setShadeSystem}
				shadeClassical={shadeClassical}
				setShadeClassical={setShadeClassical}
				shadeBleach={shadeBleach}
				setShadeBleach={setShadeBleach}
				shadeBody={shadeBody}
				setShadeBody={setShadeBody}
				surfaceTexture={surfaceTexture}
				setSurfaceTexture={setSurfaceTexture}
				cementGapMicrons={cementGapMicrons}
				setCementGapMicrons={setCementGapMicrons}
				occlusalScheme={occlusalScheme}
				setOcclusalScheme={setOcclusalScheme}
				contactTightness={contactTightness}
				setContactTightness={setContactTightness}
				impressionType={impressionType}
				setImpressionType={setImpressionType}
				onOpenAdvancedShades={onOpenAdvancedShades}
			/>

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
								onClick={() => {
									setConstructionType(c.id);
									if (isJawWideConstruction(c.id) && !jawScope) {
										setJawScope?.("upper");
									}
								}}
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
		</div>
	);
}
