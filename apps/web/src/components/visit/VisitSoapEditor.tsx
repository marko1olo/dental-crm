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
	BookOpen,
	Check,
	Clock,
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
	Zap,
	Activity,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import { getOptimizedTiming } from "../../utils/lowSpecHddOptimizer";
import { Icd10ClinicalSelector } from "../diagnostics/Icd10ClinicalSelector";
import { showToast } from "../GlobalToast";
import {
	buildChairsideSmartProtocol,
	type ChairsideSmartProtocolKey,
	saveChairsideVisitDraft,
	loadChairsideVisitDraft,
} from "./clinicalVisitWorkflow";
import { apply1ClickDoctorAutopilot } from "./presets/autopilotPresets";

export interface VisitSoapNoteValues {
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	icd10?: string | undefined;
}

export interface VisitSoapEditorProps {
	readonly visitId?: string;
	readonly patientId?: string;
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
 * Преобразует шаблон StomX из каталога 448 шаблонов в полноценный клинический протокол медицинской карты (SOAP).
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
 * Редактор медицинской карты (SOAP) с быстрым выбором протоколов StomX
 */
export const VisitSoapEditor: React.FC<VisitSoapEditorProps> = ({
	visitId,
	patientId,
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
	const [apiTemplates, setApiTemplates] = useState<StomxOutpatientTemplateMetadata[] | null>(null);
	const [isIcd10SelectorOpen, setIsIcd10SelectorOpen] = useState<boolean>(false);

	// Загрузка шаблонов из реального API бэкенда (таблица outpatient_templates в PostgreSQL 18)
	// с надежным офлайн-фоллбэком на локальный кэш и встроенные пресеты (Мандаты 8e, 8s, 8t)
	useEffect(() => {
		let isMounted = true;
		const fetchTemplates = async () => {
			try {
				const res = await fetch("/api/clinical/outpatient-templates?limit=500");
				if (res.ok) {
					const data = await res.json();
					if (isMounted && data?.templates && Array.isArray(data.templates) && data.templates.length > 0) {
						const formatted: StomxOutpatientTemplateMetadata[] = data.templates.map((t: any) => ({
							id: Number(t.id),
							categoryId: Number(t.categoryId),
							categoryName: t.categoryName || "Клинический протокол",
							specialty: (t.categorySpecialty as OutpatientSpecialty) || "therapy",
							name: t.name || "",
							mkbCode: t.mkbCode || "K02",
						}));
						setApiTemplates(formatted);
					}
				}
			} catch {
				// Офлайн-режим: тихий фоллбэк на локальный кэш/статику без блокировки UI
			}
		};
		void fetchTemplates();
		return () => {
			isMounted = false;
		};
	}, []);

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
	const soapStorageKey = useMemo(() => {
		const prefix = visitId ? `${visitId}_` : patientId ? `${patientId}_` : "";
		return `dente_soap_editor_draft_${prefix}${selectedTooth ?? "general"}`;
	}, [visitId, patientId, selectedTooth]);

	// Мандат 8e / 8c: Неблокирующий баннер обнаружения черновика («Обнаружен несохранённый черновик от 14:32 — [Восстановить] [Сбросить]»)
	const [unsavedDraftNotice, setUnsavedDraftNotice] = useState<{
		draftValues: VisitSoapNoteValues;
		timeStr: string;
	} | null>(null);

	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(soapStorageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") {
					const candidate: VisitSoapNoteValues = {
						complaint: parsed.complaint || "",
						anamnesis: parsed.anamnesis || "",
						objectiveStatus: parsed.objectiveStatus || "",
						diagnosis: parsed.diagnosis || "",
						treatmentPlan: parsed.treatmentPlan || "",
						recommendations: parsed.recommendations || "",
						icd10: parsed.icd10 || "",
					};

					const hasContent = Boolean(
						candidate.complaint?.trim() ||
						candidate.anamnesis?.trim() ||
						candidate.objectiveStatus?.trim() ||
						candidate.diagnosis?.trim() ||
						candidate.treatmentPlan?.trim() ||
						candidate.recommendations?.trim() ||
						candidate.icd10?.trim()
					);

					// Проверяем, отличается ли локальный черновик от серверных initialValues
					const isDifferent =
						(candidate.complaint || "") !== (initialValues?.complaint || "") ||
						(candidate.anamnesis || "") !== (initialValues?.anamnesis || "") ||
						(candidate.objectiveStatus || "") !== (initialValues?.objectiveStatus || "") ||
						(candidate.diagnosis || "") !== (initialValues?.diagnosis || "") ||
						(candidate.treatmentPlan || "") !== (initialValues?.treatmentPlan || "") ||
						(candidate.recommendations || "") !== (initialValues?.recommendations || "") ||
						(candidate.icd10 || "") !== (initialValues?.icd10 || "");

					if (hasContent && isDifferent) {
						if (!initialValues?.complaint && !initialValues?.treatmentPlan) {
							setValues((prev) => ({ ...prev, ...candidate }));
						}

						const savedDate = parsed._savedAt || parsed.savedAt
							? new Date(parsed._savedAt || parsed.savedAt)
							: new Date();
						const timeStr = !Number.isNaN(savedDate.getTime())
							? savedDate.toLocaleTimeString("ru-RU", {
									hour: "2-digit",
									minute: "2-digit",
								})
							: "недавнего времени";

						setUnsavedDraftNotice({
							draftValues: candidate,
							timeStr,
						});
					} else {
						setUnsavedDraftNotice(null);
					}
				}
			}
		} catch {
			// ignore storage quota / parse errors
		}
	}, [soapStorageKey, initialValues]);

	const handleRestoreDraft = useCallback(() => {
		if (!unsavedDraftNotice) return;
		const restored = unsavedDraftNotice.draftValues;
		setValues(restored);
		valuesRef.current = restored;
		setSaveStatus("saved");
		setUnsavedDraftNotice(null);
		onChangeRef.current?.(restored);
		onSaveRef.current?.(restored);
	}, [unsavedDraftNotice]);

	const handleDiscardDraft = useCallback(() => {
		try {
			safeLocalStorageRemoveItem(soapStorageKey);
			if (visitId || patientId) {
				safeLocalStorageRemoveItem(`dente_soap_editor_draft_${selectedTooth ?? "general"}`);
			}
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to discard draft:", err);
		}
		setUnsavedDraftNotice(null);
	}, [soapStorageKey, visitId, patientId, selectedTooth]);

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

	// Рефы для актуальных значений при размонтировании и смене вкладок (защита от потери черновика)
	const valuesRef = useRef(values);
	valuesRef.current = values;
	const saveStatusRef = useRef(saveStatus);
	saveStatusRef.current = saveStatus;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;
	const soapStorageKeyRef = useRef(soapStorageKey);
	soapStorageKeyRef.current = soapStorageKey;

	// Дебаунс автосохранения (500–1000мс по Мандатам 8e, 8n)
	useEffect(() => {
		if (saveStatus !== "saving") return;
		const timing = getOptimizedTiming();
		const debounceMs = Math.max(500, Math.min(1000, timing.autosaveDebounceMs || 800));
		const timer = setTimeout(() => {
			onChangeRef.current?.(values);
			onSaveRef.current?.(values);
			try {
				const draftPayload = {
					...values,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(draftPayload));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: {
							...values,
							toothNumber: selectedTooth ?? undefined,
						},
					});
				}
				void import("../../utils/offlineMutationQueue").then(({ saveOfflineDraft }) => {
					void saveOfflineDraft(
						soapStorageKey,
						"DIARY_043_DRAFT",
						selectedTooth ? `tooth-${selectedTooth}` : "general",
						draftPayload,
					);
				}).catch(() => {});
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values:", err);
			}
			setSaveStatus("saved");
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [values, saveStatus, soapStorageKey, selectedTooth, visitId, patientId]);

	// Регулярное непрерывное автосохранение черновика каждую минуту (1-минутный heartbeat защиты от потери данных)
	useEffect(() => {
		const intervalTimer = setInterval(() => {
			const cur = valuesRef.current;
			const hasContent = Boolean(
				cur.complaint?.trim() ||
				cur.anamnesis?.trim() ||
				cur.objectiveStatus?.trim() ||
				cur.diagnosis?.trim() ||
				cur.treatmentPlan?.trim() ||
				cur.recommendations?.trim() ||
				cur.icd10?.trim()
			);
			if (!hasContent) return;

			try {
				const draftPayload = {
					...cur,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(soapStorageKeyRef.current, JSON.stringify(draftPayload));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: {
							...cur,
							toothNumber: selectedTooth ?? undefined,
						},
					});
				}
				void import("../../utils/offlineMutationQueue").then(({ saveOfflineDraft }) => {
					void saveOfflineDraft(
						soapStorageKeyRef.current,
						"DIARY_043_DRAFT",
						selectedTooth ? `tooth-${selectedTooth}` : "general",
						draftPayload,
					);
				}).catch(() => {});
				setSaveStatus("saved");
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] periodic heartbeat autosave error:", err);
			}
		}, 60000);

		return () => clearInterval(intervalTimer);
	}, [visitId, patientId, selectedTooth]);


	// Немедленный сброс несохраненного черновика строго при размонтировании, смене вкладок или скрытии страницы (Мандат 8e, 8n)
	const flushDraft = useCallback(() => {
		if (saveStatusRef.current === "saving") {
			onChangeRef.current?.(valuesRef.current);
			onSaveRef.current?.(valuesRef.current);
			try {
				const draftPayload = {
					...valuesRef.current,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(
					soapStorageKeyRef.current,
					JSON.stringify(draftPayload),
				);
				void import("../../utils/offlineMutationQueue").then(({ saveOfflineDraft }) => {
					void saveOfflineDraft(
						soapStorageKeyRef.current,
						"DIARY_043_DRAFT",
						selectedTooth ? `tooth-${selectedTooth}` : "general",
						draftPayload,
					);
				}).catch(() => {});
			} catch (err: unknown) {
				console.warn(
					"[VisitSoapEditor] Failed to cache soap note values on flush:",
					err,
				);
			}
			setSaveStatus("saved");
		}
	}, [selectedTooth]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushDraft();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", flushDraft);
		window.addEventListener("pagehide", flushDraft);
		window.addEventListener("blur", flushDraft);
		window.addEventListener("dente-telephony-incoming-call", flushDraft);
		window.addEventListener("dente:visit-tab-change", flushDraft);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", flushDraft);
			window.removeEventListener("pagehide", flushDraft);
			window.removeEventListener("blur", flushDraft);
			window.removeEventListener("dente-telephony-incoming-call", flushDraft);
			window.removeEventListener("dente:visit-tab-change", flushDraft);
			flushDraft();
		};
	}, [flushDraft]);

	// Слушатель внешней установки физиологической нормы или протокола SOAP (Мандат 8e, 8n)
	useEffect(() => {
		const handleExternalSoapProtocol = (e: Event) => {
			const customEvent = e as CustomEvent<{
				soap?: Partial<VisitSoapNoteValues> & { statusLocalis?: string; complaints?: string; diagnosisIcd10?: string };
				mode?: "replace" | "smart_append";
				immediate?: boolean;
			} & Partial<VisitSoapNoteValues> & { statusLocalis?: string; complaints?: string; diagnosisIcd10?: string }>;
			if (!customEvent?.detail) return;
			const detail = customEvent.detail;
			const incoming = detail.soap || detail;
			if (!incoming || typeof incoming !== "object") return;
			const statusLocalis = incoming.statusLocalis || incoming.objectiveStatus;
			const complaint = incoming.complaint || incoming.complaints;

			setValues((prev) => {
				const isSmartAppend = detail.mode === "smart_append";
				const appendField = (
					baseVal: string | undefined,
					incomingVal: string | undefined,
					sep = "\n\n",
				): string => {
					const base = (baseVal || "").trim();
					const inc = (incomingVal || "").trim();
					if (!inc) return base;
					if (!base) return inc;
					if (base.includes(inc)) return base;
					return `${base}${sep}${inc}`;
				};

				const next: VisitSoapNoteValues = isSmartAppend
					? {
							...prev,
							anamnesis: appendField(prev.anamnesis, incoming.anamnesis),
							objectiveStatus: appendField(prev.objectiveStatus, statusLocalis),
							complaint: appendField(prev.complaint, complaint),
							diagnosis: appendField(prev.diagnosis, incoming.diagnosis, "; "),
							treatmentPlan: appendField(prev.treatmentPlan, incoming.treatmentPlan),
							recommendations: appendField(prev.recommendations, incoming.recommendations),
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  }
					: {
							...prev,
							anamnesis: incoming.anamnesis ?? prev.anamnesis,
							objectiveStatus: statusLocalis ?? prev.objectiveStatus,
							complaint: complaint ?? prev.complaint,
							diagnosis: incoming.diagnosis ?? prev.diagnosis,
							treatmentPlan: incoming.treatmentPlan ?? prev.treatmentPlan,
							recommendations: incoming.recommendations ?? prev.recommendations,
							icd10: incoming.icd10 ?? incoming.diagnosisIcd10 ?? prev.icd10,
					  };
				valuesRef.current = next;
				setSaveStatus("saved");
				try {
					safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
				} catch (err: unknown) {
					console.warn("[VisitSoapEditor] Failed to cache external soap note values:", err);
				}
				onSave?.(next);
				onChange?.(next);
				return next;
			});
		};

		window.addEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		return () => {
			window.removeEventListener("dente-apply-soap-protocol", handleExternalSoapProtocol);
		};
	}, [soapStorageKey, onSave, onChange]);

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
			valuesRef.current = next;
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
					valuesRef.current = next;
					try {
						safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
					} catch (err: unknown) {
						// ignore storage quota errors
					}
					return next;
				});
				return;
			}
			setSaveStatus("saving");
			setValues((prev) => {
				const next = { ...prev, [field]: val };
				valuesRef.current = next;
				try {
					safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
				} catch (err: unknown) {
					// ignore storage quota errors
				}
				return next;
			});
		},
		[isLocked, isCorrectionMode, soapStorageKey],
	);

	// Фильтрация протоколов StomX среди 448 шаблонов (реальный API бэкенда с офлайн-фоллбэком)
	const filteredProtocols = useMemo(() => {
		const specFilter = activeSpecialty === "all" ? undefined : activeSpecialty;
		if (apiTemplates && apiTemplates.length > 0) {
			const q = searchQuery.toLowerCase().trim();
			const matched = apiTemplates.filter((t) => {
				if (specFilter && t.specialty !== specFilter) return false;
				if (!q) return true;
				return (
					t.name.toLowerCase().includes(q) ||
					t.mkbCode.toLowerCase().includes(q) ||
					t.categoryName.toLowerCase().includes(q)
				);
			});
			return matched.map(resolveProtocolFromTemplate);
		}
		const matchingTemplates = searchAll448Templates(searchQuery, specFilter);
		return matchingTemplates.map(resolveProtocolFromTemplate);
	}, [apiTemplates, searchQuery, activeSpecialty]);

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

	// Физиологическая норма (Мандат 8e, 8n, 8s)
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
		const autopilot = apply1ClickDoctorAutopilot("norm", { toothNumber: targetTooth });
		const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";
		// Мандат 8e: соматическая норма врача (Doctor Autonomy)
		// Эталонные формулировки: «Жалоб на момент осмотра не предъявляет», «Соматически здоров. Аллергологический анамнез не отягощен.»
		const defaultNormComplaint = "Жалоб на момент осмотра не предъявляет. Обратился(лась) с целью профилактического осмотра и гигиены.";
		const defaultNormAnamnesis = "Соматически здоров. Аллергологический анамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает.";
		const normValues: VisitSoapNoteValues = {
			complaint: autopilot.preset.complaint || defaultNormComplaint,
			anamnesis: autopilot.preset.anamnesis || defaultNormAnamnesis,
			objectiveStatus: `Прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Зуб ${targetTooth}: интактен, зондирование и перкуссия безболезненны, реакция на термопробу адекватная, подвижность отсутствует. Зубные отложения умеренные.`,
			diagnosis: "Z01.2 Стоматологическое обследование (Здоров)",
			treatmentPlan: `${autopilot.diary.treatmentDescription}${auditStamp}`,
			recommendations: autopilot.preset.recommendations ?? "",
			icd10: autopilot.preset.icd10,
		};
		setValues(normValues);
		valuesRef.current = normValues;
		setSaveStatus("saved");
		try {
			safeLocalStorageSetItem(soapStorageKey, JSON.stringify(normValues));
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to cache norm soap note values:", err);
		}
		onSave?.(normValues);
		onChange?.(normValues);

		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
			`[Жалобы]: ${normValues.complaint}`,
			`[Анамнез]: ${normValues.anamnesis}`,
			`[Объективный статус]: ${normValues.objectiveStatus}`,
			`[Диагноз]: [${normValues.icd10}] ${normValues.diagnosis}`,
			`[Протокол лечения]: ${normValues.treatmentPlan}`,
			`[Рекомендации]: ${normValues.recommendations}`,
		].join("\n\n");
		onApplyFullDiary?.(fullText);
	}, [selectedTooth, isLocked, isCorrectionMode, onSave, onChange, onApplyFullDiary, soapStorageKey]);

	// 5 Экспресс-протоколов дневника у кресла на русском языке (Кариес K02.1, Пульпит K04.0, Периодонтит K04.5, Профгигиена K05.1, Удаление K01.1)
	const handleApplyExpressProtocol = useCallback(
		(presetType: ChairsideSmartProtocolKey) => {
			if (isLocked && !isCorrectionMode) {
				setIsCorrectionMode(true);
			}
			const protocol = buildChairsideSmartProtocol(presetType, selectedTooth, {
				surfaces: selectedSurfaces,
				isLocked: isLocked && !isCorrectionMode,
			});

			const next: VisitSoapNoteValues = {
				complaint: protocol.complaint,
				anamnesis: protocol.anamnesis,
				objectiveStatus: protocol.objectiveStatus,
				diagnosis: protocol.diagnosis,
				treatmentPlan: protocol.treatmentPlan,
				recommendations: protocol.recommendations,
				icd10: protocol.icd10,
			};

			setValues(next);
			valuesRef.current = next;
			setSaveStatus("saved");
			try {
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(next));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: new Date().toISOString(),
						version: 1,
						diary: {
							...next,
							toothNumber: selectedTooth ?? undefined,
						},
					});
				}
			} catch (err) {
				console.warn("[VisitSoapEditor] storage error:", err);
			}
			onSave?.(next);
			onChange?.(next);

			const targetTooth = selectedTooth ?? 16;
			const fullText = [
				`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${targetTooth}) ===`,
				`[Жалобы]: ${next.complaint}`,
				`[Анамнез]: ${next.anamnesis}`,
				`[Объективный статус]: ${next.objectiveStatus}`,
				`[Диагноз]: [${next.icd10}] ${next.diagnosis}`,
				`[Протокол лечения]: ${next.treatmentPlan}`,
				`[Рекомендации]: ${next.recommendations}`,
			].join("\n\n");
			onApplyFullDiary?.(fullText);

			showToast(`Экспресс-протокол «${protocol.title}» применён`, "success", 3000);
		},
		[isLocked, isCorrectionMode, selectedTooth, selectedSurfaces, visitId, patientId, soapStorageKey, onSave, onChange, onApplyFullDiary],
	);


	// Ручное сохранение дневника (Мандат 8e: никогда не disabled)
	const handleExplicitSave = useCallback(() => {
		onChangeRef.current?.(values);
		onSaveRef.current?.(values);
		try {
			safeLocalStorageSetItem(soapStorageKey, JSON.stringify(values));
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to cache soap note values on save:", err);
		}
		setSaveStatus("saved");
	}, [soapStorageKey, values]);

	// Копирование целостной записи в буфер
	const handleCopyFullText = useCallback(() => {
		const fullText = [
			`=== МЕДИЦИНСКАЯ КАРТА (ЗУБ ${selectedTooth ?? "Общий"}) ===`,
			`[Жалобы]: ${values.complaint || "Не указаны"}`,
			`[Анамнез]: ${values.anamnesis || "Соматически здоров"}`,
			`[Объективный статус]: ${values.objectiveStatus || "Без патологии"}`,
			`[Диагноз]: ${values.icd10 ? `[${values.icd10}] ` : ""}${values.diagnosis || "Не установлен"}`,
			`[Протокол лечения]: ${values.treatmentPlan || "Лечение и гигиена"}`,
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
					<div
						className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted)]"
						aria-label="Медицинская карта • Дневник приёма"
						title="Медицинская карта • Дневник приёма"
					>
						<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
						<span>Медицинская карта • Дневник приёма</span>
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

					{/* Кнопка "Клинические шаблоны (448)" (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
						data-testid="btn-open-stomt-templates"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3.5 text-[13px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
						title="Открыть каталог 448 клинических шаблонов из StomX"
						aria-label="Клинические шаблоны (448)"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>Клинические шаблоны (448)</span>
					</button>

					{/* Физиологическая норма (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={handleApplyNorm}
						disabled={false}
						data-testid="btn-soap-physio-norm"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-colors"
						title="Соматически здоров / норма: зафиксировать физиологическую норму в дневнике приёма"
						aria-label="Соматически здоров / Норма"
					>
						<Check className="w-3.5 h-3.5" />
						<span>Норма</span>
					</button>

					{/* Переключение режима отображения (Каноничный Segmented Control) */}
					<div
						className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs"
						role="tablist"
						aria-label="Режим отображения дневника"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeViewMode === "fields"}
							onClick={() => setActiveViewMode("fields")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
								activeViewMode === "fields"
									? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
									: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
							}`}
						>
							<Edit3 className="w-3 h-3" />
							<span>Поля</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeViewMode === "full_text"}
							onClick={() => setActiveViewMode("full_text")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
								activeViewMode === "full_text"
									? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
									: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
							}`}
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

					{/* Кнопка ручного сохранения (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={handleExplicitSave}
						disabled={false}
						data-testid="btn-soap-save"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-[var(--teal-soft,rgba(13,148,136,0.1))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal)] border border-[var(--teal-surface,var(--teal))] transition-colors"
						title="Сохранить дневник приёма сейчас"
						aria-label="Сохранить дневник"
					>
						<Check className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span className="hidden xl:inline">Сохранить</span>
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
										handleExplicitSave();
									}}
									data-testid="btn-soap-more-save"
									className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								>
									<Check className="w-4 h-4 text-[var(--teal)] shrink-0" />
									<span>Сохранить дневник</span>
								</button>
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
										setTimeout(() => {
											try {
												window.print();
											} catch (printErr) {
												console.warn("[VisitSoapEditor] print failed:", printErr);
											}
										}, 100);
									}}
									className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
								>
									<Printer className="w-4 h-4 text-sky-600 shrink-0" />
									<span>Печать карты</span>
								</button>
							</div>
						)}
					</div>

					{/* Индикатор сохранения (Мандат 8e: Debounced Autosave «СОХРАНЕНО» / «OK») */}
					<span
						id="diary-autosave-status"
						data-tour="diary-autosave-status"
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

			{/* ── ТИХИЙ НЕБЛОКИРУЮЩИЙ БАННЕР ОБНАРУЖЕНИЯ ЧЕРНОВИКА (МАНДАТЫ 8C, 8E) ── */}
			{unsavedDraftNotice && (
				<div
					data-testid="banner-draft-recovery"
					role="alert"
					className="flex items-center justify-between gap-3 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shrink-0"
				>
					<div className="flex items-center gap-2 min-w-0">
						<Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-medium truncate">
							Обнаружен несохранённый черновик от {unsavedDraftNotice.timeStr}
						</span>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handleRestoreDraft}
							data-testid="btn-restore-draft"
							className="min-h-[26px] h-[26px] px-2.5 text-xs font-bold rounded-md bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
							aria-label="Восстановить черновик"
						>
							<Check className="w-3 h-3" />
							<span>Восстановить</span>
						</button>
						<button
							type="button"
							onClick={handleDiscardDraft}
							data-testid="btn-discard-draft"
							className="min-h-[26px] h-[26px] px-2 text-xs font-semibold rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1"
							aria-label="Сбросить черновик"
						>
							<X className="w-3 h-3 text-[var(--muted)]" />
							<span>Сбросить</span>
						</button>
					</div>
				</div>
			)}

			{/* ── ВЫПАДАЮЩАЯ ПАНЕЛЬ ШАБЛОНОВ STOMX ── */}
			{isTemplatesOpen && (
				<div className="bg-[var(--paper-soft)] border-b border-[var(--line)] p-3 transition-all">
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span
								className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]"
								aria-label="Клинические протоколы StomX (448 протоколов)"
								title="Клинические протоколы StomX (448 протоколов)"
							>
								Клинические протоколы StomX (448 протоколов)
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
					<div className="dente-filter-chips overflow-x-auto pb-2 scrollbar-none">
						<button
							type="button"
							onClick={() => setActiveSpecialty("all")}
							className={`dente-filter-chip ${activeSpecialty === "all" ? "active" : ""}`}
							data-active={activeSpecialty === "all"}
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
									className={`dente-filter-chip ${isActive ? "active" : ""}`}
									data-active={isActive}
								>
									{SPECIALTY_ICONS[spec.id]}
									<span>{spec.shortLabel}</span>
									<span className="text-xs opacity-75">({count})</span>
								</button>
							);
						})}
					</div>

					{/* Поисковая строка */}
					<div className="dente-search-wrap w-full my-2">
						<Search className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по диагнозу, протоколу (кариес, пульпит, виниры, имплантация, кюретаж)..."
							className="dente-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
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
											className={`text-xs font-bold px-1.5 py-0.5 rounded border ${SPECIALTY_BADGE_COLORS[protocol.specialty]}`}
										>
											{protocol.mkbCode}
										</span>
										<span className="text-xs text-slate-500">
											{protocol.subcategory}
										</span>
									</div>
									<div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
										{protocol.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
										{protocol.complaint}
									</div>
								</div>
								<div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
									<button
										type="button"
										onClick={() => handleApplyProtocol(protocol, "replace")}
										className="flex-1 min-h-[44px] sm:min-h-[32px] sm:h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center touch-manipulation"
										title="Заменить текущий дневник этим протоколом"
									>
										<span>Заполнить</span>
									</button>
									<button
										type="button"
										onClick={() => setPreviewProtocol(protocol)}
										className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded flex items-center justify-center touch-manipulation"
										title="Предпросмотр протокола"
									>
										<Eye className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => handleApplyProtocol(protocol, "append")}
										className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded cursor-pointer flex items-center justify-center touch-manipulation"
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
								Вставить в дневник
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── ТЕЛО РЕДАКТОРА: ПОЛЯ SOAP ── */}
			{activeViewMode === "fields" ? (
				<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
					{/* ── 5 БЫСТРЫХ ЭКСПРЕСС-ПРОТОКОЛОВ У КРЕСЛА (МАНДАТЫ 8E, 8K) ── */}
					<div
						className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-[var(--paper-soft)] to-indigo-500/10 border border-[var(--teal,var(--brand-primary))]/30 shadow-2xs"
						data-testid="soap-chairside-express-bar"
					>
						<div className="flex items-center gap-1.5 shrink-0">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
							<span className="text-[12.5px] font-bold text-[var(--ink)]">
								Экспресс-протоколы у кресла:
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => handleApplyExpressProtocol("caries")}
								className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:border-emerald-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
								data-testid="btn-soap-express-caries"
								title="Протокол: Кариес дентина (K02.1) — анестезия, коффердам, композит светового отверждения, полировка"
							>
								<Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
								<span>Кариес (K02.1)</span>
							</button>
							<button
								type="button"
								onClick={() => handleApplyExpressProtocol("pulpitis")}
								className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:border-amber-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
								data-testid="btn-soap-express-pulpitis"
								title="Протокол: Острый пульпит (K04.0) — анестезия, экстирпация, мех/мед обработка каналов, обтурация"
							>
								<Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
								<span>Пульпит (K04.0)</span>
							</button>
							<button
								type="button"
								onClick={() => handleApplyExpressProtocol("periodontitis")}
								className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-500/40 hover:border-purple-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
								data-testid="btn-soap-express-periodontitis"
								title="Протокол: Хронический периодонтит (K04.5) — анестезия, коффердам, ревизия каналов, Ca(OH)2"
							>
								<HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								<span>Периодонтит (K04.5)</span>
							</button>
							<button
								type="button"
								onClick={() => handleApplyExpressProtocol("hygiene")}
								className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-500/40 hover:border-sky-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
								data-testid="btn-soap-express-hygiene"
								title="Протокол: Профгигиена (K05.1) — ультразвуковой скейлинг, Air-Flow, полировка пастой, фторирование"
							>
								<Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
								<span>Профгигиена (K05.1)</span>
							</button>
							<button
								type="button"
								onClick={() => handleApplyExpressProtocol("extraction")}
								className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/40 hover:border-rose-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
								data-testid="btn-soap-express-extraction"
								title="Протокол: Простое удаление зуба (K01.1) — анестезия, элеватор/щипцы, кюретаж лунки, гемостаз"
							>
								<Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
								<span>Удаление (K01.1)</span>
							</button>
						</div>
					</div>


					{/* Жалобы */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-complaints"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Жалобы
							</label>
							<span className="text-[10px] text-[var(--muted)]">Дневник</span>
						</div>
						<textarea
							id="soap-complaints"
							rows={3}
							value={values.complaint || ""}
							onChange={(e) => handleFieldChange("complaint", e.target.value)}
							onFocus={handleInputFocus}
							onBlur={flushDraft}
							placeholder="Боль при приеме пищи, ночные боли, выпадение пломбы..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* Анамнез заболевания и жизни */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-anamnesis"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Анамнез и противопоказания
							</label>
							<span className="text-[10px] text-[var(--muted)]">Аллергоанамнез</span>
						</div>
						<textarea
							id="soap-anamnesis"
							rows={3}
							value={values.anamnesis || ""}
							onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
							onFocus={handleInputFocus}
							onBlur={flushDraft}
							placeholder="Зуб ранее лечен, боли возникли 2 дня назад. Соматически здоров..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* Осмотр и зубная формула */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-objective"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Осмотр и зубная формула
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
							onBlur={flushDraft}
							placeholder="Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>

					{/* Клинический диагноз */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-diagnosis"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Диагноз (МКБ-10)
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
								onBlur={flushDraft}
								placeholder="K02.1"
								aria-label="Код МКБ-10"
								className="w-24 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs font-bold text-[var(--teal,var(--brand-primary))] bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
								style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
							/>
							<button
								type="button"
								onClick={() => setIsIcd10SelectorOpen((prev) => !prev)}
								data-testid="btn-open-icd10-selector"
								className={`min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
									isIcd10SelectorOpen
										? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal,var(--brand-primary))]"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								title="Справочник диагнозов (K00–K14, шаблоны)"
							>
								<BookOpen className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span className="hidden sm:inline">Справочник</span>
							</button>
							<input
								id="soap-diagnosis"
								type="text"
								value={values.diagnosis || ""}
								onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
								onFocus={handleInputFocus}
								onBlur={flushDraft}
								placeholder="Клинический диагноз: Кариес дентина зуба 16..."
								className="flex-1 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
								style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
							/>
						</div>
						{isIcd10SelectorOpen && (
							<div className="mt-2 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg">
								<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
									<div className="flex items-center gap-2">
										<BookOpen className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
										<span className="text-xs font-bold text-[var(--ink)]">
											Справочник диагнозов (Стоматология K00–K14)
										</span>
									</div>
									<button
										type="button"
										onClick={() => setIsIcd10SelectorOpen(false)}
										className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
										aria-label="Закрыть справочник диагнозов"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
								<Icd10ClinicalSelector
									selectedCode={values.icd10}
									selectedTooth={selectedTooth}
									onSelect={(item, toothNumber) => {
										handleFieldChange("icd10", item.code);
										const targetTooth = toothNumber ?? selectedTooth;
										const toothPart = targetTooth ? ` зуба ${targetTooth}` : "";
										handleFieldChange(
											"diagnosis",
											`${item.code} ${item.titleRu}${toothPart}`.trim(),
										);
										setIsIcd10SelectorOpen(false);
									}}
									onClear={() => {
										handleFieldChange("icd10", "");
										setIsIcd10SelectorOpen(false);
									}}
								/>
							</div>
						)}
					</div>

					{/* Протокол лечения */}
					<div className="flex flex-col gap-1 md:col-span-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="soap-treatment"
								className="text-xs font-bold text-[var(--ink)]"
							>
								Протокол лечения
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
							onBlur={flushDraft}
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
							Рекомендации и назначения
						</label>
						<textarea
							id="soap-recommendations"
							rows={2}
							value={values.recommendations || ""}
							onChange={(e) =>
								handleFieldChange("recommendations", e.target.value)
							}
							onFocus={handleInputFocus}
							onBlur={flushDraft}
							placeholder="Щадящая диета 2 часа, гигиена полости рта, НПВП при боли..."
							className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
							style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
						/>
					</div>
				</div>
			) : (
				/* ── РЕЖИМ ПЕЧАТНОГО ПРЕДПРОСМОТРА МЕДИЦИНСКОЙ КАРТЫ (МАНДАТ 8E) ── */
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
								title="Распечатать медицинскую карту"
							>
								<Printer className="w-3.5 h-3.5" />
								<span>Напечатать (Ctrl+P)</span>
							</button>
						</div>
					</div>

					<div className="border-b-2 border-[var(--line-strong,var(--ink))] pb-2 text-center relative z-10">
						<div className="font-sans font-black text-sm uppercase tracking-wide">
							МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА
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
							<span className="font-bold">Анамнез и противопоказания: </span>
							{values.anamnesis ||
								"Соматически здоров. Аллергоанамнез спокойный."}
						</div>
						<div>
							<span className="font-bold">
								Осмотр и зубная формула:{" "}
							</span>
							{values.objectiveStatus || "Патологических изменений не выявлено."}
						</div>
						<div>
							<span className="font-bold">Диагноз: </span>
							{values.icd10 ? `[${values.icd10}] ` : ""}
							{values.diagnosis || "Z01.2 Стоматологическое обследование."}
						</div>
						<div>
							<span className="font-bold">Протокол лечения: </span>
							{values.treatmentPlan || "Консультация, осмотр."}
						</div>
						<div>
							<span className="font-bold">Рекомендации: </span>
							{values.recommendations || "Стандартный гигиенический уход."}
						</div>
					</div>

					<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)] font-sans relative z-10">
						<span>Медицинская карта стоматологического пациента</span>
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
					className="flex-1 min-h-[44px] px-3 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 bg-teal-600 active:bg-teal-700 text-white shadow-xs touch-manipulation cursor-pointer"
					title="Каталог 448 шаблонов StomX"
				>
					<Sparkles className="w-4 h-4 shrink-0" />
					<span className="truncate">Шаблоны (448)</span>
				</button>

				<button
					type="button"
					onClick={handleApplyNorm}
					className="min-h-[44px] px-3.5 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1 bg-emerald-500/15 active:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 touch-manipulation cursor-pointer shrink-0"
					title="Заполнить нормой"
				>
					<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
					<span>Норма</span>
				</button>

				<div className="flex items-center bg-[var(--paper-soft)] border border-[var(--line-subtle)] p-0.5 rounded-xl shrink-0">
					<button
						type="button"
						onClick={() => setActiveViewMode("fields")}
						className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
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
						className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
							activeViewMode === "full_text"
								? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
								: "text-[var(--muted)]"
						}`}
						title="Печатный предпросмотр"
					>
						<Eye className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
};
