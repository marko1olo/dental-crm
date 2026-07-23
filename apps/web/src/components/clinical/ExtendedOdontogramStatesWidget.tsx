import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
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
	const [states, setStates] = useState<ExtendedOdontogramItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/clinical/extended-odontogram-states", {
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Activity className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Расширенные состояния одонтограммы (Вторичный кариес / Детский прикус)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					5-поверхностная одонтограмма
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка состояний одонтограммы...
				</div>
			) : states.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Расширенные клинические статусы зубов отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{states.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Зуб #{item.toothNumber} {item.isPrimaryPediatric ? "(молочный)" : "(постоянный)"}
								</span>
								{item.mobilityDegree > 0 && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
										Подвижность {item.mobilityDegree}°
									</span>
								)}
							</div>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								Пациент: <strong style={{ color: "var(--ink)" }}>{item.patientName}</strong>
							</p>
							{item.secondaryCariesUnderFilling && (
								<p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
									⚠ Вторичный кариес под пломбой
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
