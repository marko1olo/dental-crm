import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface RebookingItem {
	id: string;
	organizationId: string;
	patientName: string;
	rebookedBy: string;
	timeDeltaMinutes: number;
	creditedRole: string;
	appointmentDate: string;
	createdAt: string;
}

export const RebookingConversionRulesWidget: React.FC = () => {
	const [rules, setRules] = useState<RebookingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/hr/rebooking-conversion-rules", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setRules(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[RebookingConversionRulesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="rebooking-conversion-rules-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚖️</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Справедливое Распределение Конверсии Повторной Записи (Порог 15 Минут)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Врач vs Администратор KPI
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка правил зачисления конверсии...
				</div>
			) : rules.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Правила повторной записи пусты.
				</div>
			) : (
				<div className="space-y-3">
					{rules.map((rule) => (
						<div
							key={rule.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{rule.patientName}</div>
								<div className="text-xs mt-0.5" style={{ color: "var(--muted, #64748b)" }}>
									Создано через <strong style={{ color: "var(--ink, #0f172a)" }}>{rule.timeDeltaMinutes} мин</strong> приёма | Дата визита: {rule.appointmentDate}
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs px-2 py-0.5 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Конверсия: {rule.creditedRole.toUpperCase()}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
