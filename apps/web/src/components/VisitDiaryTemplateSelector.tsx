import { Clipboard } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";

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

	/*
	 * Источник заголовков берётся ТОЛЬКО из контекста приложения.
	 *
	 * ЧТО БЫЛО СЛОМАНО. `/api/templates` закрыт охраной requireClinicalReadAccess
	 * (routes/templates.ts): без заголовка `x-dente-admin-secret` она отвечает 403.
	 * Запрос шёл голым fetch, и на этой машине список шаблонов загружался только
	 * потому, что в корневом .env секрет закомментирован, а лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS включены. Лазейки живут, пока
	 * NODE_ENV !== "production", то есть у заказчика их нет: там список
	 * «Клинический шаблон» молча пуст, и врач набирает дневник с нуля.
	 *
	 * Одноимённый `auth` есть ещё и в AppHelpers.tsx, но тот НЕ подставляет секрет
	 * из сессии — только если передать его вторым аргументом. Брать заголовки
	 * оттуда значит скомпилироваться и всё равно получить 403 в клинике.
	 *
	 * ref, а не зависимость эффекта: useAuthLogic возвращает новый объект на
	 * каждый рендер провайдера, поэтому `auth` в зависимостях loadTemplates
	 * перезапрашивал бы шаблоны на каждое нажатие клавиши в дневнике.
	 */
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const authRef = useRef(auth);
	authRef.current = auth;

	const loadTemplates = useCallback(async () => {
		try {
			const headerSource = authRef.current;
			const res = await fetch("/api/templates", {
				headers:
					headerSource && typeof headerSource.denteClinicalReadHeaders === "function"
						? headerSource.denteClinicalReadHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
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
