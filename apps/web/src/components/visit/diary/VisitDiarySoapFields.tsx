import React from "react";
import {
	Stethoscope,
	Search,
	FileText,
	AlertTriangle,
	Sparkles,
	Check,
	Plus,
	X,
} from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { VisitDiaryPhotoUpload, type DiaryPrintPhoto } from "../../VisitDiaryPhotoUpload";
import { COMPLAINT_QUICK_CHIPS } from "./visitDiaryTypes";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { getIcdColor, ICD_GROUP_COLORS, ICD10_DICTIONARY } from "../../../lib/icd10";
import {
	appendRecommendationToSoap,
	PATIENT_RECOMMENDATIONS,
} from "../../../lib/clinicalProtocols043";

export interface VisitDiarySoapFieldsProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly fieldInterimMap: {
		readonly anamnesis?: string;
		readonly statusLocalis?: string;
		readonly treatmentDescription?: string;
		readonly complications?: string;
	};
	readonly setFieldInterimMap: React.Dispatch<
		React.SetStateAction<{
			anamnesis?: string;
			statusLocalis?: string;
			treatmentDescription?: string;
			complications?: string;
		}>
	>;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly handleAutoResize: (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => void;
	readonly handleAddComplaintChip: (chipText: string) => void;
	readonly icdRef: React.RefObject<HTMLDivElement | null>;
	readonly icdSearch: string;
	readonly setIcdSearch: (val: string) => void;
	readonly showIcdDropdown: boolean;
	readonly setShowIcdDropdown: (val: boolean) => void;
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly handleIcdSelect: (code: string) => void;
	readonly commitIcdInput: () => void;
	readonly visitId: string;
	readonly diaryId?: string | null;
	readonly isLocked: boolean;
	readonly handlePrintPhotosChange: (photos: readonly DiaryPrintPhoto[]) => void;
}

