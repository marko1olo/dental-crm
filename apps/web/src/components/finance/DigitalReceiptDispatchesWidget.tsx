import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🧾</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Отправка Электронных Кассовых Чеков на Email или СМС (54-ФЗ)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					54-FZ Digital Receipt
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка журнала отправки чеков...
				</div>
			) : dispatches.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет отправленных чеков.
				</div>
			) : (
				<div className="space-y-3">
					{dispatches.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{item.patientName}</span>
									<span className="text-xs uppercase font-mono text-emerald-600 dark:text-emerald-300 font-bold">
										[{item.dispatchChannel}] {item.recipientContact}
									</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									ОФД Чек: <a href={item.ofdCheckUrl} target="_blank" rel="noreferrer" className="underline text-sky-600 dark:text-sky-400">{item.ofdCheckUrl}</a>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ {item.fiscalStatus}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
