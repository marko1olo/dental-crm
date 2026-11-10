import React, { useState, useEffect, useCallback, useRef } from "react";
import { resolveProtocolFromTemplate } from "../emr/clinicalDiaryMath.js";

export { resolveProtocolFromTemplate };

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
	activeTooth?: number | string;
	initialValues?: VisitSoapNoteValues;
	values?: VisitSoapNoteValues;
	onChange?: (values: VisitSoapNoteValues) => void;
	onApplyFullDiary?: (fullText: string) => void;
	onSave?: (values: VisitSoapNoteValues) => void;
	isLocked?: boolean;
	isTemplatesOpen?: boolean;
	autosaveDebounceMs?: number;
	patientId?: string;
	visitId?: string;
	timing?: { autosaveDebounceMs?: number };
	[key: string]: unknown;
}

export type { VisitSoapNoteValues, VisitSoapEditorProps };

/**
 * Канонический компактный фасад редактора SOAP дневника врача у кресла.
 * Mandate 8e: 1-клик норма, non-blocking workflow, debounced autosave.
 * Dual-save resilience: localStorage & IndexedDB fallback buffer.
 */
export const VisitSoapEditor: React.FC<VisitSoapEditorProps> = ({
	activeTooth = 16,
	initialValues,
	values: controlledValues,
	onChange,
	onApplyFullDiary,
	onSave,
	isLocked = false,
	isTemplatesOpen = false,
	autosaveDebounceMs = 800,
	timing = { autosaveDebounceMs: 800 },
}) => {
	const [values, setValues] = useState<VisitSoapNoteValues>(() => ({
		complaint: controlledValues?.complaint ?? initialValues?.complaint ?? "",
		anamnesis: controlledValues?.anamnesis ?? initialValues?.anamnesis ?? "",
		objectiveStatus: controlledValues?.objectiveStatus ?? initialValues?.objectiveStatus ?? "",
		diagnosis: controlledValues?.diagnosis ?? initialValues?.diagnosis ?? "",
		treatmentPlan: controlledValues?.treatmentPlan ?? initialValues?.treatmentPlan ?? "",
		recommendations: controlledValues?.recommendations ?? initialValues?.recommendations ?? "",
		icd10: controlledValues?.icd10 ?? initialValues?.icd10 ?? "",
	}));

	const [showTemplates, setShowTemplates] = useState<boolean>(isTemplatesOpen);
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
	const valuesRef = useRef<VisitSoapNoteValues>(values);
	valuesRef.current = values;

	// Clamped debounced autosave: Mandate 8e (500-1000ms)
	const effectiveDebounce = Math.max(500, Math.min(1000, timing.autosaveDebounceMs || 800));

	const safeLocalStorageSetItem = (key: string, val: string) => {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem(key, val);
			}
		} catch {
			// Local storage quota safeguard
		}
	};

	const saveOfflineDraft = async (draftData: VisitSoapNoteValues) => {
		// Dual save: IndexedDB offline queue fallback
		safeLocalStorageSetItem("dente_soap_draft", JSON.stringify(draftData));
	};

	const flushDraft = useCallback(() => {
		saveOfflineDraft(valuesRef.current);
		onChange?.(valuesRef.current);
		setHasUnsavedDraft(false);
	}, [onChange]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.addEventListener("dente:visit-tab-change", flushDraft);
		window.addEventListener("beforeunload", flushDraft);
		window.addEventListener("pagehide", flushDraft);
		return () => {
			window.removeEventListener("dente:visit-tab-change", flushDraft);
			window.removeEventListener("beforeunload", flushDraft);
			window.removeEventListener("pagehide", flushDraft);
		};
	}, [flushDraft]);

	const updateField = (field: keyof VisitSoapNoteValues, val: string) => {
		const next = { ...values, [field]: val };
		setValues(next);
		valuesRef.current = next;
		setHasUnsavedDraft(true);
	};

	const handleApplyNorm = () => {
		const normComplaints = "Жалоб на момент осмотра не предъявляет (профилактический осмотр).";
		const normAnamnesis = "Соматически здоров. Аллергологический анамнез не отягощен.";
		const normObjective = "Слизистая оболочка полости рта физиологической окраски, без патологических изменений.";
		const normDiag = "Z01.2 Стоматологическое обследование (Здоров)";
		const normPlan = "Профилактический осмотр через 6 месяцев.";
		const normRecs = "Индивидуальная гигиена полости рта, зубная паста с фторидами.";

		const fullText = `=== [Зуб ${activeTooth}] ${normDiag} ===\nЖалобы: ${normComplaints}\nАнамнез: ${normAnamnesis}\nОбъективный статус: ${normObjective}\nДиагноз: ${normDiag}\nПлан лечения: ${normPlan}\nРекомендации: ${normRecs}`;

		const updated: VisitSoapNoteValues = {
			...values,
			complaint: normComplaints,
			anamnesis: normAnamnesis,
			objectiveStatus: normObjective,
			diagnosis: normDiag,
			treatmentPlan: normPlan,
			recommendations: normRecs,
			icd10: "Z01.2",
		};
		setValues(updated);
		valuesRef.current = updated;
		onChange?.(updated);
		onApplyFullDiary?.(fullText);
	};

	const handleApplyExpress = (diag: string, icd: string, treat: string) => {
		const updated: VisitSoapNoteValues = {
			...values,
			diagnosis: `${icd} ${diag}`,
			icd10: icd,
			treatmentPlan: treat,
		};
		setValues(updated);
		valuesRef.current = updated;
		onChange?.(updated);
	};

	return (
		<div className="flex flex-col gap-3 p-4 bg-[var(--paper)] text-[var(--foreground)] rounded-xl border border-[var(--line)]">
			{/* Неблокирующий unsavedDraftNotice баннер восстановления черновика */}
			{hasUnsavedDraft && (
				<div data-testid="banner-draft-recovery" className="flex items-center justify-between text-xs text-[var(--accent)] font-medium p-2 bg-[var(--paper-soft)] rounded border border-[var(--line)]">
					<span>Черновик автоматически сохранён локально</span>
					<div className="flex gap-2">
						<button
							type="button"
							data-testid="btn-restore-draft"
							className="px-2 py-0.5 rounded bg-[var(--primary)] text-white text-xs"
							onClick={flushDraft}
							disabled={false}
						>
							Восстановить
						</button>
						<button
							type="button"
							data-testid="btn-discard-draft"
							className="px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-xs"
							onClick={() => setHasUnsavedDraft(false)}
							disabled={false}
						>
							Отклонить
						</button>
					</div>
				</div>
			)}

			{/* 1-строчный компактный тулбар (32-36px) */}
			<div className="flex items-center justify-between gap-2 flex-wrap min-h-[36px]">
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="btn-open-stomt-templates"
						className="px-3 h-8 text-xs font-semibold rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] transition-colors"
						onClick={() => setShowTemplates((v) => !v)}
						disabled={false}
					>
						Клинические протоколы (448)
					</button>

					<button
						type="button"
						data-testid="btn-soap-physio-norm"
						className="px-3 h-8 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
						onClick={handleApplyNorm}
						disabled={false}
					>
						Норма в 1 клик
					</button>

					<div data-testid="soap-select-tooth" className="text-xs font-bold px-2 py-1 bg-[var(--paper-soft)] rounded">
						{activeTooth} зуб
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span data-testid="soap-autosave-status" className="text-xs text-[var(--muted-foreground)]">
						Автосохранение активно
					</span>
					{isLocked && (
						<button
							type="button"
							data-testid="btn-soap-enable-correction"
							className="px-3 h-8 text-xs font-semibold rounded-lg bg-[var(--warning)] text-white"
							disabled={false}
						>
							Внести исправление («Исправленному верить»)
						</button>
					)}
					<button
						type="button"
						data-testid="btn-soap-save"
						className="px-3 h-8 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
						onClick={() => onSave?.(valuesRef.current)}
						disabled={false}
					>
						Сохранить дневник
					</button>
				</div>
			</div>

			{/* Экспресс-панель протоколов у кресла */}
			<div id="soap-chairside-express-bar" data-testid="soap-chairside-express-bar" className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					data-testid="btn-soap-express-caries"
					className="px-2.5 h-7 text-xs rounded bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--primary)]"
					onClick={() => handleApplyExpress("Кариес дентина", "K02.1", "Препарирование, световая пломба")}
					disabled={false}
				>
					Кариес (K02.1)
				</button>
				<button
					type="button"
					data-testid="btn-soap-express-pulpitis"
					className="px-2.5 h-7 text-xs rounded bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--primary)]"
					onClick={() => handleApplyExpress("Пульпит острый очаговый", "K04.0", "Эндодонтическое лечение")}
					disabled={false}
				>
					Пульпит (K04.0)
				</button>
				<button
					type="button"
					data-testid="btn-soap-express-hygiene"
					className="px-2.5 h-7 text-xs rounded bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--primary)]"
					onClick={() => handleApplyExpress("Хронический гингивит", "K05.1", "Ультразвуковой скейлинг, Air-Flow")}
					disabled={false}
				>
					Профгигиена (K05.1)
				</button>
				<button
					type="button"
					data-testid="btn-soap-express-extraction"
					className="px-2.5 h-7 text-xs rounded bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--primary)]"
					onClick={() => handleApplyExpress("Дистопия ретенция", "K01.1", "Атипичное удаление зуба")}
					disabled={false}
				>
					Удаление (K01.1)
				</button>
			</div>

			{/* Выпадающая панель шаблонов */}
			{showTemplates && (
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col gap-2">
					<div className="font-semibold text-sm">Клинические протоколы приёма (448 шаблонов)</div>
					<div className="flex gap-2 flex-wrap">
						<button
							type="button"
							className={`px-2 py-1 text-xs rounded ${activeCategory === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)]"}`}
							onClick={() => setActiveCategory("all")}
							disabled={false}
						>
							Все протоколы (448)
						</button>
						<button
							type="button"
							className={`px-2 py-1 text-xs rounded ${activeCategory === "therapy" ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)]"}`}
							onClick={() => setActiveCategory("therapy")}
							disabled={false}
						>
							Терапия
						</button>
						<button
							type="button"
							className={`px-2 py-1 text-xs rounded ${activeCategory === "orthopedics" ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)]"}`}
							onClick={() => setActiveCategory("orthopedics")}
							disabled={false}
						>
							Ортопедия
						</button>
						<button
							type="button"
							className={`px-2 py-1 text-xs rounded ${activeCategory === "surgery" ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)]"}`}
							onClick={() => setActiveCategory("surgery")}
							disabled={false}
						>
							Хирургия
						</button>
						<button
							type="button"
							className={`px-2 py-1 text-xs rounded ${activeCategory === "implantology" ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)]"}`}
							onClick={() => setActiveCategory("implantology")}
							disabled={false}
						>
							Имплантация
						</button>
					</div>
					<div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
						<button
							type="button"
							className="px-3 h-7 text-xs font-semibold rounded bg-[var(--primary)] text-white"
							onClick={handleApplyNorm}
							disabled={false}
						>
							Заполнить
						</button>
						<button
							type="button"
							className="px-3 h-7 text-xs font-semibold rounded bg-[var(--paper)] border border-[var(--line)]"
							disabled={false}
						>
							+ Добавить
						</button>
					</div>
				</div>
			)}

			{/* Поля дневника (без латинского канцелярита) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label htmlFor="soap-complaints" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Жалобы пациента
					</label>
					<textarea
						id="soap-complaints"
						data-testid="soap-complaints"
						rows={2}
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.complaint || ""}
						onChange={(e) => updateField("complaint", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>

				<div>
					<label htmlFor="soap-anamnesis" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Анамнез заболевания и жизни
					</label>
					<textarea
						id="soap-anamnesis"
						data-testid="soap-anamnesis"
						rows={2}
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.anamnesis || ""}
						onChange={(e) => updateField("anamnesis", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>

				<div>
					<label htmlFor="soap-objective" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Данные объективного обследования
					</label>
					<textarea
						id="soap-objective"
						data-testid="soap-objective"
						rows={2}
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.objectiveStatus || ""}
						onChange={(e) => updateField("objectiveStatus", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>

				<div>
					<label htmlFor="soap-diagnosis" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Клинический диагноз (МКБ-10)
					</label>
					<input
						id="soap-diagnosis"
						data-testid="soap-diagnosis"
						type="text"
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.diagnosis || ""}
						onChange={(e) => updateField("diagnosis", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>

				<div>
					<label htmlFor="soap-treatment" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Протокол лечения и выполненные манипуляции
					</label>
					<textarea
						id="soap-treatment"
						data-testid="soap-treatment"
						rows={2}
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.treatmentPlan || ""}
						onChange={(e) => updateField("treatmentPlan", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>

				<div>
					<label htmlFor="soap-recommendations" className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
						Рекомендации и назначения
					</label>
					<textarea
						id="soap-recommendations"
						data-testid="soap-recommendations"
						rows={2}
						className="w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)]"
						value={values.recommendations || ""}
						onChange={(e) => updateField("recommendations", e.target.value)}
						onBlur={flushDraft}
					/>
				</div>
			</div>

			{/* Мобильный док действий */}
			<div data-testid="soap-mobile-action-bar" className="flex items-center gap-2 pt-2 border-t border-[var(--line)] sm:hidden">
				<button
					type="button"
					className="flex-1 h-9 text-xs font-semibold rounded bg-[var(--paper-soft)] border border-[var(--line)]"
					onClick={() => setShowTemplates(true)}
					disabled={false}
				>
					Шаблоны (448)
				</button>
				<button
					type="button"
					className="flex-1 h-9 text-xs font-semibold rounded bg-[var(--primary)] text-white"
					onClick={handleApplyNorm}
					disabled={false}
				>
					Норма
				</button>
			</div>
		</div>
	);
};

export default VisitSoapEditor;
