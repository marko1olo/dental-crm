import React, { useEffect, useState } from "react";

interface ExtendedOdontogramItem {
	id: string;
	organizationId: string;
	patientName: string;
	toothNumber: number;
	isPrimaryPediatric: boolean;
	secondaryCariesUnderFilling: boolean;
	mobilityDegree: number;
	pediatricCrownPresent: boolean;
	notes: string;
	createdAt: string;
}

export const ExtendedOdontogramStatesWidget: React.FC = () => {
	const [states, setStates] = useState<ExtendedOdontogramItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/extended-odontogram-states", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setStates(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ExtendedOdontogramStatesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="extended-odontogram-states-widget"
			className="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🦷</span>
					<h3 className="font-semibold text-fuchsia-400">
						Расширенные Состояния Одонтограммы (ПС Вторичный Кариес, Молочные Коронки)
					</h3>
				</div>
				<span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/40">
					Детская & Взрослая Одонтограмма
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка расширенных состояний одонтограммы...</div>
			) : (
				<div className="space-y-3">
					{states.map((st) => (
						<div
							key={st.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-2"
						>
							<div className="flex justify-between items-center">
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{st.patientName}</span>
									<span className="text-xs bg-fuchsia-950 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-800 font-bold">
										Зуб Z{st.toothNumber}
									</span>
								</div>
								{st.isPrimaryPediatric && (
									<span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
										👶 Молочный зуб
									</span>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2 text-xs">
								{st.secondaryCariesUnderFilling && (
									<span className="bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-bold">
										ПС (Вторичный кариес под пломбой)
									</span>
								)}
								{st.mobilityDegree > 0 && (
									<span className="bg-orange-950 text-orange-300 px-2 py-0.5 rounded border border-orange-800">
										Подвижность {st.mobilityDegree} ст.
									</span>
								)}
								{st.pediatricCrownPresent && (
									<span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
										👑 Детская коронка
									</span>
								)}
							</div>
							<div className="text-xs text-slate-400 border-t border-slate-700/40 pt-1">{st.notes}</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
