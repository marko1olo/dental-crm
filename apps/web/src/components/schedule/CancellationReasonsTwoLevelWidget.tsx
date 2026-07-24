import React, { useEffect, useState } from "react";
import { AlertTriangle, Filter } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface CancellationReasonItem {
	id: string;
	organizationId: string;
	category: string;
	reasonCode: string;
	reasonTitle: string;
	requiresNote: boolean;
	isActive: boolean;
	createdAt: string;
}

export const CancellationReasonsTwoLevelWidget: React.FC = () => {
	const { auth } = useAppLogicContext();
	const [reasons, setReasons] = useState<CancellationReasonItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/cancellation-reasons-two-level", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReasons(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	return (
		<div
			data-testid="cancellation-reasons-two-level-widget"
			className="p-3 border rounded-xl shadow-sm my-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center space-x-2 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800" title="Категоризация причин отмены приёма: инициатива клиники vs инициатива пациента">
				<Filter className="w-4 h-4 text-rose-500" />
				<h4 className="text-sm font-semibold">Двухуровневые причины отмены визитов (Клиника vs Пациент)</h4>
			</div>
			{loading ? (
				<p className="text-xs text-slate-500 dark:text-slate-400">Загрузка причин отмены...</p>
			) : reasons.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
					Причины отмены визитов используются системные по умолчанию.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{reasons.map((r) => (
						<li
							key={r.id}
							className="flex justify-between items-center p-2 rounded border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
						>
							<span className="font-semibold">{r.reasonTitle} ({r.category})</span>
							<span className="text-xs font-mono text-slate-500 dark:text-slate-400">{r.reasonCode}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
