import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🦷</span>
					<h3 className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
						Расширенные Состояния Одонтограммы (ПС Вторичный Кариес, Молочные Коронки)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800">
					Детская & Взрослая Одонтограмма
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка расширенных состояний одонтограммы...
				</div>
			) : states.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет зарегистрированных расширенных состояний.
				</div>
			) : (
				<div className="space-y-3">
					{states.map((st) => (
						<div
							key={st.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div className="flex justify-between items-center">
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{st.patientName}</span>
									<span className="text-xs px-2 py-0.5 rounded border font-bold bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800">
										Зуб Z{st.toothNumber}
									</span>
								</div>
								{st.isPrimaryPediatric && (
									<span className="text-xs px-2 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
										👶 Молочный зуб
									</span>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2 text-xs">
								{st.secondaryCariesUnderFilling && (
									<span className="px-2 py-0.5 rounded border font-bold bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
										ПС (Вторичный кариес под пломбой)
									</span>
								)}
								{st.mobilityDegree > 0 && (
									<span className="px-2 py-0.5 rounded border bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
										Подвижность {st.mobilityDegree} ст.
									</span>
								)}
								{st.pediatricCrownPresent && (
									<span className="px-2 py-0.5 rounded border bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
										👑 Детская коронка
									</span>
								)}
							</div>
							<div className="text-xs pt-1 border-t" style={{ borderColor: "var(--line, #e2e8f0)", color: "var(--muted, #64748b)" }}>
								{st.notes}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
