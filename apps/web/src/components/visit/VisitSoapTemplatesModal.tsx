import React from "react";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Bone,
	BookOpen,
	Check,
	Clock,
	Crown,
	FileText,
	Filter,
	Flame,
	HeartPulse,
	Layers,
	PackageCheck,
	PlusCircle,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	X,
	Zap,
} from "lucide-react";
import {
	type ClinicalPresetCategory,
	type ClinicalSoapPreset,
	CLINICAL_SOAP_PRESETS,
	calculatePresetMaterialsCost,
	formatSoapFromPreset,
	generateMaterialsDeductionReceipt,
	searchPresets,
} from "./clinicalSoapPresets";

export interface VisitSoapTemplatesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyPreset: (
		preset: ClinicalSoapPreset,
		targetTooth?: number | null,
		mode?: "clean_replace" | "smart_append",
	) => void;
	readonly activeTooth?: number | null;
	readonly isLocked?: boolean;
}

const COMMON_FDI_TEETH = [16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48];

interface DbOutpatientTemplate {
	id: number;
	categoryId: number;
	categoryName: string;
	categorySpecialty: string;
	name: string;
	contentJson: { text?: string } | null;
	mkbCode: string | null;
	order: number;
}

function mapDbTemplateToPreset(tpl: DbOutpatientTemplate): ClinicalSoapPreset {
	const rawText = tpl.contentJson?.text || "";
	let category: ClinicalPresetCategory = "therapy";
	if (tpl.categorySpecialty === "surgery") category = "surgery";
	else if (tpl.categorySpecialty === "orthopedics") category = "orthopedics";
	else if (tpl.categorySpecialty === "periodontics") category = "periodontology";
	else if (tpl.categorySpecialty === "preventive") category = "hygiene";

	const icd10 = tpl.mkbCode || "K02.1";

	return {
		id: `db_tpl_${tpl.id}`,
		title: tpl.name,
		shortBadge: icd10,
		category,
		icd10,
		icd10Label: `${icd10} ${tpl.name}`,
		complaint: `Жалобы по клиническому протоколу: ${tpl.name}`,
		anamnesis: "Заболевание развивалось постепенно. Ранее за стоматологической помощью по данному поводу не обращался.",
		statusLocalis: rawText || `Локальный стоматологический статус: ${tpl.name}`,
		treatmentDescription: rawText || `Выполнено лечение в соответствии с клиническим протоколом ${tpl.name}.`,
		toothState: "Caries",
		defaultTooth: 16,
		service804n: {
			code804n: "A16.07.002.001",
			title: tpl.name,
			basePriceRub: 4500,
			category,
		},
		materialsToDeduct: [],
		recommendations: "Соблюдение гигиены полости рта, щадящий режим на стороне вмешательства 24 часа.",
		warrantyMonths: 12,
		serviceLifeMonths: 24,
	};
}

