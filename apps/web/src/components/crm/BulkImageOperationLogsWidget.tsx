import React, { useEffect, useState } from "react";

interface BulkLogItem {
	id: string;
	organizationId: string;
	patientName: string;
	selectedImagesCount: number;
	assignedToothNumber: number | null;
	operationType: string;
	createdAt: string;
}

export const BulkImageOperationLogsWidget: React.FC = () => {
	const [logs, setLogs] = useState<BulkLogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/bulk-image-operation-logs", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setLogs(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[BulkImageOperationLogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="bulk-image-operation-logs-widget"
			className="p-4 bg-slate-900 border border-violet-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🖼️</span>
					<h3 className="font-semibold text-violet-400">
						Массовые Операции с Изображениями (Пакетное связывание снимков и свойств)
					</h3>
				</div>
				<span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/40">
					Bulk Image Ops
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка журнала массовых операций...</div>
			) : (
				<div className="space-y-3">
					{logs.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-300 mt-1">
									Операция: <span className="text-violet-300 font-semibold">{item.operationType}</span> ({item.selectedImagesCount} файлов)
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-violet-950 text-violet-300 px-2.5 py-1 rounded border border-violet-800 font-mono">
									Зуб #{item.assignedToothNumber ?? "—"}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
