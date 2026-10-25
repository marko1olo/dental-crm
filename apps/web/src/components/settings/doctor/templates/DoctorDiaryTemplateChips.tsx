import React from "react";
import type { DiaryTemplateDefinition } from "../diaryTemplateTags";

interface DoctorDiaryTemplateChipsProps {
	templates: readonly DiaryTemplateDefinition[];
	selectedTemplateId: string;
	onSelectTemplate: (id: string) => void;
}

export function DoctorDiaryTemplateChips({
	templates,
	selectedTemplateId,
	onSelectTemplate,
}: DoctorDiaryTemplateChipsProps) {
	return (
		<div className="flex gap-1.5 flex-wrap">
			{templates.map((tpl) => {
				const isSelected = selectedTemplateId === tpl.id;
				return (
					<button
						key={tpl.id}
						type="button"
						onClick={() => onSelectTemplate(tpl.id)}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
							isSelected
								? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-500"
						}`}
					>
						<span>{tpl.title}</span>
						<span
							className={`text-[10px] font-mono px-1 rounded ${
								isSelected ? "bg-white/20 text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
							}`}
						>
							{tpl.defaultIcd10}
						</span>
					</button>
				);
			})}
		</div>
	);
}