export const VisitSoapTemplatesModal: React.FC<VisitSoapTemplatesModalProps> = ({
	isOpen,
	onClose,
	onApplyPreset,
	activeTooth = null,
	isLocked = false,
}) => {
	const [searchQuery, setSearchQuery] = React.useState<string>("");
	const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
	const [selectedTooth, setSelectedTooth] = React.useState<number | null>(activeTooth ?? 16);
	const [selectedPresetId, setSelectedPresetId] = React.useState<string>("caries_medium");
	const [applyMode, setApplyMode] = React.useState<"clean_replace" | "smart_append">("clean_replace");
	const [activePreviewTab, setActivePreviewTab] = React.useState<"soap" | "materials" | "receipt">("soap");
	const [dbTemplates, setDbTemplates] = React.useState<DbOutpatientTemplate[]>([]);
	const [isLoadingTemplates, setIsLoadingTemplates] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (activeTooth) {
			setSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	// Загрузка боевой базы 448 протоколов 043/у
	React.useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;
		setIsLoadingTemplates(true);
		fetch("/api/outpatient/templates?limit=500")
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!isCancelled && data?.templates && Array.isArray(data.templates)) {
					setDbTemplates(data.templates);
				}
			})
			.catch(() => {
				// При ошибке остаемся на статических пресетах
			})
			.finally(() => {
				if (!isCancelled) setIsLoadingTemplates(false);
			});
		return () => {
			isCancelled = true;
		};
	}, [isOpen]);

	// Объединенный каталог протоколов (база данных + быстрые пресеты)
	const allPresets = React.useMemo(() => {
		if (dbTemplates.length === 0) return CLINICAL_SOAP_PRESETS;
		const mapped = dbTemplates.map(mapDbTemplateToPreset);
		return [...CLINICAL_SOAP_PRESETS, ...mapped];
	}, [dbTemplates]);

	// Filtered presets list based on search and category
	const filteredPresets = React.useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return allPresets.filter((preset) => {
			if (selectedCategory !== "all" && preset.category !== selectedCategory) {
				return false;
			}
			if (!query) return true;
			return (
				preset.title.toLowerCase().includes(query) ||
				preset.icd10.toLowerCase().includes(query) ||
				preset.icd10Label.toLowerCase().includes(query) ||
				(preset.service804n?.title?.toLowerCase().includes(query) ?? false) ||
				(preset.service804n?.code804n?.toLowerCase().includes(query) ?? false) ||
				preset.treatmentDescription.toLowerCase().includes(query)
			);
		});
	}, [allPresets, searchQuery, selectedCategory]);

	// Active selected preset object
	const activePreset = React.useMemo(() => {
		const found = allPresets.find((p) => p.id === selectedPresetId);
		return found ?? filteredPresets[0] ?? allPresets[0]!;
	}, [selectedPresetId, filteredPresets, allPresets]);

	// Formatted SOAP preview
	const formattedSoap = React.useMemo(() => {
		return formatSoapFromPreset(activePreset, selectedTooth);
	}, [activePreset, selectedTooth]);

	// Materials cost calculation
	const materialsCost = React.useMemo(() => {
		return calculatePresetMaterialsCost(activePreset);
	}, [activePreset]);

	// Receipt text
	const receiptText = React.useMemo(() => {
		return generateMaterialsDeductionReceipt(activePreset, selectedTooth);
	}, [activePreset, selectedTooth]);

	if (!isOpen) return null;

	const handleApply = () => {
		if (isLocked) return;
		const effectiveTooth = activePreset.category !== "hygiene" ? (selectedTooth ?? activePreset.defaultTooth ?? 16) : null;
		onApplyPreset(activePreset, effectiveTooth, applyMode);
		onClose();
	};

	const getCategoryIcon = (cat: ClinicalPresetCategory) => {
		switch (cat) {
			case "therapy":
				return <Stethoscope size={16} className="text-blue-500 shrink-0" />;
			case "surgery":
				return <Bone size={16} className="text-rose-500 shrink-0" />;
			case "orthopedics":
				return <Crown size={16} className="text-purple-500 shrink-0" />;
			case "periodontology":
				return <HeartPulse size={16} className="text-amber-500 shrink-0" />;
			case "hygiene":
			default:
				return <Sparkles size={16} className="text-emerald-500 shrink-0" />;
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
			data-testid="modal-soap-templates-catalog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="soap-templates-modal-title"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] shadow-2xl overflow-hidden">
				{/* ── ШАПКА МОДАЛЬНОГО ОКНА ── */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--paper-soft)] gap-3 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shadow-2xs">
							<BookOpen size={22} />
						</div>
						<div>
							<h3 id="soap-templates-modal-title" className="text-base sm:text-lg font-extrabold flex items-center gap-2 text-[var(--ink)]">
								<span>Клинические протоколы Формы 043/у</span>
								<span className="text-xs px-2 py-0.5 rounded-md font-mono font-black bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
									МКБ-10 • 804н • Склад
								</span>
							</h3>
							<p className="text-xs text-[var(--muted)]">
								1 клик: Полный протокол SOAP, привязка услуги номенклатуры и технологическая карта списания
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer flex items-center justify-center touch-manipulation"
						aria-label="Закрыть каталог протоколов"
						data-testid="btn-close-soap-templates-modal"
					>
						<X size={20} />
					</button>
				</div>

				{/* ── ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА ── */}
				<div className="p-3 sm:p-4 border-b border-[var(--border)] bg-[var(--paper)] space-y-3 shrink-0">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						{/* Поле поиска */}
						<div className="relative flex-1">
							<Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по МКБ-10 (K02.1, K04.0...), названию, услуге 804н или материалу..."
								className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all"
								data-testid="input-search-soap-presets"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] p-1"
								>
									Очистить
								</button>
							)}
						</div>

						{/* Выбор активного зуба */}
						<div className="flex items-center gap-2 shrink-0">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">
								Зуб FDI:
							</span>
							<select
								value={selectedTooth ?? 16}
								onChange={(e) => setSelectedTooth(Number(e.target.value))}
								className="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-mono font-extrabold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] cursor-pointer"
								data-testid="select-soap-preset-tooth"
							>
								{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38, 51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85].map((t) => (
									<option key={t} value={t}>
										Зуб #{t}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Категории */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-nowrap">
						{[
							{ id: "all", label: "Все протоколы", count: CLINICAL_SOAP_PRESETS.length },
							{ id: "therapy", label: "Терапия", count: CLINICAL_SOAP_PRESETS.filter((p) => p.category === "therapy").length },
							{ id: "surgery", label: "Хирургия", count: CLINICAL_SOAP_PRESETS.filter((p) => p.category === "surgery").length },
							{ id: "orthopedics", label: "Ортопедия", count: CLINICAL_SOAP_PRESETS.filter((p) => p.category === "orthopedics").length },
							{ id: "periodontology", label: "Пародонтология", count: CLINICAL_SOAP_PRESETS.filter((p) => p.category === "periodontology").length },
							{ id: "hygiene", label: "Гигиена", count: CLINICAL_SOAP_PRESETS.filter((p) => p.category === "hygiene").length },
						].map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 touch-manipulation ${
									selectedCategory === cat.id
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-2xs"
										: "bg-[var(--paper-soft)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`filter-category-${cat.id}`}
							>
								<span>{cat.label}</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10">
									{cat.count}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* ── ОСНОВНОЙ КОНТЕНТ (СПИСОК СЛЕВА + ДЕТАЛЬНЫЙ ПРЕВЬЮ СПРАВА) ── */}
				<div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
					{/* Левая колонка: Список пресетов */}
					<div className="md:col-span-5 flex flex-col overflow-y-auto p-2 sm:p-3 space-y-1.5 bg-[var(--paper-soft)]">
						{filteredPresets.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-8 text-center text-[var(--muted)] space-y-2">
								<Search size={32} className="opacity-40" />
								<p className="text-sm font-bold">Ничего не найдено</p>
								<p className="text-xs">Попробуйте изменить запрос или категорию</p>
							</div>
						) : (
							filteredPresets.map((preset) => {
								const isSelected = preset.id === activePreset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => setSelectedPresetId(preset.id)}
										className={`min-h-[48px] w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer touch-manipulation ${
											isSelected
												? "bg-[var(--paper)] border-[var(--teal)] shadow-sm ring-1 ring-[var(--teal)]"
												: "bg-[var(--paper)] border-[var(--border)] hover:border-[var(--line)] hover:bg-[var(--paper)]/80"
										}`}
										data-testid={`preset-item-${preset.id}`}
									>
										<div className="flex items-center justify-between gap-1.5 w-full">
											<div className="flex items-center gap-1.5 min-w-0">
												{getCategoryIcon(preset.category)}
												<span className="text-xs sm:text-sm font-extrabold truncate text-[var(--ink)]">
													{preset.title}
												</span>
											</div>
											<span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--border)] text-[var(--teal,var(--brand-primary))] shrink-0">
												{preset.icd10}
											</span>
										</div>

										<div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--muted)]">
											{preset.service804n && (
												<span className="font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
													804н: {preset.service804n.code804n}
												</span>
											)}
											{preset.materialsToDeduct && preset.materialsToDeduct.length > 0 && (
												<span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
													<PackageCheck size={12} />
													<span>{preset.materialsToDeduct.length} мат.</span>
												</span>
											)}
										</div>
									</button>
								);
							})
						)}
					</div>

					{/* Правая колонка: Детальный предпросмотр протокола Form 043/u */}
					<div className="md:col-span-7 flex flex-col overflow-y-auto p-4 sm:p-5 bg-[var(--paper)] space-y-4">
						{/* Заголовок активного протокола */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-2">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									{getCategoryIcon(activePreset.category)}
									<h4 className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
										{activePreset.title}
									</h4>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
										МКБ-10: {activePreset.icd10}
									</span>
									{selectedTooth && activePreset.category !== "hygiene" && (
										<span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
											Зуб #{selectedTooth}
										</span>
									)}
								</div>
							</div>
							<p className="text-xs text-[var(--muted)]">
								{activePreset.icd10Label}
							</p>
						</div>

						{/* Вкладки предпросмотра */}
						<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)]">
							<button
								type="button"
								onClick={() => setActivePreviewTab("soap")}
								className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
									activePreviewTab === "soap"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs font-extrabold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								SOAP Протокол 043/у
							</button>
							<button
								type="button"
								onClick={() => setActivePreviewTab("materials")}
								className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
									activePreviewTab === "materials"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs font-extrabold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								<PackageCheck size={14} />
								<span>Списание со склада</span>
							</button>
							<button
								type="button"
								onClick={() => setActivePreviewTab("receipt")}
								className={`min-h-[44px] flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
									activePreviewTab === "receipt"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs font-extrabold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								<FileText size={14} />
								<span>Ведомость М-11</span>
							</button>
						</div>

						{/* Контент активной вкладки */}
						{activePreviewTab === "soap" && (
							<div className="space-y-3.5 text-xs sm:text-sm">
								{/* S: Жалобы и Анамнез */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-1.5">
									<div className="font-extrabold text-[var(--ink)] flex items-center gap-1.5 text-xs text-[var(--teal,var(--brand-primary))] uppercase tracking-wider">
										<span>S — Жалобы (Complaints):</span>
									</div>
									<p className="text-[var(--ink)] leading-relaxed">
										{formattedSoap.complaint}
									</p>
								</div>

								{/* S: Анамнез */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-1.5">
									<div className="font-extrabold text-[var(--ink)] flex items-center gap-1.5 text-xs text-[var(--teal,var(--brand-primary))] uppercase tracking-wider">
										<span>S — Анамнез заболевания (Anamnesis):</span>
									</div>
									<p className="text-[var(--ink)] leading-relaxed">
										{formattedSoap.anamnesis}
									</p>
								</div>

								{/* O: Осмотр / Status Localis */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-1.5">
									<div className="font-extrabold text-[var(--ink)] flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
										<span>O — Объективный статус / Status Localis:</span>
									</div>
									<p className="text-[var(--ink)] leading-relaxed">
										{formattedSoap.objectiveStatus}
									</p>
								</div>

								{/* A: Диагноз */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-1.5">
									<div className="font-extrabold text-[var(--ink)] flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">
										<span>A — Диагноз по МКБ-10:</span>
									</div>
									<p className="text-[var(--ink)] font-bold">
										{formattedSoap.diagnosis}
									</p>
								</div>

								{/* P: Протокол лечения */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] space-y-1.5">
									<div className="font-extrabold text-[var(--ink)] flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
										<span>P — Протокол лечения и выполненные манипуляции:</span>
									</div>
									<p className="text-[var(--ink)] leading-relaxed whitespace-pre-line">
										{formattedSoap.treatmentPlan}
									</p>
								</div>

								{/* Услуга 804н */}
								{activePreset.service804n && (
									<div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-2 flex-wrap">
										<div className="space-y-0.5">
											<span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
												Услуга Номенклатуры Минздрава № 804н
											</span>
											<p className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
												[{activePreset.service804n.code804n}] {activePreset.service804n.title}
											</p>
										</div>
										<span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-800 dark:text-blue-200">
											{activePreset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								)}
							</div>
						)}

						{activePreviewTab === "materials" && (
							<div className="space-y-3">
								<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<PackageCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
										<div>
											<h5 className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
												Технологическая карта списания (BOM)
											</h5>
											<p className="text-[11px] text-[var(--muted)]">
												Автоматическое резервирование и списание со склада клиники
											</p>
										</div>
									</div>
									<span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
										Себестоимость: ~{materialsCost} ₽
									</span>
								</div>

								<div className="space-y-1.5">
									{(activePreset.materialsToDeduct ?? []).map((m, idx) => (
										<div
											key={idx}
											className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)] flex items-center justify-between gap-2 text-xs sm:text-sm"
										>
											<div className="flex items-center gap-2 min-w-0">
												<span className="text-xs font-mono font-bold text-[var(--muted)]">
													{idx + 1}.
												</span>
												<span className="font-bold truncate text-[var(--ink)]">
													{m.name}
												</span>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span className="font-mono font-extrabold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--border)] text-[var(--teal,var(--brand-primary))]">
													{m.quantity} {m.unit}
												</span>
												{m.unitCostRub && (
													<span className="text-xs font-mono text-[var(--muted)] hidden sm:inline">
														{m.unitCostRub} ₽/{m.unit}
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{activePreviewTab === "receipt" && (
							<div className="space-y-2">
								<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--border)]">
									<pre className="text-xs font-mono whitespace-pre-wrap text-[var(--ink)] leading-relaxed">
										{receiptText}
									</pre>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ── ПОДВАЛ С РЕЖИМОМ ВСТАВКИ И КНОПКАМИ ДЕЙСТВИЯ ── */}
				<div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 flex-wrap shrink-0">
					{/* Переключатель режима */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--muted)] hidden sm:inline">
							Режим вставки:
						</span>
						<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--border)]">
							<button
								type="button"
								onClick={() => setApplyMode("clean_replace")}
								className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
									applyMode === "clean_replace"
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="btn-mode-clean-replace"
							>
								Заменить SOAP (Чистый 043/у)
							</button>
							<button
								type="button"
								onClick={() => setApplyMode("smart_append")}
								className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
									applyMode === "smart_append"
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="btn-mode-smart-append"
							>
								Дополнить дневник
							</button>
						</div>
					</div>

					{/* Кнопки закрытия и применения */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-[var(--border)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer touch-manipulation"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleApply}
							disabled={isLocked}
							className="min-h-[48px] px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-md transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="btn-apply-soap-preset"
						>
							<Zap size={17} />
							<span>Применить протокол в 1 клик</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
