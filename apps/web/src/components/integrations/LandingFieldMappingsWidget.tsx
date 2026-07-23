import React, { useEffect, useState } from "react";

interface FieldMappingItem {
	id: string;
	organizationId: string;
	landingProvider: string;
	formName: string;
	incomingFieldKey: string;
	mappedCrmTarget: string;
	isActive: boolean;
	createdAt: string;
}

export const LandingFieldMappingsWidget: React.FC = () => {
	const [mappings, setMappings] = useState<FieldMappingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/landing-field-mappings", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setMappings(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[LandingFieldMappingsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="landing-field-mappings-widget"
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🌐</span>
					<h3 className="font-semibold text-emerald-400">
						Интеграция Лендингов (Flexbe / Tilda): Настраиваемый маппинг полей формы
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Flexbe Field Mapper
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка маппинга полей лендингов...</div>
			) : (
				<div className="space-y-3">
					{mappings.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs uppercase font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold">
										{item.landingProvider}
									</span>
									<span className="text-sm font-bold text-slate-200">{item.formName}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Поле лендинга: <span className="font-mono text-emerald-300">{item.incomingFieldKey}</span> → Поле CRM: <span className="font-mono text-slate-200">{item.mappedCrmTarget}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs bg-slate-950 text-emerald-300 px-2 py-1 rounded border border-emerald-800 font-mono">
									✓ Активно
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
