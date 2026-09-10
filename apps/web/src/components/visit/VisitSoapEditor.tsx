import {
	formatFullSoapFromProtocol,
	type OutpatientProtocolTemplate,
	type OutpatientSpecialty,
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	STOMX_SPECIALTIES,
	searchOutpatientProtocols,
} from "@dental/shared";
import {
	Check,
	Copy,
	Crown,
	Edit3,
	Eye,
	FileText,
	Flame,
	HeartPulse,
	Scissors,
	Search,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface VisitSoapNoteValues {
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	diagnosis?: string;
	treatmentPlan?: string;
	recommendations?: string;
	icd10?: string;
}

export interface VisitSoapEditorProps {
	readonly initialValues?: VisitSoapNoteValues;
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
	readonly onSave?: (values: VisitSoapNoteValues) => void;
	readonly onChange?: (values: VisitSoapNoteValues) => void;
	readonly onApplyFullDiary?: (fullDiaryText: string) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
	readonly autoFocusField?: "complaint" | "treatmentPlan" | null;
}

const COMMON_FDI_TEETH = [
	16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48,
];

const SPECIALTY_ICONS: Record<OutpatientSpecialty, React.ReactNode> = {
	therapy: <Stethoscope className="w-3.5 h-3.5" />,
	orthopedics: <Crown className="w-3.5 h-3.5" />,
	surgery: <Scissors className="w-3.5 h-3.5" />,
	implantology: <Flame className="w-3.5 h-3.5" />,
	periodontics: <HeartPulse className="w-3.5 h-3.5" />,
};

const SPECIALTY_BADGE_COLORS: Record<OutpatientSpecialty, string> = {
	therapy:
		"bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
	orthopedics:
		"bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
	surgery:
		"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
	implantology:
		"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
	periodontics:
		"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

/**
 * Редактор амбулаторной карты 043/у (SOAP) с быстрым выбором протоколов StomX
 */
export const VisitSoapEditor: React.FC<VisitSoapEditorProps> = ({
	initialValues,
	activeTooth = null,
	onSelectActiveTooth,
	onSave,
	onChange,
	onApplyFullDiary,
	isLocked = false,
	className = "",
	autoFocusField: _autoFocusField = null,
}) => {
	// ── Локальное состояние полей SOAP ──
	const [values, setValues] = useState<VisitSoapNoteValues>({
		complaint: initialValues?.complaint || "",
		anamnesis: initialValues?.anamnesis || "",
		objectiveStatus: initialValues?.objectiveStatus || "",
		diagnosis: initialValues?.diagnosis || "",
		treatmentPlan: initialValues?.treatmentPlan || "",
		recommendations: initialValues?.recommendations || "",
		icd10: initialValues?.icd10 || "",
	});

	const [selectedTooth, setSelectedTooth] = useState<number | null>(
		activeTooth ?? 16,
	);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string>("");
	const [activeViewMode, setActiveViewMode] = useState<"fields" | "full_text">(
		"fields",
	);
	const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
	const [activeSpecialty, setActiveSpecialty] = useState<
		OutpatientSpecialty | "all"
	>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [copied, setCopied] = useState<boolean>(false);
	const [previewProtocol, setPreviewProtocol] =
		useState<OutpatientProtocolTemplate | null>(null);

	// Синхронизация при внешних изменениях activeTooth
	useEffect(() => {
		if (activeTooth) {
			setSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	// Дебаунс автосохранения
	useEffect(() => {
		const timer = setTimeout(() => {
			onChange?.(values);
			onSave?.(values);
			setSaveStatus("saved");
		}, 400);

		return () => clearTimeout(timer);
	}, [values, onChange, onSave]);

	const handleFieldChange = useCallback(
		(field: keyof VisitSoapNoteValues, val: string) => {
			setSaveStatus("saving");
			setValues((prev) => ({ ...prev, [field]: val }));
		},
		[],
	);

	// Фильтрация протоколов StomX
	const filteredProtocols = useMemo(() => {
		const specFilter = activeSpecialty === "all" ? undefined : activeSpecialty;
		return searchOutpatientProtocols(searchQuery, specFilter);
	}, [searchQuery, activeSpecialty]);

	// Применение протокола StomX
	const handleApplyProtocol = useCallback(
		(
			protocol: OutpatientProtocolTemplate,
			mode: "replace" | "append" = "replace",
		) => {
			const targetTooth = selectedTooth ?? protocol.defaultTooth ?? 16;
			const params: PopulateTemplateParams = {
				toothNumber: targetTooth,
				surfaces: selectedSurfaces || undefined,
			};

			const popComplaint = populateOutpatientTemplateText(
				protocol.complaint,
				params,
			);
			const popAnamnesis = populateOutpatientTemplateText(
				protocol.anamnesis,
				params,
			);
			const popObjective = populateOutpatientTemplateText(
				protocol.objectiveStatus,
				params,
			);
			const popDiagnosis = populateOutpatientTemplateText(
				protocol.diagnosis,
				params,
			);
			const popTreatment = populateOutpatientTemplateText(
				protocol.treatmentProtocol,
				params,
			);
			const popRecs = populateOutpatientTemplateText(
				protocol.recommendations,
				params,
			);

			if (mode === "replace") {
				const nextValues: VisitSoapNoteValues = {
					complaint: popComplaint,
					anamnesis: popAnamnesis,
					objectiveStatus: popObjective,
					diagnosis: popDiagnosis,
					treatmentPlan: popTreatment,
					recommendations: popRecs,
					icd10: protocol.mkbCode,
				};
				setValues(nextValues);
				onSave?.(nextValues);
				onChange?.(nextValues);

				const formattedFull = formatFullSoapFromProtocol(protocol, params);
				onApplyFullDiary?.(formattedFull);
			} else {
				setValues((prev) => {
					const appendText = (current?: string, add?: string) => {
						if (!current) return add || "";
						if (!add) return current;
						return `${current}; ${add}`;
					};
					const next: VisitSoapNoteValues = {
						complaint: appendText(prev.complaint, popComplaint),
						anamnesis: appendText(prev.anamnesis, popAnamnesis),
						objectiveStatus: appendText(prev.objectiveStatus, popObjective),
						diagnosis: prev.diagnosis
							? `${prev.diagnosis}; ${popDiagnosis}`
							: popDiagnosis,
						treatmentPlan: appendText(prev.treatmentPlan, popTreatment),
						recommendations: appendText(prev.recommendations, popRecs),
						icd10: prev.icd10 || protocol.mkbCode,
					};
					onSave?.(next);
					onChange?.(next);
					return next;
				});
			}

			setIsTemplatesOpen(false);
			setPreviewProtocol(null);
		},
		[selectedTooth, selectedSurfaces, onSave, onChange, onApplyFullDiary],
	);

	// 1-клик физиологическая норма (Мандат 8e)
	const handleApplyNorm = useCallback(() => {
		const targetTooth = selectedTooth ?? 16;
		const normValues: VisitSoapNoteValues = {
			complaint:
				"Жалоб на момент осмотра не предъявляет. Обратился с целью планового профилактического осмотра / санации.",
			anamnesis:
				"Соматически здоров. Аллергологический анамнез не отягощен. Сопутствующие системные заболевания отрицает.",
			objectiveStatus: `Прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Зуб ${targetTooth}: интактен, зондирование и перкуссия безболезненны, реакция на термопробу адекватная, подвижность отсутствует. Зубные отложения умеренные.`,
			diagnosis: "Z01.2 Стоматологическое обследование (Здоров).",
			treatmentPlan:
				"Проведена профессиональная контролируемая гигиена полости рта, обучение технике чистки зубов, подбор индивидуальных средств гигиены.",
			recommendations:
				"Чистка зубов 2 раза в день выметающими движениями. Использование флосса и ирригатора. Плановый осмотр через 6 месяцев.",
			icd10: "Z01.2",
		};
		setValues(normValues);
		onSave?.(normValues);
		onChange?.(normValues);
	}, [selectedTooth, onSave, onChange]);

	// Копирование целостной записи 043/у в буфер
	const handleCopyFullText = useCallback(() => {
		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА 043/У (ЗУБ ${selectedTooth ?? "Общий"}) ===`,
			`[Жалобы]: ${values.complaint || "Не указаны"}`,
			`[Анамнез]: ${values.anamnesis || "Соматически здоров"}`,
			`[Объективный статус]: ${values.objectiveStatus || "Без патологии"}`,
			`[Диагноз]: ${values.icd10 ? `[${values.icd10}] ` : ""}${values.diagnosis || "Не установлен"}`,
			`[Протокол лечения]: ${values.treatmentPlan || "Санация"}`,
			`[Рекомендации]: ${values.recommendations || "Стандартная гигиена"}`,
		].join("\n\n");

		navigator.clipboard.writeText(fullText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [values, selectedTooth]);

	return (
		<div
			className={`flex flex-col bg-[var(--paper,white)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden shadow-xs ${className}`}
		>
			{/* ── ТУЛБАР 1 СТРОКА (ХИК / HIG: 32-36px кнопки) ── */}
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/50 border-b border-[var(--line,#e2e8f0)] flex-wrap">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
						<FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Форма 043/у • SOAP</span>
					</div>

					{/* Селектор целевого зуба */}
					<div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--line,#e2e8f0)]">
						<label
							htmlFor="soap-select-tooth"
							className="text-xs font-semibold text-[var(--muted,#64748b)]"
						>
							Зуб:
						</label>
						<select
							id="soap-select-tooth"
							value={selectedTooth ?? ""}
							onChange={(e) => {
								const t = e.target.value ? Number(e.target.value) : null;
								setSelectedTooth(t);
								if (t) onSelectActiveTooth?.(t);
							}}
							disabled={isLocked}
							className="h-7 px-2 text-xs font-bold bg-white dark:bg-slate-800 border border-[var(--line,#cbd5e1)] rounded-lg text-teal-700 dark:text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
						>
							<option value="">Без зуба</option>
							{COMMON_FDI_TEETH.map((t) => (
								<option key={t} value={t}>
									{t} зуб
								</option>
							))}
						</select>
					</div>

					{/* Поверхности */}
					<input
						type="text"
						value={selectedSurfaces}
						onChange={(e) => setSelectedSurfaces(e.target.value)}
						placeholder="Поверхности (MOD, вест...)"
						disabled={isLocked}
						aria-label="Поверхности зуба"
						className="h-7 w-32 px-2 text-xs bg-white dark:bg-slate-800 border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] placeholder:text-slate-400 focus:outline-none"
					/>
				</div>

				{/* Правый блок кнопок прямого действия */}
				<div className="flex items-center gap-1.5">
					{/* Кнопка "Шаблоны 043/у StomX" */}
					<button
						type="button"
						onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
						disabled={isLocked}
						data-testid="btn-open-stomt-templates"
						className="h-8 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
						title="Открыть каталог 448 клинических шаблонов 043/у из StomX"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>Шаблоны 043/у StomX</span>
					</button>

					{/* Физиологическая норма в 1 клик (Мандат 8e) */}
					<button
						type="button"
						onClick={handleApplyNorm}
						disabled={isLocked}
						data-testid="btn-soap-physio-norm"
						className="h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors"
						title="Заполнить физиологической нормой (здоров / жалоб нет)"
					>
						<Check className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Норма</span>
					</button>

					{/* Переключение режима отображения */}
					<div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
						<button
							type="button"
							onClick={() => setActiveViewMode("fields")}
							className={`h-7 px-2 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${activeViewMode === "fields" ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs" : "text-slate-600 dark:text-slate-400"}`}
						>
							<Edit3 className="w-3 h-3" />
							<span>Поля</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveViewMode("full_text")}
							className={`h-7 px-2 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${activeViewMode === "full_text" ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs" : "text-slate-600 dark:text-slate-400"}`}
						>
							<Eye className="w-3 h-3" />
							<span>Печать</span>
						</button>
					</div>

					{/* Скопировать в буфер */}
					<button
						type="button"
						onClick={handleCopyFullText}
						className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						title="Скопировать медицинскую запись в буфер обмена"
					>
						{copied ? (
							<Check className="w-4 h-4 text-emerald-600" />
						) : (
							<Copy className="w-4 h-4" />
						)}
					</button>

					{/* Индикатор сохранения */}
					<span className="text-[11px] font-medium text-slate-500 min-w-[70px] text-right">
						{saveStatus === "saving"
							? "Запись..."
							: saveStatus === "saved"
								? "✓ Сохранено"
								: ""}
					</span>
				</div>
			</div>

			{/* ── ВЫПАДАЮЩАЯ ПАНЕЛЬ ШАБЛОНОВ STOMX ── */}
			{isTemplatesOpen && (
				<div className="bg-slate-50 dark:bg-slate-900 border-b border-[var(--line,#e2e8f0)] p-3 transition-all">
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
						<div className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-teal-600" />
							<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
								Клинические протоколы StomX (448 шаблонов 043/у)
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsTemplatesOpen(false)}
							className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Фильтры специальностей */}
					<div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
						<button
							type="button"
							onClick={() => setActiveSpecialty("all")}
							className={`h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 ${activeSpecialty === "all" ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}
						>
							Все протоколы ({STOMX_KEY_CLINICAL_PROTOCOLS.length})
						</button>
						{STOMX_SPECIALTIES.map((spec) => {
							const count = STOMX_KEY_CLINICAL_PROTOCOLS.filter(
								(p) => p.specialty === spec.id,
							).length;
							const isActive = activeSpecialty === spec.id;
							return (
								<button
									key={spec.id}
									type="button"
									onClick={() => setActiveSpecialty(spec.id)}
									className={`h-7 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${isActive ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}
								>
									{SPECIALTY_ICONS[spec.id]}
									<span>{spec.shortLabel}</span>
									<span className="text-[10px] opacity-75">({count})</span>
								</button>
							);
						})}
					</div>

					{/* Поисковая строка */}
					<div className="relative my-2">
						<Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по диагнозу, протоколу (кариес, пульпит, виниры, имплантация, кюретаж)..."
							className="w-full h-8 pl-8 pr-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[var(--ink)] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
					</div>

					{/* Сетка шаблонов */}
					<div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pr-1">
						{filteredProtocols.map((protocol) => (
							<div
								key={protocol.id}
								className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col justify-between hover:border-teal-500 transition-colors shadow-2xs"
							>
								<div>
									<div className="flex items-center justify-between gap-1 mb-1">
										<span
											className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SPECIALTY_BADGE_COLORS[protocol.specialty]}`}
										>
											{protocol.mkbCode}
										</span>
										<span className="text-[10px] text-slate-500">
											{protocol.subcategory}
										</span>
									</div>
									<div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
										{protocol.name}
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
										{protocol.complaint}
									</div>
								</div>
								<div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
									<button
										type="button"
										onClick={() => handleApplyProtocol(protocol, "replace")}
										className="flex-1 h-6 text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors"
										title="Заменить текущий дневник этим протоколом в 1 клик"
									>
										Заполнить (1 клик)
									</button>
									<button
										type="button"
										onClick={() => setPreviewProtocol(protocol)}
										className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded"
										title="Предпросмотр протокола"
									>
										<Eye className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => handleApplyProtocol(protocol, "append")}
										className="h-6 px-2 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
										title="Дописать протокол к текущему тексту"
									>
										+ Добавить
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Модальное окно предпросмотра протокола */}
			{previewProtocol && (
				<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-4 border border-slate-200 dark:border-slate-700 shadow-xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between border-b pb-2 mb-3">
							<div>
								<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 mr-2">
									{previewProtocol.mkbCode}
								</span>
								<span className="text-sm font-bold text-slate-900 dark:text-slate-100">
									{previewProtocol.name}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setPreviewProtocol(null)}
								className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="overflow-y-auto space-y-2 text-xs text-slate-700 dark:text-slate-300 pr-1 flex-1">
							<div>
								<strong>Жалобы:</strong> {previewProtocol.complaint}
							</div>
							<div>
								<strong>Анамнез:</strong> {previewProtocol.anamnesis}
							</div>
							<div>
								<strong>Объективный статус:</strong>{" "}
								{previewProtocol.objectiveStatus}
							</div>
							<div>
								<strong>Диагноз:</strong> {previewProtocol.diagnosis}
							</div>
							<div>
								<strong>Протокол лечения:</strong>{" "}
								{previewProtocol.treatmentProtocol}
							</div>
							<div>
								<strong>Рекомендации:</strong> {previewProtocol.recommendations}
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4 pt-2 border-t">
							<button
								type="button"
								onClick={() => setPreviewProtocol(null)}
								className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
							>
								Закрыть
							</button>
							<button
								type="button"
								onClick={() => handleApplyProtocol(previewProtocol, "replace")}
								className="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
							>
								Вставить в дневник (1 клик)
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── ТЕЛО РЕДАКТОРА: ПОЛЯ SOAP ── */}
			{activeViewMode === "fields" ? (
				<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* S1: Жалобы (Subjective) */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-complaints"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								Жалобы (Subjective / Complaints)
							</label>
							<span className="text-[10px] text-slate-400">Форма 043/у</span>
						</div>
						<textarea
							id="soap-complaints"
							rows={3}
							value={values.complaint || ""}
							onChange={(e) => handleFieldChange("complaint", e.target.value)}
							disabled={isLocked}
							placeholder="Боль при приеме пищи, ночные боли, выпадение пломбы..."
							className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
						/>
					</div>

					{/* S2: Анамнез заболевания и жизни */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-anamnesis"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								Анамнез заболевания и жизни (Anamnesis)
							</label>
							<span className="text-[10px] text-slate-400">Аллергоанамнез</span>
						</div>
						<textarea
							id="soap-anamnesis"
							rows={3}
							value={values.anamnesis || ""}
							onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
							disabled={isLocked}
							placeholder="Зуб ранее лечен, боли возникли 2 дня назад. Соматически здоров..."
							className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
						/>
					</div>

					{/* O: Объективный статус / Status Localis */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-objective"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								Объективное исследование (Objective / Status Localis)
							</label>
							<span className="text-[10px] text-slate-400">
								Зондирование, перкуссия, ЭОД, КЛКТ
							</span>
						</div>
						<textarea
							id="soap-objective"
							rows={3}
							value={values.objectiveStatus || ""}
							onChange={(e) =>
								handleFieldChange("objectiveStatus", e.target.value)
							}
							disabled={isLocked}
							placeholder="Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно..."
							className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
						/>
					</div>

					{/* A: Клинический диагноз (Assessment) */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-diagnosis"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								Клинический диагноз по МКБ-10 (Assessment)
							</label>
							<span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
								{values.icd10 || "МКБ-10"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<input
								id="soap-icd10"
								type="text"
								value={values.icd10 || ""}
								onChange={(e) => handleFieldChange("icd10", e.target.value)}
								placeholder="K02.1"
								aria-label="Код МКБ-10"
								className="w-24 h-8 px-2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:outline-none"
							/>
							<input
								id="soap-diagnosis"
								type="text"
								value={values.diagnosis || ""}
								onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
								disabled={isLocked}
								placeholder="Клинический диагноз: Кариес дентина зуба 16..."
								className="flex-1 h-8 px-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
							/>
						</div>
					</div>

					{/* P1: Протокол лечения (Plan / Treatment) */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-treatment"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								Протокол лечения и манипуляции (Plan / Treatment Protocol)
							</label>
							<span className="text-[10px] text-slate-400">
								Анестезия, препарирование, пломба/коронка/удаление
							</span>
						</div>
						<textarea
							id="soap-treatment"
							rows={4}
							value={values.treatmentPlan || ""}
							onChange={(e) =>
								handleFieldChange("treatmentPlan", e.target.value)
							}
							disabled={isLocked}
							placeholder="Анестезия sol. Articaini 1:200000 1.8 мл. Препарирование кариозной полости, коффердам..."
							className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y font-mono text-[11px]"
						/>
					</div>

					{/* P2: Рекомендации пациенту */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<label
							htmlFor="soap-recommendations"
							className="text-xs font-bold text-slate-700 dark:text-slate-300"
						>
							Назначения и рекомендации пациенту (Recommendations)
						</label>
						<textarea
							id="soap-recommendations"
							rows={2}
							value={values.recommendations || ""}
							onChange={(e) =>
								handleFieldChange("recommendations", e.target.value)
							}
							disabled={isLocked}
							placeholder="Щадящая диета 2 часа, гигиена полости рта, НПВП при боли..."
							className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none resize-y"
						/>
					</div>
				</div>
			) : (
				/* ── РЕЖИМ ПЕЧАТНОГО ПРЕДПРОСМОТРА 043/У ── */
				<div className="p-4 bg-white dark:bg-slate-950 font-serif text-slate-900 dark:text-slate-100 text-xs leading-relaxed space-y-3">
					<div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 text-center">
						<div className="font-sans font-black text-sm uppercase tracking-wide">
							МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (Форма № 043/у)
						</div>
						<div className="font-sans text-[10px] text-slate-500">
							Дневник амбулаторного приема • Зуб:{" "}
							{selectedTooth ?? "Общий статус"}
						</div>
					</div>

					<div>
						<span className="font-bold">Жалобы: </span>
						{values.complaint || "Не предъявляет."}
					</div>
					<div>
						<span className="font-bold">Анамнез заболевания и жизни: </span>
						{values.anamnesis ||
							"Соматически здоров. Аллергоанамнез спокойный."}
					</div>
					<div>
						<span className="font-bold">
							Данные объективного исследования:{" "}
						</span>
						{values.objectiveStatus || "Патологических изменений не выявлено."}
					</div>
					<div>
						<span className="font-bold">Диагноз: </span>
						{values.icd10 ? `[${values.icd10}] ` : ""}
						{values.diagnosis || "Z01.2 Стоматологическое обследование."}
					</div>
					<div>
						<span className="font-bold">Протокол проведенного лечения: </span>
						{values.treatmentPlan || "Консультация, осмотр."}
					</div>
					<div>
						<span className="font-bold">Рекомендации: </span>
						{values.recommendations || "Стандартный гигиенический уход."}
					</div>
				</div>
			)}
		</div>
	);
};
