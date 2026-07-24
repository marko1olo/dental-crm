import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface PhotoLinkItem {
	id: string;
	organizationId: string;
	visitId: string;
	patientName: string;
	photoUrl: string;
	examinationFormId: string;
	createdAt: string;
}

export const VisitExaminationPhotoLinksWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [links, setLinks] = useState<PhotoLinkItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const headers = authContext
			? authContext.denteClinicalReadHeaders()
			: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
		fetch("/api/clinical/visit-examination-photo-links", { headers })
			.then((res) => res.json())
			.then((data) => {
				setLinks(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[VisitExaminationPhotoLinksWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="visit-examination-photo-links-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📷</span>
					<h3 className="font-semibold text-sky-600 dark:text-blue-400">
						Привязка Первичного Осмотра и Фотопротокола к Визиту (visit_id)
					</h3>
				</div>
				<span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 px-2 py-0.5 rounded">
					Photo Link EHR
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка привязок фотопротокола...</div>
			) : (
				<div className="space-y-3">
					{links.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/50"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									{item.patientName} — <span className="text-blue-300 font-mono">Визит #{item.visitId}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Бланк осмотра: {item.examinationFormId} · Файл: {item.photoUrl}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-blue-950 text-blue-300 px-2.5 py-1 rounded border border-blue-800 font-mono">
									✓ Привязано к визиту
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
