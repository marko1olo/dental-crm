import React, { useEffect, useState } from "react";

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
	const [reasons, setReasons] = useState<CancellationReasonItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/cancellation-reasons-two-level", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReasons(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	return (
		<div className="cancellation-reasons-widget p-3 border rounded-md bg-card text-card-foreground shadow-sm my-2">
			<h4 className="text-sm font-semibold mb-2">Двухуровневые причины отмены</h4>
			{loading ? (
				<p className="text-xs text-muted-foreground">Загрузка причин...</p>
			) : reasons.length === 0 ? (
				<p className="text-xs text-muted-foreground">Причины отмены не настроены</p>
			) : (
				<ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
					{reasons.map((r) => (
						<li key={r.id} className="flex justify-between border-b pb-1">
							<span>{r.reasonTitle} ({r.category})</span>
							<span className="text-muted-foreground">{r.reasonCode}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
