import type React from "react";
import type { ProtocolTemplate } from "@dental/shared";
import { Check, ClipboardCheck } from "lucide-react";
import {
	ICD10_CLINICAL_PRESETS,
	PROTOCOL_CLINICAL_SNIPPETS,
	type ProtocolSnippet,
} from "./protocolSnippetHelpers";

export interface SettingsProtocolsEditFormProps {
	readonly editingId: string | null;
	readonly editForm: Partial<ProtocolTemplate>;
	readonly setEditForm: React.Dispatch<
		React.SetStateAction<Partial<ProtocolTemplate>>
	>;
	readonly error: string | null;
	readonly loading: boolean;
	readonly specialtyLabels?: Record<string, string> | undefined;
	readonly onSave: () => void;
	readonly onCancel: () => void;
	readonly onAppendSnippet: (snippet: ProtocolSnippet) => void;
}

export const SettingsProtocolsEditForm: React.FC<
	SettingsProtocolsEditFormProps
> = ({
	editingId,
	editForm,
	setEditForm,
	error,
	loading,
	specialtyLabels,
	onSave,
	onCancel,
	onAppendSnippet,
}) => {
	return (
		<section className="protocol-settings animate-fade-in">
			<div className="import-copy">
				<ClipboardCheck aria-hidden="true" />
				<div>
					<h2>{editingId ? "Редактирование шаблона" : "Новый шаблон"}</h2>
					<p>
						Конструктор протокола Формы 043/у: шаблоны жалоб, дневника, МКБ-10
						и манипуляций.
					</p>
				</div>
			</div>

			{error && (
				<div className="dente-alert dente-alert-danger" role="alert">
					{error}
				</div>
			)}

			<div className="settings-form-grid" style={{ marginTop: "1.5rem" }}>
				<label className="dente-label">
					<span>Название</span>
					<input
						type="text"
						className="dente-input"
						value={editForm.title || ""}
						onChange={(e) =>
							setEditForm((prev) => ({ ...prev, title: e.target.value }))
						}
					/>
				</label>
				<label className="dente-label">
					<span>Специальность</span>
					<select
						className="dente-input"
						value={editForm.specialty || "universal"}
						onChange={(e) =>
							setEditForm((prev) => ({
								...prev,
								// biome-ignore lint/suspicious/noExplicitAny: automated suppression
								specialty: e.target.value as any,
							}))
						}
					>
						{Object.entries((specialtyLabels ?? {}) as Record<string, string>).map(
							([key, label]) => (
								<option key={key} value={key}>
									{label}
								</option>
							),
						)}
					</select>
				</label>
				<label className="dente-label">
					<span>Причина визита (по умолчанию)</span>
					<input
						type="text"
						className="dente-input"
						value={editForm.visitReason || ""}
						onChange={(e) =>
							setEditForm((prev) => ({
								...prev,
								visitReason: e.target.value,
							}))
						}
					/>
				</label>
				<label className="dente-label">
					<span>Длительность (мин)</span>
					<div className="space-y-1.5">
						<input
							type="number"
							className="dente-input"
							value={editForm.defaultDurationMinutes || 30}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									defaultDurationMinutes: parseInt(e.target.value, 10) || 30,
								}))
							}
						/>
						<div className="flex items-center gap-1 flex-wrap">
							{[15, 30, 45, 60, 90, 120].map((mins) => (
								<button
									key={mins}
									type="button"
									onClick={() =>
										setEditForm((prev) => ({
											...prev,
											defaultDurationMinutes: mins,
										}))
									}
									className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
										editForm.defaultDurationMinutes === mins
											? "bg-[var(--teal)] text-white border-[var(--teal)]"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
									}`}
								>
									{mins} мин
								</button>
							))}
						</div>
					</div>
				</label>
			</div>

			<div style={{ marginTop: "1rem" }} className="space-y-4">
				{/* МКБ-10 автоподстановка (быстрый выбор в 1 клик) */}
				<label className="dente-label">
					<div className="flex items-center justify-between flex-wrap gap-1 mb-1.5">
						<span className="font-bold">
							Коды диагнозов МКБ-10 (автоподстановка в дневник 043/у)
						</span>
						<span className="text-[11px] text-[var(--muted)]">
							1 клик для добавления или снятия диагноза
						</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						{ICD10_CLINICAL_PRESETS.map((icd) => {
							const currentHints = editForm.diagnosisHints || [];
							const isSelected = currentHints.includes(icd.code);
							return (
								<button
									key={icd.code}
									type="button"
									onClick={() => {
										const next = isSelected
											? currentHints.filter((c) => c !== icd.code)
											: [...currentHints, icd.code];
										setEditForm((prev) => ({ ...prev, diagnosisHints: next }));
									}}
									className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
										isSelected
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
									}`}
									title={`${icd.code}: ${icd.title}`}
								>
									<span className="font-mono">{icd.code}</span>
									<span className="text-[10px] opacity-90 hidden sm:inline">
										{icd.title}
									</span>
									{isSelected && <Check size={12} className="stroke-[3]" />}
								</button>
							);
						})}
					</div>
				</label>

				{/* Шаблон жалоб с быстрыми сниппетами */}
				<label className="dente-label">
					<div className="flex items-center justify-between flex-wrap gap-1 mb-1">
						<span>Шаблон жалоб (подсказка врачу)</span>
						<div className="flex items-center gap-1 flex-wrap">
							{PROTOCOL_CLINICAL_SNIPPETS.filter(
								(s) => s.targetField === "complaintPrompt",
							).map((s) => (
								<button
									key={s.id}
									type="button"
									onClick={() => onAppendSnippet(s)}
									className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer"
									title="Добавить готовый текст жалоб"
								>
									+ {s.label}
								</button>
							))}
						</div>
					</div>
					<textarea
						className="dente-input"
						rows={3}
						value={editForm.complaintPrompt || ""}
						onChange={(e) =>
							setEditForm((prev) => ({
								...prev,
								complaintPrompt: e.target.value,
							}))
						}
					/>
				</label>

				{/* Шаблон объективного статуса */}
				<label className="dente-label">
					<span>Шаблон объективного статуса</span>
					<textarea
						className="dente-input"
						rows={3}
						value={editForm.objectiveTemplate || ""}
						onChange={(e) =>
							setEditForm((prev) => ({
								...prev,
								objectiveTemplate: e.target.value,
							}))
						}
					/>
				</label>

				{/* Шаблон плана лечения с быстрыми блоками */}
				<label className="dente-label">
					<div className="flex items-center justify-between flex-wrap gap-1 mb-1">
						<span>Шаблон плана лечения и манипуляций (Форма 043/у)</span>
						<span className="text-[11px] text-[var(--muted)]">
							Быстрые протоколы (1 клик):
						</span>
					</div>
					<div className="flex items-center gap-1 flex-wrap p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] mb-2">
						{PROTOCOL_CLINICAL_SNIPPETS.filter(
							(s) => s.targetField === "treatmentPlanTemplate",
						).map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => onAppendSnippet(s)}
								className="px-2 py-1 rounded text-[10px] font-semibold bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer shadow-2xs"
								title={`Вставить: ${s.text}`}
							>
								+ {s.label}
							</button>
						))}
					</div>
					<textarea
						className="dente-input"
						rows={4}
						value={editForm.treatmentPlanTemplate || ""}
						onChange={(e) =>
							setEditForm((prev) => ({
								...prev,
								treatmentPlanTemplate: e.target.value,
							}))
						}
					/>
				</label>
			</div>

			<div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
				<button
					type="button"
					className="primary-button"
					onClick={onSave}
					disabled={loading}
				>
					{loading ? "Сохранение..." : "Сохранить"}
				</button>
				<button
					type="button"
					className="secondary-button"
					onClick={onCancel}
					disabled={loading}
				>
					Отмена
				</button>
			</div>
		</section>
	);
};
