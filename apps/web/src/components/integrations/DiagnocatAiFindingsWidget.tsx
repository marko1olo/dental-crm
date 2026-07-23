import React, { useEffect, useState } from "react";

interface DiagnocatFindingItem {
	id: string;
	organizationId: string;
	patientName: string;
	studyType: string;
	aiConfidenceScore: string;
	detectedPathologiesJson: string;
	importedToOdontogram: boolean;
	importedAt: string | null;
	createdAt: string;
}

export const DiagnocatAiFindingsWidget: React.FC = () => {
	const [findings, setFindings] = useState<DiagnocatFindingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/diagnocat-findings", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setFindings(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[DiagnocatAiFindingsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="diagnocat-ai-findings-widget"
			className="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🤖</span>
					<h3 className="font-semibold text-cyan-400">
						Интеграция с Diagnocat ИИ (Анализ 3D Снимков и Авто-Формула)
					</h3>
				</div>
				<span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">
					Diagnocat AI Engine
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка ИИ-отчетов Diagnocat...</div>
			) : (
				<div className="space-y-3">
					{findings.map((item) => {
						let pathList: Array<{ tooth: number; pathology: string; score: number }> = [];
						try {
							pathList = JSON.parse(item.detectedPathologiesJson);
						} catch {}
						return (
							<div
								key={item.id}
								className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
							>
								<div className="flex justify-between items-center">
									<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
									<span className="text-xs bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
										Confidence: {(Number(item.aiConfidenceScore) * 100).toFixed(0)}%
									</span>
								</div>
								<div className="text-xs text-slate-300 font-medium">Исследование: {item.studyType}</div>
								<div className="space-y-1 pt-1">
									{pathList.map((p, idx) => (
										<div key={idx} className="text-xs text-slate-300 flex items-center space-x-2">
											<span className="font-bold text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
												Зуб Z{p.tooth}
											</span>
											<span>{p.pathology}</span>
										</div>
									))}
								</div>
								{item.importedToOdontogram && (
									<div className="text-[11px] text-emerald-400 font-semibold pt-1 border-t border-slate-700/40">
										✓ Патологии импортированы в одонтограмму 1 кликом
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
