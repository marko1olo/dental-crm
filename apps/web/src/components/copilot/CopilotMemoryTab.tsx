/**
 * @file CopilotMemoryTab.tsx
 * @description Long-term AI clinical memory manager: Doctor habits, materials,
 * anesthesia defaults, diagnostic wording and inline editing (Mandate 8b <= 220 lines).
 */

import React, { useState } from "react";
import { Brain, Check, Edit3, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCopilotStore, type AiMemoryFact } from "../../store/copilotStore";
import { showToast } from "../GlobalToast";

const CATEGORY_LABELS: Record<AiMemoryFact["category"], { label: string; badgeClass: string }> = {
	materials: { label: "Материалы", badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25" },
	anesthesia: { label: "Анестезия", badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25" },
	protocols: { label: "Протоколы", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
	diagnosis: { label: "Диагнозы", badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25" },
	equipment: { label: "Оборудование", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25" },
	custom: { label: "Общее", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25" },
};

export const MEMORY_QUICK_PRESETS: Array<{ category: AiMemoryFact["category"]; cat: AiMemoryFact["category"]; text: string; label: string }> = [
	{ category: "materials", cat: "materials", label: "Estelite Asteria", text: "Любимый композит: Estelite Asteria / Harmonize A2/A3, адгезив OptiBond FL 4-го поколения" },
	{ category: "anesthesia", cat: "anesthesia", label: "Артикаин 1:200к", text: "Анестетик выбора: Артикаин 4% с эпинефрином 1:200 000 (Убистезин / Септанест)" },
	{ category: "protocols", cat: "protocols", label: "Коффердам + NaOCl", text: "Эндодонтия: обязательный коффердам, обработка ProTaper Gold, обтурация AH Plus + гуттаперча" },
	{ category: "diagnosis", cat: "diagnosis", label: "К02.1 Кариес дентина", text: "Диагноз: К02.1 Кариес дентина (хронический средний кариес I/II класс по Блэку)" },
];

export function CopilotMemoryTab() {
	const { memoryFacts, addMemoryFact, updateMemoryFact, removeMemoryFact, clearMemory } = useCopilotStore();
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [newFactText, setNewFactText] = useState<string>("");
	const [newFactCategory, setNewFactCategory] = useState<AiMemoryFact["category"]>("materials");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingText, setEditingText] = useState<string>("");
	const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

	const handleAddFact = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newFactText.trim();
		if (!trimmed) return;
		addMemoryFact(newFactCategory, trimmed);
		setNewFactText("");
		showToast("Клиническое предпочтение сохранено в память ИИ", "success");
	};

	const handleSaveEdit = (id: string) => {
		if (editingText.trim()) {
			updateMemoryFact(id, editingText.trim());
			showToast("Клиническое предпочтение обновлено", "success");
		}
		setEditingId(null);
		setEditingText("");
	};

	const filteredFacts = activeCategory === "all" ? memoryFacts : memoryFacts.filter((f) => f.category === activeCategory);

	return (
		<div className="copilot-memory-tab flex-1 overflow-y-auto px-5 py-3.5 space-y-4 text-xs" data-testid="copilot-memory-tab-root">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-3">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 mt-0.5"><Brain size={16} /></div>
				<div className="min-w-0 flex-1">
					<h4 className="font-bold text-[var(--ink)] m-0">Долговременная память ассистента</h4>
					<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5 leading-relaxed">
						ИИ учитывает ваши клинические привычки при формировании дневников SOAP, выборе композитов и формулировках диагнозов.
					</p>
				</div>
			</div>

			<form onSubmit={handleAddFact} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5"><Plus size={14} className="text-[var(--teal,#0d9488)]" /><span>Добавить клиническое предпочтение</span></label>
					<select value={newFactCategory} onChange={(e) => setNewFactCategory(e.target.value as AiMemoryFact["category"])} className="h-7 px-2 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[11px] text-[var(--ink)] cursor-pointer">
						<option value="materials">Материалы</option>
						<option value="anesthesia">Анестезия</option>
						<option value="protocols">Протоколы</option>
						<option value="diagnosis">Диагнозы</option>
						<option value="equipment">Оборудование</option>
						<option value="custom">Общее</option>
					</select>
				</div>
				<div className="flex gap-2">
					<input type="text" value={newFactText} onChange={(e) => setNewFactText(e.target.value)} placeholder="Например: Пломбирование каналов методом латеральной компакции..." className="flex-1 h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs focus:ring-1 focus:ring-[var(--teal,#0d9488)]" />
					<button type="submit" className="primary-button h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold hover:opacity-95 shadow-xs shrink-0 cursor-pointer">Сохранить</button>
				</div>
				<div className="flex flex-wrap items-center gap-1 pt-1">
					<span className="text-[10px] text-[var(--muted)] flex items-center gap-1"><Sparkles size={11} className="text-[var(--teal,#0d9488)]" /><span>Быстрые пресеты:</span></span>
					{MEMORY_QUICK_PRESETS.map((p) => (
						<button key={p.label} type="button" onClick={() => { setNewFactCategory(p.cat); setNewFactText(p.text); }} className="px-2 py-0.5 rounded text-[10px] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer">{p.label}</button>
					))}
				</div>
			</form>

			<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
				<button type="button" onClick={() => setActiveCategory("all")} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${activeCategory === "all" ? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>Все ({memoryFacts.length})</button>
				{(Object.keys(CATEGORY_LABELS) as Array<AiMemoryFact["category"]>).map((cat) => (
					<button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer whitespace-nowrap transition-colors ${activeCategory === cat ? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>{CATEGORY_LABELS[cat].label}</button>
				))}
			</div>

			<div className="space-y-2">
				{filteredFacts.length === 0 ? (
					<div className="p-6 text-center text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
						<Brain size={24} className="mx-auto mb-2 opacity-40" /><p className="m-0">В этой категории пока нет сохраненных предпочтений</p>
					</div>
				) : (
					filteredFacts.map((item) => {
						const meta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.custom;
						const isEditing = editingId === item.id;
						return (
							<div key={item.id} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-start justify-between gap-3 group hover:border-[var(--teal,#0d9488)]/40 transition-colors">
								<div className="min-w-0 flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${meta.badgeClass}`}>{meta.label}</span>
										<span className="text-[10px] text-[var(--muted)]">{item.createdAt}</span>
									</div>
									{isEditing ? (
										<div className="flex items-center gap-1.5 pt-1">
											<input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id); if (e.key === "Escape") setEditingId(null); }} className="flex-1 h-7 px-2 rounded border border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[11px] text-[var(--ink)]" autoFocus />
											<button type="button" onClick={() => handleSaveEdit(item.id)} className="w-7 h-7 flex items-center justify-center rounded bg-[var(--teal,#0d9488)] text-white cursor-pointer" title="Сохранить"><Check size={12} /></button>
											<button type="button" onClick={() => setEditingId(null)} className="w-7 h-7 flex items-center justify-center rounded border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer" title="Отмена"><X size={12} /></button>
										</div>
									) : (
										<p className="text-[11px] text-[var(--ink)] leading-relaxed m-0 font-medium">{item.fact}</p>
									)}
								</div>
								{!isEditing && (
									<div className="flex items-center gap-1 shrink-0">
										<button type="button" onClick={() => { setEditingId(item.id); setEditingText(item.fact); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer" title="Редактировать предпочтение"><Edit3 size={13} /></button>
										<button type="button" onClick={() => { removeMemoryFact(item.id); showToast("Предпочтение удалено из памяти", "info"); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer" title="Удалить из памяти"><Trash2 size={13} /></button>
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			{memoryFacts.length > 0 && (
				<div className="pt-2 flex justify-end">
					{isConfirmingClear ? (
						<div className="flex items-center gap-2">
							<span className="text-rose-600 font-semibold text-[11px]">Очистить всю клиническую память?</span>
							<button type="button" onClick={() => setIsConfirmingClear(false)} className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] text-[10px] cursor-pointer">Отмена</button>
							<button type="button" onClick={() => { clearMemory(); setIsConfirmingClear(false); showToast("Память ассистента очищена", "info"); }} className="px-2 py-1 rounded bg-rose-500 text-white font-bold text-[10px] cursor-pointer">Да, очистить</button>
						</div>
					) : (
						<button type="button" onClick={() => setIsConfirmingClear(true)} className="text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-transparent">Очистить всю память</button>
					)}
				</div>
			)}
		</div>
	);
}
