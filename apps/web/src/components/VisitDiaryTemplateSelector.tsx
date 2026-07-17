import { Clipboard } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface Template {
	id: string;
	title: string;
	category?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
}

interface VisitDiaryTemplateSelectorProps {
	isLocked: boolean;
	onSelectTemplate: (template: Template) => void;
}

export function VisitDiaryTemplateSelector({
	isLocked,
	onSelectTemplate,
}: VisitDiaryTemplateSelectorProps) {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState("");

	const loadTemplates = useCallback(async () => {
		try {
			const res = await fetch("/api/templates", {
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (res.ok) {
				const data = await res.json();
				setTemplates(data?.templates || []);
			}
		} catch (error) {
			console.error("Failed to load templates", error);
		}
	}, []);

	useEffect(() => {
		loadTemplates();
	}, [loadTemplates]);

	const templatesByCategory = React.useMemo(() => {
		const groups: Record<string, Template[]> = {};
		for (const t of templates) {
			const c = t.category || "Общие";
			if (!groups[c]) groups[c] = [];
			groups[c].push(t);
		}
		return groups;
	}, [templates]);

	return (
		<div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
			<div className="relative w-full sm:w-60">
				<Clipboard className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
				<select
					id="diary-template-select"
					disabled={isLocked}
					value={selectedTemplate}
					onChange={async (e) => {
						const val = e.target.value;
						setSelectedTemplate(val);
						if (!val) return;
						const tmpl = templates.find((t) => t.id === val);
						if (tmpl) {
							onSelectTemplate(tmpl);
							/* showToast("Шаблон успешно применен", "success"); */
						}
					}}
					className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/60 text-zinc-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none disabled:opacity-50"
				>
					<option value="">— Клинический шаблон —</option>
					{Object.entries(templatesByCategory).map(([cat, tpls]) => (
						<optgroup key={cat} label={cat || "Без категории"}>
							{tpls.map((t) => (
								<option key={t.id} value={t.id}>
									{t.title}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</div>
		</div>
	);
}
