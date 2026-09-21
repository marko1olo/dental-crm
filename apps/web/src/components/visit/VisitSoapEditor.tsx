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
	MoreHorizontal,
	Printer,
	Scissors,
	Search,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import { getOptimizedTiming } from "../../utils/lowSpecHddOptimizer";

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

const resolvedProtocolsCache = new Map<number, OutpatientProtocolTemplate>();

/**
 * Преобразует шаблон StomX из каталога 448 шаблонов в полноценный клинический протокол Формы 043/у (SOAP).
 * Результат кэшируется в RAM для 0 ms разрешения при поиске на слабых CPU/HDD.
 */
export function resolveProtocolFromTemplate(
	tpl: StomxOutpatientTemplateMetadata,
): OutpatientProtocolTemplate {
	const cached = resolvedProtocolsCache.get(tpl.id);
	if (cached) {
		return cached;
	}

	const exact = STOMX_KEY_CLINICAL_PROTOCOLS.find(
		(p) =>
			p.stomxId === tpl.id ||
			p.id === String(tpl.id) ||
			p.name.toLowerCase() === tpl.name.toLowerCase(),
	);
	const resolved: OutpatientProtocolTemplate = exact || {
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

	resolvedProtocolsCache.set(tpl.id, resolved);
	return resolved;
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
	const [templatesLimit, setTemplatesLimit] = useState<number>(30);

	// Low-Spec memory guard: сброс лимита видимых шаблонов при смене фильтра/поиска
	useEffect(() => {
		setTemplatesLimit(30);
	}, [searchQuery, activeSpecialty]);

	const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);
	const [isSoapMoreOpen, setIsSoapMoreOpen] = useState<boolean>(false);
	const soapMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isSoapMoreOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (soapMoreRef.current && !soapMoreRef.current.contains(e.target as Node)) {
				setIsSoapMoreOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSoapMoreOpen]);

	// ── Синхронный бэкап черновика в localStorage (защита от потери при смене вкладок/звонках) ──
	const soapStorageKey = useMemo(
		() => `dente_soap_editor_draft_${selectedTooth ?? "general"}`,
		[selectedTooth],
	);

	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(soapStorageKey);
			if (saved && (!initialValues?.complaint && !initialValues?.treatmentPlan)) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") {
					setValues((prev) => ({ ...prev, ...parsed }));
				}
			}
		} catch {
			// ignore storage quota errors
		}
	}, [soapStorageKey]);

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

	// Дебаунс автосохранения (адаптивно: 800ms на ПК / 1800ms на слабом Celeron/HDD 5400 RPM)
	useEffect(() => {
		if (saveStatus !== "saving") return;
		const timing = getOptimizedTiming();
		const debounceMs = timing.autosaveDebounceMs || 400;
		const timer = setTimeout(() => {
			onChange?.(values);
			onSave?.(values);
			try {
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(values));
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values:", err);
			}
			setSaveStatus("saved");
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [values, saveStatus, onChange, onSave, soapStorageKey]);

	// Немедленный сброс несохраненного черновика при размонтировании (защита при смене вкладок)
	useEffect(() => {
		return () => {
			if (saveStatus === "saving") {
				onChange?.(values);
				onSave?.(values);
				try {
					safeLocalStorageSetItem(soapStorageKey, JSON.stringify(values));
				} catch (err: unknown) {
					console.warn("[VisitSoapEditor] Failed to cache soap note values on unmount:", err);
				}
			}
		};
	}, [saveStatus, values, onChange, onSave, soapStorageKey]);

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
			try {
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache corrected soap note values:", err);
			}
			onSave?.(next);
			onChange?.(next);
			return next;
		});
	}, [onSave, onChange, soapStorageKey]);

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

	// Чанкинг и виртуализация шаблонов (Мандаты 8c, 8n: DOM budget <= 30-50 узлов)
	const templatesSlice = useMemo(() => {
		return sliceDomList(filteredProtocols, templatesLimit, 0);
	}, [filteredProtocols, templatesLimit]);

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
				try {
					safeLocalStorageSetItem(soapStorageKey, JSON.stringify(nextValues));
				} catch (err: unknown) {
					console.warn("[VisitSoapEditor] Failed to cache template soap note values:", err);
				}
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
					try {
						safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
					} catch (err: unknown) {
						console.warn("[VisitSoapEditor] Failed to cache merged template soap note values:", err);
					}
					onSave?.(next);
					onChange?.(next);
					return next;
				});
			}

			setIsTemplatesOpen(false);
			setPreviewProtocol(null);
		},
		[selectedTooth, selectedSurfaces, values.anamnesis, isLocked, isCorrectionMode, onSave, onChange, onApplyFullDiary, setIsTemplatesOpen, soapStorageKey],
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
		try {
			safeLocalStorageSetItem(soapStorageKey, JSON.stringify(normValues));
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to cache norm soap note values:", err);
		}
		onSave?.(normValues);
		onChange?.(normValues);
	}, [selectedTooth, isLocked, isCorrectionMode, onSave, onChange, soapStorageKey]);

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

	// Плавный скролл при открытии виртуальной клавиатуры на мобильных устройствах
	const handleInputFocus = useCallback(
		(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
			const target = e.currentTarget;
			setTimeout(() => {
				target.scrollIntoView({ behavior: "smooth", block: "center" });
			}, 300);
		},
		[],
	);

	return (
		<div
			className={`flex flex-col bg-[var(--paper,white)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden shadow-xs ${className}`}
		>
			{/* ── ТУЛБАР 1 СТРОКА (ХИК / HIG: 32-36px кнопки) ── */}
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] overflow-x-auto scrollbar-none flex-nowrap min-h-[36px]">
				<div className="flex items-center gap-2 shrink-0">
					<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
						<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
						<span>Форма 043/у • SOAP</span>
					</div>

					{/* Селектор целевого зуба */}
					<div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--line)]">
						<label
							htmlFor="soap-select-tooth"
							className="text-xs font-semibold text-[var(--muted)]"
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
							className="min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--teal,var(--brand-primary))] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
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
						className="min-h-[44px] sm:min-h-0 sm:h-7 w-32 px-2 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
					/>
				</div>

				{/* Правый блок кнопок прямого действия */}
				<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
					{/* Индикатор закрытого визита и кнопка ревизии («Исправленному верить», Мандат 8e) */}
					{isLocked && (
						!isCorrectionMode ? (
							<button
								type="button"
								onClick={handleEnableCorrection}
								data-testid="btn-soap-enable-correction"
								className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
								title="Приём закрыт. Нажмите для внесения правок с версионным аудитом («Исправленному верить»)"
							>
								<Edit3 className="w-3.5 h-3.5" />
								<span className="hidden md:inline">Внести исправление («Исправленному верить»)</span>
								<span className="md:hidden">Исправить</span>
							</button>
						) : (
							<div
								data-testid="badge-soap-correction-active"
								className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
								title="Режим исправления закрытого дневника («Исправленному верить»)"
							>
								<Check className="w-3.5 h-3.5 text-emerald-600" />
								<span>Исправленному верить</span>
							</div>
						)
					)}

					{/* Кнопка "Шаблоны 043/у (448)" (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
						data-testid="btn-open-stomt-templates"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
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
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-colors"
						title="Соматически здоров / норма (1-клик): зафиксировать физиологическую норму в карте 043/у"
						aria-label="Соматически здоров / Норма (1-клик)"
					>
						<Check className="w-3.5 h-3.5" />
						<span className="hidden md:inline">Соматически здоров / Норма</span>
						<span className="md:hidden">Норма</span>
					</button>

					{/* Переключение режима отображения */}
					<div className="flex items-center bg-[var(--paper-soft)] border border-[var(--line)] p-0.5 rounded-lg">
						<button
							type="button"
							onClick={() => setActiveViewMode("fields")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${activeViewMode === "fields" ? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
						>
							<Edit3 className="w-3 h-3" />
							<span>Поля</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveViewMode("full_text")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${activeViewMode === "full_text" ? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
						>
							<Eye className="w-3 h-3" />
							<span>Печать</span>
						</button>
					</div>

					{/* Скопировать в буфер */}
					<button
						type="button"
						onClick={handleCopyFullText}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
						title="Скопировать медицинскую запись в буфер обмена"
					>
						{copied ? (
							<Check className="w-4 h-4 text-emerald-600" />
						) : (
							<Copy className="w-4 h-4" />
						)}
					</button>

					{/* Дополнительные действия «...» (Мандаты 8d, 8e, 8p: 1 строка тулбара 32–36px) */}
					<div className="relative inline-block" ref={soapMoreRef}>
						<button
							type="button"
							data-testid="btn-soap-more-actions"
							onClick={() => setIsSoapMoreOpen((v) => !v)}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
							title="Дополнительные действия дневника"
							aria-label="Дополнительные действия"
							aria-expanded={isSoapMoreOpen}
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>
						{isSoapMoreOpen && (
							<div
								data-testid="soap-more-dropdown"
								className="absolute right-0 top-full mt-1 z-50 min-w-[200px] p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs"
							>
								<button
									type="button"
									onClick={() => {
										setIsSoapMoreOpen(false);
										handleCopyFullText();
									}}
									className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								>
									<Copy className="w-4 h-4 text-[var(--teal)] shrink-0" />
									<span>Скопировать дневник</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsSoapMoreOpen(false);
										setActiveViewMode("full_text");
										setTimeout(() => window.print(), 100);
									}}
									className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								>
									<Printer className="w-4 h-4 text-sky-600 shrink-0" />
									<span>Печать Формы 043/у</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsSoapMoreOpen(false);
										handleApplyNorm();
									}}
									className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								>
									<Check className="w-4 h-4 text-emerald-600 shrink-0" />
									<span>Норма в 1 клик</span>
								</button>
							</div>
						)}
					</div>

					{/* Индикатор сохранения (Мандат 8e: Debounced Autosave «СОХРАНЕНО» / «OK») */}
					<span
						data-testid="soap-autosave-status"
						className="text-[11px] font-semibold shrink-0 min-w-max text-right inline-flex items-center justify-end gap-1 whitespace-nowrap"
					>
						{saveStatus === "saving" ? (
							<span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 animate-pulse shrink-0 whitespace-nowrap">
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
								<span className="hidden sm:inline">Сохранение...</span>
								<span className="sm:hidden">...</span>
							</span>
						) : saveStatus === "saved" ? (
							<span
								className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-bold shrink-0 whitespace-nowrap"
								title="Сохранено"
							>
								<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 inline" aria-hidden="true" />
								<span className="hidden 2xl:inline">СОХРАНЕНО</span>
								<span className="2xl:hidden">OK</span>
							</span>
						) : (
							""
						)}
					</span>
				</div>
			</div>

			{/* ── ВЫПАДАЮЩАЯ ПАНЕЛЬ ШАБЛОНОВ STOMX ── */}
			{isTemplatesOpen && (
				<div className="bg-[var(--paper-soft)] border-b border-[var(--line)] p-3 transition-all">
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
								Клинические протоколы StomX (448 шаблонов 043/у)
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsTemplatesOpen(false)}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
							aria-label="Закрыть шаблоны"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Фильтры специальностей */}
					<div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
						<button
							type="button"
							onClick={() => setActiveSpecialty("all")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-3 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 ${activeSpecialty === "all" ? "bg-[var(--teal,var(--brand-primary))] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]"}`}
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
									className={`min-h-[44px] sm:min-h-0 sm:h-7 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${isActive ? "bg-[var(--teal,var(--brand-primary))] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]"}`}
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
						<Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--muted)]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по диагнозу, протоколу (кариес, пульпит, виниры, имплантация, кюретаж)..."
							className="w-full h-9 pl-8 pr-3 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
						/>
					</div>

					{/* Сетка шаблонов (виртуализирована чанками по 30 шт. для 4GB RAM и слабых CPU) */}
					<div
						className="max-h-[50dvh] sm:max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pr-1"
						style={{ contain: "content" }}
					>
						{(templatesSlice?.visibleItems ?? []).map((protocol) => (
							<div
								key={protocol.id}
								className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg flex flex-col justify-between hover:border-[var(--teal,var(--brand-primary))] transition-colors shadow-2xs"
								style={{ contain: "content", contentVisibility: "auto", containIntrinsicSize: "auto 84px" }}
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
										className="flex-1 min-h-[44px] sm:min-h-0 sm:h-6 text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center touch-manipulation"
										title="Заменить текущий дневник этим протоколом в 1 клик"
									>
										Заполнить (1 клик)
									</button>
									<button
										type="button"
										onClick={() => setPreviewProtocol(protocol)}
										className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-6 sm:px-1.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded flex items-center justify-center touch-manipulation"
										title="Предпросмотр протокола"
									>
										<Eye className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => handleApplyProtocol(protocol, "append")}
										className="min-h-[44px] sm:min-h-0 sm:h-6 px-2 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded cursor-pointer flex items-center justify-center touch-manipulation"
										title="Дописать протокол к текущему тексту"
									>
										+ Добавить
									</button>
								</div>
							</div>
						))}
						{templatesSlice.hasMore && (
							<div className="col-span-full flex justify-center py-2">
								<button
									type="button"
									onClick={() => setTemplatesLimit((prev) => prev + 30)}
									className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
									data-testid="btn-soap-templates-show-more"
								>
									{`Показать ещё ${Math.min(30, templatesSlice.remainingCount)} шаблонов (показано ${templatesSlice.displayedCount} из ${templatesSlice.totalCount})`}
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Модальное окно предпросмотра протокола */}
			{previewProtocol && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[var(--paper)] text-[var(--ink)] rounded-2xl max-w-xl w-full p-5 border border-[var(--line)] shadow-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
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
				<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
					{/* S1: Жалобы (Subjective) */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-complaints"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Жалобы (Subjective / Complaints)
							</label>
							<span className="text-[10px] text-[var(--muted)]">Форма 043/у</span>
						</div>
						<textarea
							id="soap-complaints"
							rows={3}
							value={values.complaint || ""}
							onChange={(e) => handleFieldChange("complaint", e.target.value)}
							onFocus={handleInputFocus}
							placeholder="Боль при приеме пищи, ночные боли, выпадение пломбы..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* S2: Анамнез заболевания и жизни */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-anamnesis"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Анамнез заболевания и жизни (Anamnesis)
							</label>
							<span className="text-[10px] text-[var(--muted)]">Аллергоанамнез</span>
						</div>
						<textarea
							id="soap-anamnesis"
							rows={3}
							value={values.anamnesis || ""}
							onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
							onFocus={handleInputFocus}
							placeholder="Зуб ранее лечен, боли возникли 2 дня назад. Соматически здоров..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* O: Объективный статус / Status Localis */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-objective"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Объективное исследование (Objective / Status Localis)
							</label>
							<span className="text-[10px] text-[var(--muted)]">
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
							onFocus={handleInputFocus}
							placeholder="Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* A: Клинический диагноз (Assessment) */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-diagnosis"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Клинический диагноз по МКБ-10 (Assessment)
							</label>
							<span className="text-[10px] text-[var(--teal,var(--brand-primary))] font-semibold">
								{values.icd10 || "МКБ-10"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<input
								id="soap-icd10"
								type="text"
								value={values.icd10 || ""}
								onChange={(e) => handleFieldChange("icd10", e.target.value)}
								onFocus={handleInputFocus}
								placeholder="K02.1"
								aria-label="Код МКБ-10"
								className="w-24 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs font-bold text-[var(--teal,var(--brand-primary))] bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
								style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
							/>
							<input
								id="soap-diagnosis"
								type="text"
								value={values.diagnosis || ""}
								onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
								onFocus={handleInputFocus}
								placeholder="Клинический диагноз: Кариес дентина зуба 16..."
								className="flex-1 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
								style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
							/>
						</div>
					</div>

					{/* P1: Протокол лечения (Plan / Treatment) */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-treatment"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Протокол лечения и манипуляции (Plan / Treatment Protocol)
							</label>
							<span className="text-[10px] text-[var(--muted)]">
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
							onFocus={handleInputFocus}
							placeholder="Анестезия sol. Articaini 1:200000 1.8 мл. Препарирование кариозной полости, коффердам..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y font-mono text-[11px] touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* P2: Рекомендации пациенту */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<label
							htmlFor="soap-recommendations"
							className="text-xs font-bold text-[var(--ink)]"
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
							onFocus={handleInputFocus}
							placeholder="Щадящая диета 2 часа, гигиена полости рта, НПВП при боли..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>
				</div>
			) : (
				/* ── РЕЖИМ ПЕЧАТНОГО ПРЕДПРОСМОТРА 043/У (МАНДАТ 8E) ── */
				<div className="p-4 bg-[var(--paper)] font-serif text-[var(--ink)] text-xs leading-relaxed space-y-3 border border-[var(--line)] rounded-xl relative overflow-hidden">
					{/* Водяной знак штампа (Мандат 8e) */}
					<div
						className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
						aria-hidden="true"
					>
						<div
							style={{
								transform: "rotate(-28deg)",
								fontSize: "32pt",
								fontWeight: 900,
								color: isLocked ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)",
								textTransform: "uppercase",
								letterSpacing: "0.1em",
								whiteSpace: "nowrap",
							}}
						>
							{isLocked
								? (isCorrectionMode ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ")
								: "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП"}
						</div>
					</div>

					{/* Верхняя панель печати: штамп и кнопка печати (Мандат 8e) */}
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)] relative z-10">
						<div className="flex items-center gap-2">
							{isLocked ? (
								<span
									data-testid="soap-print-stamp-locked"
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold tracking-wider uppercase font-sans"
								>
									<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
									<span>{isCorrectionMode ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ"}</span>
								</span>
							) : (
								<span
									data-testid="soap-print-stamp-draft"
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[10px] font-bold tracking-wider uppercase font-sans"
								>
									<FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
									<span>ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП</span>
								</span>
							)}
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => window.print()}
								data-testid="btn-soap-print-action"
								className="min-h-[44px] sm:min-h-0 sm:h-7 px-3 text-xs font-bold rounded-lg bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors font-sans"
								title="Распечатать медицинскую карту Форма 043/у"
							>
								<Printer className="w-3.5 h-3.5" />
								<span>Напечатать (Ctrl+P)</span>
							</button>
						</div>
					</div>

					<div className="border-b-2 border-[var(--line-strong,var(--ink))] pb-2 text-center relative z-10">
						<div className="font-sans font-black text-sm uppercase tracking-wide">
							МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (Форма № 043/у)
						</div>
						<div className="font-sans text-[10px] text-[var(--muted)]">
							Дневник амбулаторного приема • Зуб:{" "}
							{selectedTooth ?? "Общий статус"}
						</div>
					</div>

					<div className="relative z-10 space-y-2.5">
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

					<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)] font-sans relative z-10">
						<span>Форма 043/у • Приказ Минздрава России № 834н</span>
						<span>Подпись врача: _________________ / {isLocked ? (isCorrectionMode ? "Исправленному верить" : "Подписано врачом") : "Черновик"}</span>
					</div>
				</div>
			)}

			{/* ── МОБИЛЬНЫЙ ДОК ДЕЙСТВИЙ (ФИКСИРОВАН ВНИЗУ ЭКРАНА С SAFE-AREA) ── */}
			<div
				className="soap-mobile-action-bar sticky bottom-0 z-30 md:hidden flex items-center justify-between gap-1.5 p-2 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg"
				style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))" }}
			>
				<button
					type="button"
					onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
					className="flex-1 min-h-[44px] px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-teal-600 active:bg-teal-700 text-white shadow-xs touch-manipulation cursor-pointer"
					title="Каталог 448 шаблонов StomX"
				>
					<Sparkles className="w-4 h-4 shrink-0" />
					<span className="truncate">Шаблоны (448)</span>
				</button>

				<button
					type="button"
					onClick={handleApplyNorm}
					className="min-h-[44px] px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1 bg-emerald-500/15 active:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 touch-manipulation cursor-pointer shrink-0"
					title="Заполнить нормой в 1 клик"
				>
					<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
					<span>Норма</span>
				</button>

				<div className="flex items-center bg-[var(--paper-soft)] border border-[var(--line)] p-0.5 rounded-xl shrink-0">
					<button
						type="button"
						onClick={() => setActiveViewMode("fields")}
						className={`min-h-[44px] px-2.5 text-xs font-bold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
							activeViewMode === "fields"
								? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
								: "text-[var(--muted)]"
						}`}
						title="Режим редактирования полей"
					>
						<Edit3 className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setActiveViewMode("full_text")}
						className={`min-h-[44px] px-2.5 text-xs font-bold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
							activeViewMode === "full_text"
								? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
								: "text-[var(--muted)]"
						}`}
						title="Печатный предпросмотр 043/у"
					>
						<Eye className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
};
