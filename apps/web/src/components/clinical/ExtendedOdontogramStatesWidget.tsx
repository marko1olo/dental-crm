import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { Activity, ShieldCheck } from "lucide-react";

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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [states, setStates] = useState<ExtendedOdontogramItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/extended-odontogram-states", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="extended-odontogram-states-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Activity className="w-5 h-5 text-teal-500" />
					<h3 className="font-semibold text-teal-600 dark:text-teal-400">
						Расширенная одонтограмма: Детский прикус & Вторичный кариес
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
					Детская & Взрослая 3D
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка расширенных статусов зубной формулы...
				</div>
			) : states.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Расширенные статусы зубной формулы отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{states.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm">{item.patientName} — Зуб #{item.toothNumber}</span>
								<span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1 font-semibold">
									<ShieldCheck className="w-3 h-3" /> {item.isPrimaryPediatric ? "Молочный" : "Постоянный"}
								</span>
							</div>
							<div className="text-xs" style={{ color: "var(--muted)" }}>
								Подвижность: Grade {item.mobilityDegree} · Вторичный кариес: {item.secondaryCariesUnderFilling ? "Да" : "Нет"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
