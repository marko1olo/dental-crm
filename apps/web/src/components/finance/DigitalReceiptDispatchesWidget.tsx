import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Send, CheckCircle2 } from "lucide-react";

interface ReceiptDispatchItem {
	id: string;
	organizationId: string;
	paymentId: string;
	patientName: string;
	dispatchChannel: string;
	recipientContact: string;
	ofdCheckUrl: string;
	fiscalStatus: string;
	dispatchedAt: string;
}

export const DigitalReceiptDispatchesWidget: React.FC = () => {
	const [dispatches, setDispatches] = useState<ReceiptDispatchItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/digital-receipt-dispatches", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setDispatches(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[DigitalReceiptDispatchesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="digital-receipt-dispatches-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Send className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Электронная отправка чеков (SMS / E-mail ОФД по 54-ФЗ)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					54-ФЗ Электронные чеки
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка отправленных чеков ОФД...
				</div>
			) : dispatches.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Записи об электронной отправке чеков отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{dispatches.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
									Канал: {item.dispatchChannel}
								</span>
								<span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
									{item.fiscalStatus}
								</span>
							</div>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								Пациент: <strong style={{ color: "var(--ink)" }}>{item.patientName}</strong> ({item.recipientContact})
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