export function VisitDiarySoapFields({
	diary,
	setDiary,
	fieldsDisabled,
	fieldInterimMap,
	setFieldInterimMap,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
	handleAutoResize,
	handleAddComplaintChip,
	icdRef,
	icdSearch,
	setIcdSearch,
	showIcdDropdown,
	setShowIcdDropdown,
	filteredIcd,
	handleIcdSelect,
	commitIcdInput,
	visitId,
	diaryId,
	isLocked,
	handlePrintPhotosChange,
}: VisitDiarySoapFieldsProps) {
	return (
		<div className="vde-043__grid">
			{/* I — Жалобы и анамнез */}
			<div className="vde-043__field">
				<label className="vde-043__label" htmlFor="diary-anamnesis">
					<Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
					<span className="vde-043__letter vde-043__letter--s">I</span> —
					Жалобы и анамнез
					{!fieldsDisabled && (
						<div className="vde-043__label-mic">
							<SmartMicrophoneButton
								context="visit"
								sterileMode={false}
								className="p-1"
								title="Диктовать жалобы (Gemini Live VAD)"
								onInterim={(interim) => {
									setFieldInterimMap((p) => ({ ...p, anamnesis: interim }));
								}}
								onResult={(text) => {
									ensureRevisingIfLocked();
									setDiary((p) => ({
										...p,
										anamnesis: p.anamnesis ? `${p.anamnesis} ${text}` : text,
									}));
									setFieldInterimMap((p) => ({ ...p, anamnesis: "" }));
									scheduleDebouncedSave();
								}}
							/>
						</div>
					)}
				</label>
				<textarea
					id="diary-anamnesis"
					disabled={fieldsDisabled}
					className="auto-resize-ta vde-043__ta"
					value={diary.anamnesis}
					onChange={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
						setDiary((p) => ({ ...p, anamnesis: e.target.value }));
						scheduleDebouncedSave();
					}}
					onFocus={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
					}}
					placeholder="Жалобы пациента, история заболевания, соматический статус и анамнез..."
				/>
				{COMPLAINT_QUICK_CHIPS.length > 0 && (
					<div
						className="mt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full flex-nowrap touch-pan-x"
						data-testid="complaint-quick-chips-bar"
					>
						<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 shrink-0">
							<Sparkles className="w-3 h-3 text-[var(--teal,var(--brand-primary))]" />
							Быстрые жалобы:
						</span>
						{COMPLAINT_QUICK_CHIPS.map((chipText) => {
							const isApplied = (diary.anamnesis ?? "").includes(chipText);
							return (
								<button
									key={chipText}
									type="button"
									onClick={() => handleAddComplaintChip(chipText)}
									disabled={fieldsDisabled}
									className={`text-xs min-h-[36px] px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 select-none shrink-0 ${
										isApplied
											? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold"
											: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
									}`}
									title={
										isApplied
											? `Жалоба уже внесена: «${chipText}»`
											: `Внести в анамнез: «${chipText}»`
									}
									data-testid={`complaint-chip-${chipText}`}
								>
									{chipText}
									{isApplied ? (
										<Check className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
									) : (
										<Plus className="w-3 h-3 opacity-60 shrink-0" />
									)}
								</button>
							);
						})}
					</div>
				)}
				{fieldInterimMap.anamnesis && (
					<div
						className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
						data-testid="interim-text-anamnesis"
					>
						<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
						<span className="font-bold shrink-0">AI Диктовка (Анамнез):</span>
						<span className="truncate">«{fieldInterimMap.anamnesis}»</span>
					</div>
				)}
			</div>

			{/* II — Объективно */}
			<div className="vde-043__field">
				<label className="vde-043__label" htmlFor="diary-status-localis">
					<Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
					<span className="vde-043__letter vde-043__letter--o">II</span> —
					Осмотр и зубная формула
					{!fieldsDisabled && (
						<div className="vde-043__label-mic">
							<SmartMicrophoneButton
								context="visit"
								sterileMode={false}
								className="p-1"
								title="Диктовать объективный статус (Gemini Live VAD)"
								onInterim={(interim) => {
									setFieldInterimMap((p) => ({ ...p, statusLocalis: interim }));
								}}
								onResult={(text) => {
									ensureRevisingIfLocked();
									setDiary((p) => ({
										...p,
										statusLocalis: p.statusLocalis
											? `${p.statusLocalis} ${text}`
											: text,
									}));
									setFieldInterimMap((p) => ({ ...p, statusLocalis: "" }));
									scheduleDebouncedSave();
								}}
							/>
						</div>
					)}
				</label>
				<textarea
					id="diary-status-localis"
					disabled={fieldsDisabled}
					className="auto-resize-ta vde-043__ta"
					value={diary.statusLocalis}
					onChange={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
						setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
						scheduleDebouncedSave();
					}}
					onFocus={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
					}}
					placeholder="Внешний осмотр, перкуссия, пальпация, ЭОД, рентген..."
				/>
				{fieldInterimMap.statusLocalis && (
					<div
						className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
						data-testid="interim-text-status-localis"
					>
						<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
						<span className="font-bold shrink-0">AI Диктовка (Статус):</span>
						<span className="truncate">«{fieldInterimMap.statusLocalis}»</span>
					</div>
				)}
			</div>

			{/* III — Диагноз */}
			<div className="vde-043__assessment">
				<div className="vde-043__assessment-grid">
					<div className="vde-043__field" ref={icdRef}>
						<label className="vde-043__label" htmlFor="diary-icd-search">
							<span className="vde-043__letter vde-043__letter--a">III</span> —
							Диагноз МКБ-10
						</label>
						{diary.diagnosisIcd10 ? (
							<div
								className={`vde-043__icd-chip min-h-[44px] min-w-0 break-words ${getIcdColor(diary.diagnosisIcd10)}`}
							>
								<span className="vde-043__icd-code shrink-0">
									{diary.diagnosisIcd10}
								</span>
								<span className="flex-1 min-w-0 break-words">
									{ICD10_DICTIONARY.find(
										(i) => i.code === diary.diagnosisIcd10,
									)?.label ?? "Диагноз выбран"}
								</span>
								{!fieldsDisabled && (
									<button
										type="button"
										onClick={() => {
											ensureRevisingIfLocked();
											setDiary((p) => ({ ...p, diagnosisIcd10: "" }));
											setIcdSearch("");
											scheduleDebouncedSave();
										}}
										className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon shrink-0"
										title="Сбросить диагноз"
										aria-label="Сбросить диагноз МКБ-10"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						) : (
							<div className="vde-043__icd-search-wrap">
								<Search className="w-4 h-4 vde-043__icd-search-icon" />
								<input
									id="diary-icd-search"
									disabled={fieldsDisabled}
									className="vde-043__input vde-043__icd-input min-h-[44px]"
									value={icdSearch}
									onChange={(e) => {
										ensureRevisingIfLocked();
										setIcdSearch(e.target.value);
										setShowIcdDropdown(true);
									}}
									onFocus={() => {
										ensureRevisingIfLocked();
										setShowIcdDropdown(true);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											commitIcdInput();
										}
									}}
									onBlur={() => {
										window.setTimeout(() => {
											commitIcdInput();
											setShowIcdDropdown(false);
										}, 120);
									}}
									placeholder="K02.1 Кариес... или введите название"
								/>
								{showIcdDropdown && filteredIcd.length > 0 && (
									<div className="vde-043__icd-drop">
										{(filteredIcd ?? []).map((icd) => (
											<div
												key={icd.code}
												className="vde-043__icd-opt min-h-[44px] min-w-0"
												role="option"
												aria-selected={false}
												tabIndex={0}
												onMouseDown={(e) => {
													e.preventDefault();
													handleIcdSelect(icd.code);
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleIcdSelect(icd.code);
													}
												}}
											>
												<span
													className={`vde-043__icd-opt-code shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
												>
													{icd.code}
												</span>
												<div className="flex-1 min-w-0 break-words">
													<div className="vde-043__icd-opt-label break-words whitespace-normal">
														{icd.label}
													</div>
													<div className="vde-043__icd-opt-group break-words">
														{icd.group}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					<div className="vde-043__field">
						<label className="vde-043__label" htmlFor="diary-tooth">
							Зуб
						</label>
						<input
							id="diary-tooth"
							disabled={fieldsDisabled}
							className="vde-043__input vde-043__tooth-input"
							value={diary.diagnosisTooth}
							onChange={(e) => {
								ensureRevisingIfLocked();
								setDiary((p) => ({ ...p, diagnosisTooth: e.target.value }));
								scheduleDebouncedSave();
							}}
							onFocus={() => {
								ensureRevisingIfLocked();
							}}
							placeholder="16, 36..."
							maxLength={32}
						/>
					</div>
				</div>
			</div>

			{/* IV — Лечение и рекомендации */}
			<div className="vde-043__field vde-043__field--span2">
				<label className="vde-043__label" htmlFor="diary-treatment">
					<FileText className="w-3 h-3 text-[var(--teal)]" />
					<span className="vde-043__letter vde-043__letter--p">IV</span> —
					Лечение и рекомендации
					{!fieldsDisabled && (
						<div className="vde-043__label-mic">
							<SmartMicrophoneButton
								context="visit"
								sterileMode={false}
								className="p-1"
								title="Диктовать лечение и протокол (Gemini Live VAD)"
								onInterim={(interim) => {
									setFieldInterimMap((p) => ({ ...p, treatmentDescription: interim }));
								}}
								onResult={(text) => {
									ensureRevisingIfLocked();
									setDiary((p) => ({
										...p,
										treatmentDescription: p.treatmentDescription
											? `${p.treatmentDescription} ${text}`
											: text,
									}));
									setFieldInterimMap((p) => ({ ...p, treatmentDescription: "" }));
									scheduleDebouncedSave();
								}}
							/>
						</div>
					)}
				</label>
				<textarea
					id="diary-treatment"
					disabled={fieldsDisabled}
					className="auto-resize-ta vde-043__ta"
					value={diary.treatmentDescription}
					onChange={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
						setDiary((p) => ({
							...p,
							treatmentDescription: e.target.value,
						}));
						scheduleDebouncedSave();
					}}
					onFocus={(e) => {
						handleAutoResize(e);
						ensureRevisingIfLocked();
					}}
					placeholder="Протокол вмешательства: препарирование, медикаментозная обработка, пломбирование, материалы..."
				/>
				{fieldInterimMap.treatmentDescription && (
					<div
						className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
						data-testid="interim-text-treatment"
					>
						<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
						<span className="font-bold shrink-0">AI Диктовка (Лечение):</span>
						<span className="truncate">«{fieldInterimMap.treatmentDescription}»</span>
					</div>
				)}
				{!fieldsDisabled && (
					<div
						className="mt-2 p-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-soft)] flex flex-col gap-1.5"
						data-testid="patient-recommendations-bar"
					>
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
							1-Click Рекомендации пациенту:
						</span>
						<div className="flex flex-wrap items-center gap-1.5">
							{PATIENT_RECOMMENDATIONS.map((rec) => (
								<button
									key={rec.id}
									type="button"
									onClick={() => {
										ensureRevisingIfLocked();
										setDiary((prev) =>
											appendRecommendationToSoap(prev, rec.text),
										);
										scheduleDebouncedSave();
									}}
									className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--glass-border)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
									title={rec.text}
									data-testid={`rec-btn-${rec.id}`}
								>
									<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span className="min-w-0 break-words">{rec.label}</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Complications */}
			<div className="vde-043__field vde-043__field--span2">
				<label className="vde-043__label" htmlFor="vde-complications">
					<AlertTriangle className="w-3 h-3 text-[var(--bad-fg,#b91c1c)]" />
					Осложнения и сопутствующие заболевания
					{!fieldsDisabled && (
						<div className="vde-043__label-mic">
							<SmartMicrophoneButton
								context="visit"
								sterileMode={false}
								className="p-1"
								title="Диктовать осложнения и анамнез (Gemini Live VAD)"
								onInterim={(interim) => {
									setFieldInterimMap((p) => ({ ...p, complications: interim }));
								}}
								onResult={(text) => {
									ensureRevisingIfLocked();
									setDiary((p) => ({
										...p,
										complications: p.complications
											? `${p.complications} ${text}`
											: text,
									}));
									setFieldInterimMap((p) => ({ ...p, complications: "" }));
									scheduleDebouncedSave();
								}}
							/>
						</div>
					)}
				</label>
				<div className="vde-043__complications-grid">
					<textarea
						id="vde-complications"
						disabled={fieldsDisabled}
						className="auto-resize-ta vde-043__ta vde-043__ta--sm"
						value={diary.complications}
						onChange={(e) => {
							handleAutoResize(e);
							ensureRevisingIfLocked();
							setDiary((p) => ({ ...p, complications: e.target.value }));
							scheduleDebouncedSave();
						}}
						onFocus={(e) => {
							handleAutoResize(e);
							ensureRevisingIfLocked();
						}}
						placeholder="Осложнения лечения..."
					/>
					<textarea
						disabled={fieldsDisabled}
						className="auto-resize-ta vde-043__ta vde-043__ta--sm"
						value={diary.comorbidities}
						onChange={(e) => {
							handleAutoResize(e);
							ensureRevisingIfLocked();
							setDiary((p) => ({ ...p, comorbidities: e.target.value }));
							scheduleDebouncedSave();
						}}
						onFocus={(e) => {
							handleAutoResize(e);
							ensureRevisingIfLocked();
						}}
						placeholder="Сопутствующие заболевания (если есть)..."
					/>
				</div>
				{fieldInterimMap.complications && (
					<div
						className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none mt-1"
						data-testid="interim-text-complications"
					>
						<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
						<span className="font-bold shrink-0">AI Диктовка (Осложнения):</span>
						<span className="truncate">«{fieldInterimMap.complications}»</span>
					</div>
				)}
			</div>

			<VisitDiaryPhotoUpload
				visitId={visitId}
				diaryId={diaryId ?? null}
				isLocked={isLocked}
				onPrintPhotosChange={handlePrintPhotosChange}
			/>
		</div>
	);
}
