import React, { useEffect, useState } from "react";

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
	const [links, setLinks] = useState<PhotoLinkItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/visit-examination-photo-links", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
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
			className="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📷</span>
					<h3 className="font-semibold text-blue-400">
						Привязка Первичного Осмотра и Фотопротокола к Визиту (visit_id)
					</h3>
				</div>
				<span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
					Photo Link EHR
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка привязок фотопротокола...</div>
			) : (
				<div className="space-y-3">
					{links.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
