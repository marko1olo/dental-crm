import {
	formatFullSoapFromProtocol,
	type OutpatientProtocolTemplate,
	type OutpatientSpecialty,
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	STOMX_SPECIALTIES,
	searchAll448Templates,
	searchOutpatientProtocols,
	type StomxOutpatientTemplateMetadata,
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
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
	readonly isTemplatesOpen?: boolean;
	readonly onToggleTemplates?: (open: boolean) => void;
}

const ALL_FDI_ADULT_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
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
 * Преобразует шаблон StomX из каталога 448 шаблонов в полноценный клинический протокол Формы 043/у (SOAP)
 */
export function resolveProtocolFromTemplate(
	tpl: StomxOutpatientTemplateMetadata,
): OutpatientProtocolTemplate {
	const exact = STOMX_KEY_CLINICAL_PROTOCOLS.find(
		(p) =>
			p.stomxId === tpl.id ||
			p.id === String(tpl.id) ||
			p.name.toLowerCase() === tpl.name.toLowerCase(),
	);
	if (exact) {
		return exact;
	}

	return {
		id: `stomx_${tpl.id}`,
		stomxId: tpl.id,
		specialty: tpl.specialty,
		subcategory: tpl.categoryName,
		name: tpl.name,
		mkbCode: tpl.mkbCode,
		mkbName: tpl.name,
		complaint: `Жалобы по протоколу ${tpl.name}: дискомфорт, боли или дефект твердых тканей в области __ зуба.`,
		anamnesis: `Соматически здоров. Аллергологический анамнез не отягощен. Ранее по поводу ${tpl.name} в __ зубе лечение не проводилось.`,
		objectiveStatus: `Объективный осмотр: в __ зубе определяется ${tpl.name}. Перкуссия безболезненна, зондирование по клиническому протоколу, слизистая оболочка десны интактна.`,
		diagnosis: `${tpl.mkbCode} ${tpl.name}`,
		treatmentProtocol: `Выполнено лечение по клиническим рекомендациям СтАР (${tpl.name} в __ зубе): антисептическая обработка, препарирование / обработка, пломбирование / фиксация по протоколу.`,
		recommendations:
			"Соблюдение гигиены полости рта, щадящая диета на стороне вмешательства 24 часа. Плановый осмотр через 6 месяцев.",
		defaultTooth: 16,
		tags: [tpl.categoryName, tpl.mkbCode, tpl.specialty],
	};
}

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
	isTemplatesOpen: isTemplatesOpenProp,
	onToggleTemplates,
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
	const [localTemplatesOpen, setLocalTemplatesOpen] = useState<boolean>(false);
	const isTemplatesOpen =
		isTemplatesOpenProp !== undefined ? isTemplatesOpenProp : localTemplatesOpen;
	const setIsTemplatesOpen = useCallback(
		(val: boolean | ((prev: boolean) => boolean)) => {
			const next = typeof val === "function" ? val(isTemplatesOpen) : val;
			setLocalTemplatesOpen(next);
			onToggleTemplates?.(next);
		},
		[isTemplatesOpen, onToggleTemplates],
	);

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
	const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);

	// Синхронизация при внешних изменениях activeTooth
	useEffect(() => {
		if (activeTooth !== undefined && activeTooth !== null) {
			setSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	// Синхронизация с внешними изменениями initialValues
	useEffect(() => {
		if (initialValues) {
			setValues((prev) => {
				const isDifferent =
					(initialValues.complaint !== undefined &&
						initialValues.complaint !== prev.complaint) ||
					(initialValues.anamnesis !== undefined &&
						initialValues.anamnesis !== prev.anamnesis) ||
					(initialValues.objectiveStatus !== undefined &&
						initialValues.objectiveStatus !== prev.objectiveStatus) ||
					(initialValues.diagnosis !== undefined &&
						initialValues.diagnosis !== prev.diagnosis) ||
					(initialValues.treatmentPlan !== undefined &&
						initialValues.treatmentPlan !== prev.treatmentPlan) ||
					(initialValues.recommendations !== undefined &&
						initialValues.recommendations !== prev.recommendations) ||
					(initialValues.icd10 !== undefined &&
						initialValues.icd10 !== prev.icd10);

				if (!isDifferent) return prev;

				const next: VisitSoapNoteValues = { ...prev };
				if (initialValues.complaint !== undefined) next.complaint = initialValues.complaint;
				if (initialValues.anamnesis !== undefined) next.anamnesis = initialValues.anamnesis;
				if (initialValues.objectiveStatus !== undefined) next.objectiveStatus = initialValues.objectiveStatus;
				if (initialValues.diagnosis !== undefined) next.diagnosis = initialValues.diagnosis;
				if (initialValues.treatmentPlan !== undefined) next.treatmentPlan = initialValues.treatmentPlan;
				if (initialValues.recommendations !== undefined) next.recommendations = initialValues.recommendations;
				if (initialValues.icd10 !== undefined) next.icd10 = initialValues.icd10;
				return next;
			});
		}
	}, [initialValues]);

	// Дебаунс автосохранения (только при активном редактировании)
	useEffect(() => {
		if (saveStatus !== "saving") return;
		const timer = setTimeout(() => {
			onChange?.(values);
			onSave?.(values);
			setSaveStatus("saved");
		}, 400);

		return () => clearTimeout(timer);
	}, [values, saveStatus, onChange, onSave]);

	// Мандат 8e: Автономия врача и версионный аудит («Исправленному верить»)
	const handleEnableCorrection = useCallback(() => {
		setIsCorrectionMode(true);
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const stamp = `[Исправленному верить: ${dateStr}]`;
		setValues((prev) => {
			if (
				prev.treatmentPlan?.includes("Исправленному верить") ||
				prev.objectiveStatus?.includes("Исправленному верить")
			) {
				return prev;
			}
			const next: VisitSoapNoteValues = {
				...prev,
				treatmentPlan: prev.treatmentPlan
					? `${prev.treatmentPlan}\n\n${stamp}`
					: stamp,
			};
			setSaveStatus("saved");
			onSave?.(next);
			onChange?.(next);
			return next;
		});
	}, [onSave, onChange]);

	const handleFieldChange = useCallback(
		(field: keyof VisitSoapNoteValues, val: string) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
				const dateStr = new Date().toLocaleDateString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
				const stamp = `[Исправленному верить: ${dateStr}]`;
				setSaveStatus("saving");
				setValues((prev) => {
					const next = { ...prev, [field]: val };
					if (!next.treatmentPlan?.includes("Исправленному верить")) {
						next.treatmentPlan = next.treatmentPlan
							? `${next.treatmentPlan}\n\n${stamp}`
							: stamp;
					}
					return next;
				});
				return;
			}
			setSaveStatus("saving");
			setValues((prev) => ({ ...prev, [field]: val }));
		},
		[isLocked, isCorrectionMode],
	);

	// Фильтрация протоколов StomX среди всех 448 шаблонов
	const filteredProtocols = useMemo(() => {
		const specFilter = activeSpecialty === "all" ? undefined : activeSpecialty;
		const matchingTemplates = searchAll448Templates(searchQuery, specFilter);
		return matchingTemplates.map(resolveProtocolFromTemplate);
	}, [searchQuery, activeSpecialty]);

	// Применение протокола StomX
	const handleApplyProtocol = useCallback(
		(
			protocol: OutpatientProtocolTemplate,
			mode: "replace" | "append" = "replace",
		) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
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

			const formattedDiagnosis = `${protocol.mkbCode} ${popDiagnosis}`.trim();
			const dateStr = new Date().toLocaleDateString("ru-RU", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";

			if (mode === "replace") {
				// Mandate 8e: preserve custom somatic/allergy notes if already entered by doctor
				const preservedAnamnesis =
					values.anamnesis &&
					!values.anamnesis.includes("Соматически здоров") &&
					!values.anamnesis.includes(popAnamnesis)
						? `${values.anamnesis}; ${popAnamnesis}`
						: popAnamnesis;

				const nextValues: VisitSoapNoteValues = {
					complaint: popComplaint,
					anamnesis: preservedAnamnesis,
					objectiveStatus: popObjective,
					diagnosis: formattedDiagnosis,
					treatmentPlan: `${popTreatment}${auditStamp}`,
					recommendations: popRecs,
					icd10: protocol.mkbCode,
				};
				setValues(nextValues);
				setSaveStatus("saved");
				onSave?.(nextValues);
				onChange?.(nextValues);

				const formattedFull = formatFullSoapFromProtocol(protocol, params);
				onApplyFullDiary?.(formattedFull);
			} else {
				setValues((prev) => {
					const appendText = (current?: string, add?: string, sep = "; ") => {
						if (!current || !current.trim()) return add || "";
						if (!add || !add.trim()) return current;
						return `${current}${sep}${add}`;
					};
					const next: VisitSoapNoteValues = {
						complaint: appendText(prev.complaint, popComplaint),
						anamnesis: appendText(prev.anamnesis, popAnamnesis),
						objectiveStatus: appendText(prev.objectiveStatus, popObjective, "\n"),
						diagnosis: prev.diagnosis
							? `${prev.diagnosis}, ${formattedDiagnosis}`
							: formattedDiagnosis,
						treatmentPlan: appendText(prev.treatmentPlan, `${popTreatment}${auditStamp}`, "\n\n"),
						recommendations: appendText(prev.recommendations, popRecs, "\n"),
						icd10: prev.icd10 || protocol.mkbCode,
					};
					setSaveStatus("saved");
					onSave?.(next);
					onChange?.(next);
					return next;
				});
			}

			setIsTemplatesOpen(false);
			setPreviewProtocol(null);
		},
		[selectedTooth, selectedSurfaces, values.anamnesis, isLocked, isCorrectionMode, onSave, onChange, onApplyFullDiary, setIsTemplatesOpen],
	);

	// 1-клик физиологическая норма (Мандат 8e)
	const handleApplyNorm = useCallback(() => {
		const targetTooth = selectedTooth ?? 16;
		if (isLocked && !isCorrectionMode) {
			setIsCorrectionMode(true);
		}
		const dateStr = new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";
		const normValues: VisitSoapNoteValues = {
			complaint:
				"Жалоб на момент осмотра не предъявляет. Обратился с целью планового профилактического осмотра / санации.",
			anamnesis:
				"Соматически здоров. Аллергологический анамнез не отягощен. Сопутствующие системные заболевания отрицает.",
			objectiveStatus: `Прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Зуб ${targetTooth}: интактен, зондирование и перкуссия безболезненны, реакция на термопробу адекватная, подвижность отсутствует. Зубные отложения умеренные.`,
			diagnosis: "Z01.2 Стоматологическое обследование (Здоров)",
			treatmentPlan:
				`Проведена профессиональная контролируемая гигиена полости рта, обучение технике чистки зубов, подбор индивидуальных средств гигиены.${auditStamp}`,
			recommendations:
				"Чистка зубов 2 раза в день выметающими движениями. Использование флосса и ирригатора. Плановый осмотр через 6 месяцев.",
			icd10: "Z01.2",
		};
		setValues(normValues);
		setSaveStatus("saved");
		onSave?.(normValues);
		onChange?.(normValues);
	}, [selectedTooth, isLocked, isCorrectionMode, onSave, onChange]);

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
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/50 border-b border-[var(--line,#e2e8f0)] flex-wrap min-h-[36px]">
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
							className="h-7 px-2 text-xs font-bold bg-white dark:bg-slate-800 border border-[var(--line,#cbd5e1)] rounded-lg text-teal-700 dark:text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
						>
							<option value="">Без зуба</option>
							{ALL_FDI_ADULT_TEETH.map((t) => (
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
						aria-label="Поверхности зуба"
						className="h-7 w-32 px-2 text-xs bg-white dark:bg-slate-800 border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] placeholder:text-slate-400 focus:outline-none"
					/>
				</div>

				{/* Правый блок кнопок прямого действия */}
				<div className="flex items-center gap-1.5">
					{/* Индикатор закрытого визита и кнопка ревизии («Исправленному верить», Мандат 8e) */}
					{isLocked && (
						!isCorrectionMode ? (
							<button
								type="button"
								onClick={handleEnableCorrection}
								data-testid="btn-soap-enable-correction"
								className="h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
								title="Приём закрыт. Нажмите для внесения правок с версионным аудитом («Исправленному верить»)"
							>
								<Edit3 className="w-3.5 h-3.5" />
								<span>Внести исправление («Исправленному верить»)</span>
							</button>
						) : (
							<div
								data-testid="badge-soap-correction-active"
								className="h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
								title="Режим исправления закрытого дневника («Исправленному верить»)"
							>
								<Check className="w-3.5 h-3.5 text-emerald-600" />
								<span className="hidden sm:inline">Исправленному верить</span>
							</div>
						)
					)}

					{/* Кнопка "Шаблоны 043/у (448)" (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
						data-testid="btn-open-stomt-templates"
						className="h-8 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
						title="Открыть каталог 448 клинических шаблонов 043/у из StomX"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>Шаблоны 043/у (448)</span>
					</button>

					{/* Физиологическая норма в 1 клик (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={handleApplyNorm}
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
					<span className="text-[11px] font-medium text-slate-500 min-w-[70px] text-right inline-flex items-center justify-end gap-1">
						{saveStatus === "saving" ? (
							"Запись..."
						) : saveStatus === "saved" ? (
							<>
								<Check className="w-3 h-3 text-emerald-600 inline shrink-0" aria-hidden="true" />
								<span>Сохранено</span>
							</>
						) : (
							""
						)}
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
							Все протоколы ({STOMX_ALL_448_TEMPLATES_INDEX.length})
						</button>
						{STOMX_SPECIALTIES.map((spec) => {
							const count = STOMX_ALL_448_TEMPLATES_INDEX.filter(
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
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[var(--paper)] text-[var(--ink)] rounded-2xl max-w-xl w-full p-5 border border-[var(--line)] shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3">
							<div className="flex items-center gap-2 min-w-0">
								<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shrink-0">
									{previewProtocol.mkbCode}
								</span>
								<span className="text-sm font-bold text-[var(--ink)] truncate">
									{previewProtocol.name}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setPreviewProtocol(null)}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
								aria-label="Закрыть предпросмотр протокола"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="overflow-y-auto space-y-2.5 text-xs text-[var(--ink)] pr-1 flex-1">
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
						<div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={() => setPreviewProtocol(null)}
								className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--line)] transition-colors cursor-pointer"
							>
								Закрыть
							</button>
							<button
								type="button"
								onClick={() => handleApplyProtocol(previewProtocol, "replace")}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
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
