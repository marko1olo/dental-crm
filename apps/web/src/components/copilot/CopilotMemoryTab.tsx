/**
 * @file CopilotMemoryTab.tsx
 * @description Long-term AI clinical memory manager: Doctor habits, materials,
 * anesthesia defaults, protocol formatting and hardware presets (Mandate 8b <= 220 lines).
 */

import React, { useState } from "react";
import { Brain, Plus, Sparkles, Trash2, Tag, CheckCircle2 } from "lucide-react";
import { useCopilotStore, type AiMemoryFact } from "../../store/copilotStore";
import { showToast } from "../GlobalToast";

const CATEGORY_LABELS: Record<AiMemoryFact["category"], { label: string; badgeClass: string }> = {
	materials: { label: "Материалы", badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25" },
	anesthesia: { label: "Анестезия", badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25" },
	protocols: { label: "Протоколы", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
	equipment: { label: "Оборудование", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25" },
	custom: { label: "Общее", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25" },
};

export function CopilotMemoryTab() {
	const memoryFacts = useCopilotStore((s) => s.memoryFacts);
	const addMemoryFact = useCopilotStore((s) => s.addMemoryFact);
	const removeMemoryFact = useCopilotStore((s) => s.removeMemoryFact);
	const clearMemory = useCopilotStore((s) => s.clearMemory);

	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [newFactText, setNewFactText] = useState<string>("");
	const [newFactCategory, setNewFactCategory] = useState<AiMemoryFact["category"]>("materials");

	const handleAddFact = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newFactText.trim();
		if (!trimmed) return;
		addMemoryFact(newFactCategory, trimmed);
		setNewFactText("");
		showToast("Клиническое предпочтение сохранено в память ИИ", "success");
	};

	const filteredFacts = activeCategory === "all"
		? memoryFacts
		: memoryFacts.filter((f) => f.category === activeCategory);

	return (
		<div className="copilot-memory-tab flex-1 overflow-y-auto px-5 py-3.5 space-y-4 text-xs">
			{/* Информационный баннер */}
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-3">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 mt-0.5">
					<Brain size={16} />
				</div>
				<div className="min-w-0 flex-1">
					<h4 className="font-bold text-[var(--ink)] m-0">Долговременная память ассистента</h4>
					<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5 leading-relaxed">
						ИИ учитывает ваши клинические привычки при формировании дневников SOAP, выборе композитов и дозировок анестезии.
					</p>
				</div>
			</div>

			{/* Форма добавления нового факта */}
			<form onSubmit={handleAddFact} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Plus size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Добавить клиническое предпочтение</span>
					</label>
					<select
						value={newFactCategory}
						onChange={(e) => setNewFactCategory(e.target.value as AiMemoryFact["category"])}
						className="h-7 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[11px] text-[var(--ink)] cursor-pointer"
					>
						<option value="materials">Материалы</option>
						<option value="anesthesia">Анестезия</option>
						<option value="protocols">Протоколы</option>
						<option value="equipment">Оборудование</option>
						<option value="custom">Общее</option>
					</select>
				</div>

				<div className="flex gap-2">
					<input
						type="text"
						value={newFactText}
						onChange={(e) => setNewFactText(e.target.value)}
						placeholder="Например: Пломбирование каналов методом латеральной компакции..."
						className="flex-1 h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
					<button
						type="submit"
						className="primary-button h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold hover:opacity-95 shadow-xs shrink-0 cursor-pointer"
					>
						Сохранить
					</button>
				</div>
			</form>

			{/* Фильтр по категориям */}
			<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
				<button
					type="button"
					onClick={() => setActiveCategory("all")}
					className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
						activeCategory === "all"
							? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					Все ({memoryFacts.length})
				</button>
				{(Object.keys(CATEGORY_LABELS) as Array<AiMemoryFact["category"]>).map((cat) => (
					<button
						key={cat}
						type="button"
						onClick={() => setActiveCategory(cat)}
						className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer whitespace-nowrap transition-colors ${
							activeCategory === cat
								? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						{CATEGORY_LABELS[cat].label}
					</button>
				))}
			</div>

			{/* Список сохраненных предпочтений */}
			<div className="space-y-2">
				{filteredFacts.length === 0 ? (
					<div className="p-6 text-center text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
						<Brain size={24} className="mx-auto mb-2 opacity-40" />
						<p className="m-0">В этой категории пока нет сохраненных предпочтений</p>
					</div>
				) : (
					filteredFacts.map((item) => {
						const meta = CATEGORY_LABELS[item.category];
						return (
							<div
								key={item.id}
								className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-start justify-between gap-3 group hover:border-[var(--teal,#0d9488)]/40 transition-colors"
							>
								<div className="min-w-0 flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${meta.badgeClass}`}>
											{meta.label}
										</span>
										<span className="text-[10px] text-[var(--muted)]">{item.createdAt}</span>
									</div>
									<p className="text-[11px] text-[var(--ink)] leading-relaxed m-0 font-medium">
										{item.fact}
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										removeMemoryFact(item.id);
										showToast("Предпочтение удалено из памяти", "info");
									}}
									className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
									title="Удалить из памяти"
								>
									<Trash2 size={13} />
								</button>
							</div>
						);
					})
				)}
			</div>

			{/* Сброс памяти */}
			{memoryFacts.length > 0 && (
				<div className="pt-2 flex justify-end">
					<button
						type="button"
						onClick={() => {
							if (confirm("Вы уверены, что хотите очистить всю клиническую память ассистента?")) {
								clearMemory();
								showToast("Память ассистента очищена", "info");
							}
						}}
						className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-transparent"
					>
						Очистить всю память
					</button>
				</div>
			)}
		</div>
	);
}
