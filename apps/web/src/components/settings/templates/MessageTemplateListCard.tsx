import type { MessageTemplate, MessageTemplateChannel } from "@dental/shared";
import { Edit3, Plus, Trash2 } from "lucide-react";
import React from "react";
import { CHANNEL_BADGES, SCENARIO_LABELS } from "./templateConstants";

interface Props {
	templates: MessageTemplate[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onEdit: (template: MessageTemplate) => void;
	onDelete: (id: string) => void;
	onAddNew: () => void;
	channelFilter: MessageTemplateChannel | "all";
	onChannelFilterChange: (c: MessageTemplateChannel | "all") => void;
}

export const MessageTemplateListCard: React.FC<Props> = ({
	templates,
	selectedId,
	onSelect,
	onEdit,
	onDelete,
	onAddNew,
	channelFilter,
	onChannelFilterChange,
}) => {
	const filtered = templates.filter((t) => channelFilter === "all" || t.channel === channelFilter);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
					{(["all", "telegram", "whatsapp", "sms"] as const).map((ch) => (
						<button
							key={ch}
							type="button"
							onClick={() => onChannelFilterChange(ch)}
							className={`px-3.5 py-2 min-h-[44px] text-xs rounded-xl border font-medium cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 ${
								channelFilter === ch
									? "bg-[var(--teal-soft)] border-[var(--teal)] text-[var(--teal)] font-semibold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
							}`}
						>
							{ch === "all" ? "Все каналы" : CHANNEL_BADGES[ch]?.label || ch}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={onAddNew}
					className="h-8 min-h-[44px] px-3 rounded-xl bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
				>
					<Plus size={14} /> <span>Шаблон</span>
				</button>
			</div>

			<div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
				{filtered.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)] border border-[var(--line)] rounded-xl">
						Нет шаблонов в выбранной категории
					</div>
				) : (
					filtered.map((tpl) => {
						const isSelected = tpl.id === selectedId;
						const badge = CHANNEL_BADGES[tpl.channel];
						return (
							<div
								key={tpl.id}
								onClick={() => onSelect(tpl.id)}
								className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
									isSelected
										? "border-[var(--teal)] bg-[var(--teal-soft)]/20 shadow-xs"
										: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)]"
								}`}
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 mb-1 flex-wrap">
										<span className="text-xs font-semibold text-[var(--ink)] break-words leading-snug">{tpl.title}</span>
										<span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badge.badgeClass}`}>
											{badge.label}
										</span>
									</div>
									<span className="text-[11px] text-[var(--muted)] block break-words">
										{SCENARIO_LABELS[(tpl as any).scenario || tpl.intent] || (tpl as any).scenario || tpl.intent}
									</span>
								</div>
								<div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
									<button
										type="button"
										onClick={() => onEdit(tpl)}
										title="Редактировать"
										aria-label={`Редактировать шаблон ${tpl.title}`}
										className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors"
									>
										<Edit3 size={16} />
									</button>
									<button
										type="button"
										onClick={() => onDelete(tpl.id)}
										title="Удалить"
										aria-label={`Удалить шаблон ${tpl.title}`}
										className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-600 inline-flex items-center justify-center cursor-pointer transition-colors"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
