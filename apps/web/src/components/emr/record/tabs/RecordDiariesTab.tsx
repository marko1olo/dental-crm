/**
 * apps/web/src/components/emr/record/tabs/RecordDiariesTab.tsx
 *
 * Дневники клинических приёмов (SOAP) медицинской карты приёма DENTE CRM.
 * Автономия врача, Соло-врач, Чистый живой доменный язык.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
	Calendar,
	Sparkles,
	ShieldCheck,
	Plus,
	Copy,
	Check,
	Tag,
	Edit3,
} from "lucide-react";
import type { MedicalRecordData, ClinicalVisitDiaryEntry, Form043VisitDiaryEntry } from "../../types/recordDataTypes";
import { RecordNewDiaryInlineForm } from "./RecordNewDiaryInlineForm";

export interface RecordDiariesTabProps {
	readonly formData: MedicalRecordData;
	readonly onOpenProtocolGenerator?: (() => void) | undefined;
	readonly onOpenInternalProtocolGenerator: () => void;
	readonly onAddDiary?: ((entry: ClinicalVisitDiaryEntry) => void) | undefined;
	readonly onDeleteDiary?: ((index: number) => void) | undefined;
}

export type MedicalRecordDiariesTabProps = RecordDiariesTabProps;

const COMMON_TEETH = [16, 26, 36, 46, 11, 21, 14, 24] as const;

export const RecordDiariesTab: React.FC<RecordDiariesTabProps> = React.memo(
	function RecordDiariesTab({
		formData,
		onOpenProtocolGenerator,
		onOpenInternalProtocolGenerator,
		onAddDiary,
	}) {
		const cardKey = formData.passport.medicalCardNumber || formData.passport.patientFullName || "common";
		const draftStorageKey = `dente:record_diary_draft:${cardKey}`;

		const [selectedTooth, setSelectedTooth] = useState<string>("16");
		const [subjective, setSubjective] = useState<string>("");
		const [objective, setObjective] = useState<string>("");
		const [diagnosisText, setDiagnosisText] = useState<string>("");
		const [icd10Code, setIcd10Code] = useState<string>("K02.1");
		const [protocol, setProtocol] = useState<string>("");
		const [anesthesia, setAnesthesia] = useState<string>("");
		const [materials, setMaterials] = useState<string>("");
		const [isFormOpen, setIsFormOpen] = useState<boolean>(() => formData.visitDiaries.length === 0);
		const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
		const [editingDiaryIndex, setEditingDiaryIndex] = useState<number | null>(null);

		const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		// Восстановление черновика при монтировании (Zero Keystroke Loss)
		useEffect(() => {
			try {
				if (typeof sessionStorage !== "undefined") {
					const saved = sessionStorage.getItem(draftStorageKey);
					if (saved) {
						const parsed = JSON.parse(saved);
						if (parsed.subjective) setSubjective(parsed.subjective);
						if (parsed.objective) setObjective(parsed.objective);
						if (parsed.diagnosisText) setDiagnosisText(parsed.diagnosisText);
						if (parsed.icd10Code) setIcd10Code(parsed.icd10Code);
						if (parsed.protocol) setProtocol(parsed.protocol);
						if (parsed.anesthesia) setAnesthesia(parsed.anesthesia);
						if (parsed.materials) setMaterials(parsed.materials);
						if (parsed.selectedTooth) setSelectedTooth(parsed.selectedTooth);
						setIsFormOpen(true);
					}
				}
			} catch (error) {
				console.warn("[RecordDiariesTab] Не удалось восстановить черновик из sessionStorage:", error);
			}
		}, [draftStorageKey]);

		// Debounced автосохранение черновика на лету
		const triggerAutosave = useCallback(
			(state: {
				subjective: string;
				objective: string;
				diagnosisText: string;
				icd10Code: string;
				protocol: string;
				anesthesia: string;
				materials: string;
				selectedTooth: string;
			}) => {
				if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
				autosaveTimerRef.current = setTimeout(() => {
					try {
						if (typeof sessionStorage !== "undefined") {
							sessionStorage.setItem(draftStorageKey, JSON.stringify(state));
						}
					} catch (error) {
						console.warn("[RecordDiariesTab] Ошибка сохранения черновика в sessionStorage:", error);
					}
				}, 600);
			},
			[draftStorageKey],
		);

		useEffect(() => {
			return () => {
				if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
			};
		}, []);

		const handleApplyNorm = useCallback(() => {
			const normState = {
				subjective: "Жалоб на момент осмотра не предъявляет. Плановый профилактический осмотр.",
				objective: `Зуб ${selectedTooth}: коронковая часть интактна, анатомическая форма сохранена, фиссуры пигментированы в пределах нормы. Слизистая бледно-розовая, перкуссия безболезненная.`,
				diagnosisText: "Стоматологическое обследование и физиологическая норма",
				icd10Code: "Z01.2",
				protocol: "Проведен визуальный и инструментальный осмотр полости рта, зондирование и перкуссия. Патологических изменений твердых тканей зуба и пародонта не выявлено. Гигиена удовлетворительная.",
				anesthesia: "Не проводилась (не требуется)",
				materials: "Не применялись",
				selectedTooth,
			};
			setSubjective(normState.subjective);
			setObjective(normState.objective);
			setDiagnosisText(normState.diagnosisText);
			setIcd10Code(normState.icd10Code);
			setProtocol(normState.protocol);
			setAnesthesia(normState.anesthesia);
			setMaterials(normState.materials);
			setIsFormOpen(true);
			triggerAutosave(normState);
		}, [selectedTooth, triggerAutosave]);

		const handleClearDraft = useCallback(() => {
			setSubjective("");
			setObjective("");
			setDiagnosisText("");
			setProtocol("");
			setAnesthesia("");
			setMaterials("");
			try {
				if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(draftStorageKey);
			} catch (error) {
				console.warn("[RecordDiariesTab] Ошибка очистки черновика из sessionStorage:", error);
			}
		}, [draftStorageKey]);

		const handleSaveNewDiary = useCallback(() => {
			if (!protocol.trim() && !subjective.trim() && !objective.trim()) {
				return;
			}
			const now = new Date();
			const entryDate = now.toISOString().slice(0, 10);
			const entryTime = now.toTimeString().slice(0, 5);

			if (editingDiaryIndex !== null) {
				const existing = formData.visitDiaries[editingDiaryIndex];
				const dateStamp = now.toLocaleDateString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
				const updatedProtocol = protocol
					? `${protocol}\n\n[Исправленному верить: ${dateStamp}]`
					: existing?.procedureProtocol || "";
				const revisedEntry: ClinicalVisitDiaryEntry = {
					...existing,
					toothNumber: selectedTooth ? String(selectedTooth) : existing?.toothNumber || "16",
					subjectiveComplaints: subjective || existing?.subjectiveComplaints || "Жалоб нет",
					objectiveStatusLocalis: objective || existing?.objectiveStatusLocalis || "Статус без патологии",
					assessmentDiagnosisText: diagnosisText || existing?.assessmentDiagnosisText || "Клинический осмотр",
					assessmentIcd10Code: icd10Code || existing?.assessmentIcd10Code || "Z01.2",
					procedureProtocol: updatedProtocol,
					anesthesiaDetails: anesthesia || existing?.anesthesiaDetails,
					appliedMaterials: materials || existing?.appliedMaterials,
				};
				formData.visitDiaries[editingDiaryIndex] = revisedEntry;
				setEditingDiaryIndex(null);
			} else {
				const newEntry: ClinicalVisitDiaryEntry = {
					id: `diary_${Date.now()}`,
					entryDate,
					entryTime,
					toothNumber: selectedTooth ? String(selectedTooth) : "16",
					doctorFullName: formData.passport.attendingDoctorFullName || "Лечащий врач",
					doctorSpecialty: formData.passport.attendingDoctorSpecialty || "Врач-стоматолог-терапевт",
					subjectiveComplaints: subjective || "Жалоб нет",
					objectiveStatusLocalis: objective || "Статус без патологии",
					assessmentDiagnosisText: diagnosisText || "Клинический осмотр",
					assessmentIcd10Code: icd10Code || "Z01.2",
					procedureProtocol: protocol || "Проведен осмотр",
					anesthesiaDetails: anesthesia || undefined,
					appliedMaterials: materials || undefined,
				};

				if (onAddDiary) {
					onAddDiary(newEntry);
				} else {
					formData.visitDiaries.unshift(newEntry);
				}
			}

			handleClearDraft();
			setIsFormOpen(false);
		}, [
			protocol,
			subjective,
			objective,
			selectedTooth,
			formData,
			diagnosisText,
			icd10Code,
			anesthesia,
			materials,
			editingDiaryIndex,
			onAddDiary,
			handleClearDraft,
		]);

		const handleCopyDiaryText = useCallback((diary: ClinicalVisitDiaryEntry, idx: number) => {
			const text = `Визит от ${diary.entryDate} ${diary.entryTime ? `в ${diary.entryTime}` : ""}, Зуб FDI: ${diary.toothNumber || "общий"}
Врач: ${diary.doctorFullName}
S: ${diary.subjectiveComplaints}
O: ${diary.objectiveStatusLocalis}
A: ${diary.assessmentDiagnosisText} [${diary.assessmentIcd10Code}]
P: ${diary.procedureProtocol}
${diary.anesthesiaDetails ? `Анестезия: ${diary.anesthesiaDetails}\n` : ""}${diary.appliedMaterials ? `Материалы: ${diary.appliedMaterials}\n` : ""}`;

			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(text).then(() => {
					setCopiedIndex(idx);
					setTimeout(() => setCopiedIndex(null), 2000);
				}).catch((error) => {
					console.warn("[RecordDiariesTab] Ошибка копирования в буфер обмена:", error);
				});
			}
		}, []);

		const handleStartEditDiary = useCallback((diary: ClinicalVisitDiaryEntry, idx: number) => {
			setSelectedTooth(diary.toothNumber || "16");
			setSubjective(diary.subjectiveComplaints || "");
			setObjective(diary.objectiveStatusLocalis || "");
			setDiagnosisText(diary.assessmentDiagnosisText || "");
			setIcd10Code(diary.assessmentIcd10Code || "K02.1");
			setProtocol(diary.procedureProtocol || "");
			setAnesthesia(diary.anesthesiaDetails || "");
			setMaterials(diary.appliedMaterials || "");
			setEditingDiaryIndex(idx);
			setIsFormOpen(true);
		}, []);

		return (
			<div className="max-w-full overflow-x-clip">
				<div className="emr-studio-card emr-studio-section-card">
					{/* Header toolbar */}
					<div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
						<h3 className="emr-studio-card-title emr-studio-section-card-title m-0 flex items-center gap-2">
							<Calendar className="w-4 h-4 text-sky-600" />
							<span>4. Дневники визитов (Медицинская карта приёма)</span>
						</h3>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								className="dente-btn dente-btn-secondary touch-manipulation min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
								onClick={() => setIsFormOpen((prev) => !prev)}
								data-testid="btn-toggle-inline-diary-form"
							>
								<Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
								<span>{isFormOpen ? "Свернуть форму" : "+ Быстрая запись"}</span>
							</button>

							<button
								type="button"
								className="dente-btn dente-btn-secondary touch-manipulation min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
								onClick={() => (onOpenProtocolGenerator ? onOpenProtocolGenerator() : onOpenInternalProtocolGenerator())}
								data-testid="btn-emr-synthesize-diary"
								title="Сформировать дневник по МКБ-10 и шаблонам СтАР"
							>
								<Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-300" />
								<span>Шаблоны протоколов СтАР</span>
							</button>
						</div>
					</div>

					{/* Быстрая форма добавления записи приёма */}
					{isFormOpen && (
						<div className="mb-4 space-y-2">
							<div className="flex items-center justify-between pb-1 border-b border-[var(--line,#e2e8f0)]">
								<span className="text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-1.5">
									{editingDiaryIndex !== null ? (
										<>
											<Edit3 className="w-3.5 h-3.5 text-amber-600" />
											<span>Редактирование визита #{formData.visitDiaries.length - editingDiaryIndex} («Исправленному верить»)</span>
										</>
									) : (
										<>
											<Sparkles className="w-3.5 h-3.5" />
											<span>Клинический протокол приёма (SOAP) • 448 шаблонов СтАР</span>
										</>
									)}
								</span>
							</div>

							<RecordNewDiaryInlineForm
								selectedTooth={selectedTooth}
								setSelectedTooth={(tooth) => {
									setSelectedTooth(tooth);
									triggerAutosave({ subjective, objective, diagnosisText, icd10Code, protocol, anesthesia, materials, selectedTooth: tooth });
								}}
								commonTeeth={COMMON_TEETH}
								subjective={subjective}
								setSubjective={(val) => {
									setSubjective(val);
									triggerAutosave({ subjective: val, objective, diagnosisText, icd10Code, protocol, anesthesia, materials, selectedTooth });
								}}
								objective={objective}
								setObjective={(val) => {
									setObjective(val);
									triggerAutosave({ subjective, objective: val, diagnosisText, icd10Code, protocol, anesthesia, materials, selectedTooth });
								}}
								diagnosisText={diagnosisText}
								setDiagnosisText={(val) => {
									setDiagnosisText(val);
									triggerAutosave({ subjective, objective, diagnosisText: val, icd10Code, protocol, anesthesia, materials, selectedTooth });
								}}
								icd10Code={icd10Code}
								setIcd10Code={(val) => {
									setIcd10Code(val);
									triggerAutosave({ subjective, objective, diagnosisText, icd10Code: val, protocol, anesthesia, materials, selectedTooth });
								}}
								protocol={protocol}
								setProtocol={(val) => {
									setProtocol(val);
									triggerAutosave({ subjective, objective, diagnosisText, icd10Code, protocol: val, anesthesia, materials, selectedTooth });
								}}
								onApplyNorm={handleApplyNorm}
								onClear={handleClearDraft}
								onSave={handleSaveNewDiary}
							/>
						</div>
					)}

					{/* Список уже существующих записей визитов */}
					{formData.visitDiaries.map((diary, index) => (
						<div key={diary.id || index} className="emr-studio-soap-card">
							<div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-[var(--glass-border,#e2e8f0)] flex-wrap gap-2">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="emr-studio-soap-badge">Визит #{formData.visitDiaries.length - index}</span>
									<strong>{diary.entryDate}</strong> {diary.entryTime ? `в ${diary.entryTime}` : ""}
									{diary.toothNumber && (
										<span className="inline-flex items-center gap-1 font-semibold text-[var(--teal,#0d9488)] text-xs ml-1">
											<Tag className="w-3 h-3" />
											Зуб FDI № {diary.toothNumber}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
									<span>Врач: <strong>{diary.doctorFullName}</strong></span>
									<button
										type="button"
										onClick={() => handleStartEditDiary(diary, index)}
										className="dente-btn dente-btn-secondary p-1 rounded font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
										title="Внести исправление в протокол («Исправленному верить»)"
										data-testid={`btn-revise-diary-${index}`}
									>
										<Edit3 className="w-3.5 h-3.5" />
										<span>Исправить</span>
									</button>
									<button
										type="button"
										onClick={() => handleCopyDiaryText(diary, index)}
										className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
										title="Скопировать текст дневника"
										data-testid={`btn-copy-diary-${index}`}
									>
										{copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
									</button>
								</div>
							</div>
							<div className="mb-1.5 text-xs">
								<span className="font-bold text-[var(--teal,#0d9488)]">S (Жалобы):</span> {diary.subjectiveComplaints}
							</div>
							<div className="mb-1.5 text-xs">
								<span className="font-bold text-[var(--teal,#0d9488)]">O (Осмотр):</span> {diary.objectiveStatusLocalis}
								{diary.eodMicroamperes ? ` [ЭОД: ${diary.eodMicroamperes} мкА]` : ""}
							</div>
							<div className="mb-1.5 text-xs">
								<span className="font-bold text-[var(--teal,#0d9488)]">A (Диагноз):</span> <strong>{diary.assessmentDiagnosisText}</strong> [{diary.assessmentIcd10Code}]
							</div>
							<div className="mb-1.5 text-xs">
								<span className="font-bold text-[var(--teal,#0d9488)]">P (Лечение):</span> {diary.procedureProtocol}
							</div>
							{diary.anesthesiaDetails && (
								<div className="text-[11px] text-[var(--muted,#64748b)] mb-1">• Анестезия: {diary.anesthesiaDetails}</div>
							)}
							{diary.appliedMaterials && (
								<div className="text-[11px] text-[var(--muted,#64748b)] mb-1">• Материалы: {diary.appliedMaterials}</div>
							)}
							{diary.digitalSignatureHash && (
								<div className="mt-2 text-[11px] text-[var(--ok-fg,#15803d)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5" />
									<span>Заверено УКЭП: {diary.digitalSignatureHash.slice(0, 20)}…</span>
								</div>
							)}
						</div>
					))}

					{formData.visitDiaries.length === 0 && !isFormOpen && (
						<div className="p-8 text-center text-xs text-[var(--muted,#64748b)] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
							<Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-600" />
							<p className="font-semibold text-sm text-slate-700 dark:text-slate-300 m-0">Дневники приёма пока не добавлены</p>
							<p className="mt-1 text-slate-500">Добавьте запись через быструю форму выше или сформируйте по клиническим протоколам СтАР.</p>
						</div>
					)}
				</div>
			</div>
		);
	},
);

export const MedicalRecordDiariesTab = RecordDiariesTab;
