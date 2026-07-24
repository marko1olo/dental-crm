import React, { useEffect, useState } from "react";

interface EgiszPermissionItem {
	id: string;
	organizationId: string;
	formCode: string;
	fieldName: string;
	isExportAllowed: boolean;
	patientOptOutRespect: boolean;
	updatedAt: string;
}

export const EgiszBlankPermissionsWidget: React.FC = () => {
	const [permissions, setPermissions] = useState<EgiszPermissionItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/egisz-blank-permissions", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPermissions(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[EgiszBlankPermissionsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="egisz-blank-permissions-widget"
			className="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🛡️</span>
					<h3 className="font-semibold text-cyan-400">
						Справочник Бланков: Попольное Управление Разрешениями Выгрузки в ЕГИСЗ
					</h3>
				</div>
				<span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">
					EGISZ Blank Rules
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка правил ЕГИСЗ...</div>
			) : (
				<div className="space-y-3">
					{permissions.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									{item.formCode} — <span className="text-cyan-300 font-semibold">{item.fieldName}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Учет отказа пациента: {item.patientOptOutRespect ? "Включен" : "Выключен"}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								{item.isExportAllowed ? (
									<span className="bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded border border-cyan-800 font-mono">
										✓ Выгрузка разрешена
									</span>
								) : (
									<span className="bg-rose-950 text-rose-300 px-2.5 py-1 rounded border border-rose-800 font-mono">
										⛔ Выгрузка запрещена
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
