import {
	Calendar,
	CheckCircle2,
	ClipboardList,
	MapPin,
	Scan,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import React from "react";
import type { WhatsappTemplateType } from "./types";

interface WhatsappTemplatePickerProps {
	readonly hasUpcomingAppointment: boolean;
	readonly onApplyTemplate: (type: WhatsappTemplateType) => void;
}

interface TemplateButtonDef {
	readonly type: WhatsappTemplateType;
	readonly title: string;
	readonly subtitle: string;
	readonly icon: React.ReactNode;
}

export function WhatsappTemplatePicker({
	hasUpcomingAppointment,
	onApplyTemplate,
}: WhatsappTemplatePickerProps) {
	const templates: TemplateButtonDef[] = [
		{ type: "reminder", title: "Напоминание", subtitle: hasUpcomingAppointment ? "К визиту" : "Плановый приём", icon: <Calendar size={12} className="text-amber-500" /> },
		{ type: "confirmation", title: "Подтверждение", subtitle: "Ответ ДА / НЕТ", icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
		{ type: "hygiene", title: "Профгигиена", subtitle: "Раз в 6 месяцев", icon: <Sparkles size={12} className="text-cyan-500" /> },
		{ type: "checkup", title: "Осмотр", subtitle: "После лечения", icon: <Stethoscope size={12} className="text-purple-500" /> },
		{ type: "xray", title: "Снимок КТ", subtitle: "Диагностика", icon: <Scan size={12} className="text-cyan-500" /> },
		{ type: "treatment_plan", title: "План лечения", subtitle: "Сметы готовы", icon: <ClipboardList size={12} className="text-indigo-500" /> },
		{ type: "route", title: "Маршрут", subtitle: "Схема и парковка", icon: <MapPin size={12} className="text-rose-500" /> },
	];

	return (
		<div className="mb-3 space-y-1.5">
			<span className="text-xs font-bold text-[var(--muted)] flex items-center gap-1">
				<Sparkles size={12} className="text-amber-500" />
				Быстрые шаблоны:
			</span>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
				{templates.map((tpl) => (
					<button
						key={tpl.type}
						type="button"
						onClick={() => onApplyTemplate(tpl.type)}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] active:scale-95 border border-[var(--glass-border)] hover:border-emerald-500/40 text-[var(--ink)] hover:text-emerald-600 dark:hover:text-emerald-300 text-xs font-semibold text-left transition-all flex flex-col justify-center cursor-pointer"
					>
						<span className="flex items-center gap-1">
							{tpl.icon}
							<span>{tpl.title}</span>
						</span>
						<span className="text-[10px] text-[var(--muted)] font-normal truncate">
							{tpl.subtitle}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
