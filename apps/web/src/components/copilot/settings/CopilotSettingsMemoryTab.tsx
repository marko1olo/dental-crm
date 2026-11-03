/**
 * @file CopilotSettingsMemoryTab.tsx
 * @description Long-term clinical memory management tab for DENTE AI Copilot:
 * Doctor clinical preferences, anesthesia protocols, material choices (Mandate 8b <= 200 lines).
 */

import React, { useState } from "react";
import { Brain, Plus, Trash2 } from "lucide-react";
import { useCopilotStore, type AiMemoryFact } from "../../../store/copilotStore";

export interface CopilotSettingsMemoryTabProps {
	onOpenFullMemory?: () => void;
}

export function CopilotSettingsMemoryTab({ onOpenFullMemory }: CopilotSettingsMemoryTabProps) {
	const memoryFacts = useCopilotStore((s) => s.memoryFacts);
	const addMemoryFact = useCopilotStore((s) => s.addMemoryFact);
	const removeMemoryFact = useCopilotStore((s) => s.removeMemoryFact);

	const [newFactText, setNewFactText] = useState("");
	const [category, setCategory] = useState<AiMemoryFact["category"]>("materials");

	const handleAdd = () => {
		if (!newFactText.trim()) return;
		addMemoryFact(category, newFactText);
		setNewFactText("");
	};

	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-memory-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start justify-between gap-2.5">
				<div className="flex items-start gap-2.5">
					<Brain size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
					<div>
						<div className="font-bold text-[var(--ink)]">Долгосрочная клиническая память врача</div>
						<p className="text-[11px] text-[var(--muted)] leading-relaxed">
							ИИ запоминает ваши клинические протоколы, используемые бонды и анестетики, формируя дневники по вашему персональному стилю.
						</p>
					</div>
				</div>
				{onOpenFullMemory && (
					<button
						type="button"
						onClick={onOpenFullMemory}
						className="secondary-button text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] shrink-0 cursor-pointer"
					>
						Открыть в студии
					</button>
				)}
			</div>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<div className="font-bold text-[var(--ink)]">Добавить клиническое предпочтение:</div>
				<div className="flex flex-col sm:flex-row gap-2">
					<select
						value={category}
						onChange={(e) => setCategory(e.target.value as AiMemoryFact["category"])}
						className="h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)] shrink-0"
					>
						<option value="materials">Материалы</option>
						<option value="anesthesia">Анестезия</option>
						<option value="protocols">Протоколы</option>
						<option value="equipment">Оборудование</option>
						<option value="custom">Другое</option>
					</select>
					<input
						type="text"
						value={newFactText}
						onChange={(e) => setNewFactText(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
						placeholder="Например: Любимый композит светового отверждения Harmonize A2..."
						className="flex-1 h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
					<button
						type="button"
						onClick={handleAdd}
						className="h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hover:opacity-90"
					>
						<Plus size={14} />
						<span>Добавить</span>
					</button>
				</div>
			</section>

			<section className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[var(--ink)]">Сохраненные правила и привычки ({memoryFacts.length}):</span>
				</div>
				<div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
					{memoryFacts.length === 0 ? (
						<div className="p-4 text-center text-[var(--muted)] text-xs border border-dashed border-[var(--line)] rounded-xl">
							Клиническая память пока пуста. Добавьте любимые материалы или анестетики.
						</div>
					) : (
						memoryFacts.map((fact) => (
							<div
								key={fact.id}
								className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-start justify-between gap-2"
							>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] uppercase">
											{fact.category}
										</span>
										<span className="text-[10px] text-[var(--muted)]">{fact.createdAt}</span>
									</div>
									<p className="mt-1 text-xs text-[var(--ink)] leading-relaxed">{fact.fact}</p>
								</div>
								<button
									type="button"
									onClick={() => removeMemoryFact(fact.id)}
									className="text-[var(--muted)] hover:text-rose-500 p-1 rounded cursor-pointer shrink-0"
									title="Удалить правило"
									aria-label="Удалить правило"
								>
									<Trash2 size={13} />
								</button>
							</div>
						))
					)}
				</div>
			</section>
		</div>
	);
}
