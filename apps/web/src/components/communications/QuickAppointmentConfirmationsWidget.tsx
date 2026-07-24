import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { CheckCircle, PhoneCall } from "lucide-react";

interface QuickConfirmItem {
	id: string;
	organizationId: string;
	patientName: string;
	appointmentId: string;
	confirmedByStaffName: string;
	channelUsed: string;
	confirmedAt: string;
}

export const QuickAppointmentConfirmationsWidget: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [items, setItems] = useState<QuickConfirmItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/quick-appointment-confirmations", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[QuickAppointmentConfirmationsWidget fetch error]:", err);
				setLoading(false);
			});
	}, [auth]);

	return (
		<div
			data-testid="quick-appointment-confirmations-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }} title="Лог оперативного подтверждения предстоящих визитов пациентов администратором клиники">
				<div className="flex items-center space-x-2">
					<CheckCircle className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Быстрое подтверждение визитов администратором
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Подтверждения 1-Click
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка быстрых подтверждений...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Подтверждённые визиты за день отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm">{item.patientName}</span>
								<span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<PhoneCall className="w-3 h-3" /> {item.channelUsed}
								</span>
							</div>
							<div className="text-xs" style={{ color: "var(--muted)" }}>
								Подтвердил: <span style={{ color: "var(--ink)" }}>{item.confirmedByStaffName}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
