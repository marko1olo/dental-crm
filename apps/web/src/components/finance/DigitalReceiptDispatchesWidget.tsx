import React, { useEffect, useState } from "react";

interface DigitalReceiptItem {
	id: string;
	organizationId: string;
	paymentId: string;
	patientName: string;
	dispatchChannel: string;
	targetDestination: string;
	fiscalReceiptNumber: string;
	receiptAmountRub: string;
	paperPrintSkipped: boolean;
	createdAt: string;
}

export const DigitalReceiptDispatchesWidget: React.FC = () => {
	const [dispatches, setDispatches] = useState<DigitalReceiptItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/digital-receipt-dispatches", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-teal-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🧾</span>
					<h3 className="font-semibold text-teal-400">
						Электронные Чеки ККМ (54-ФЗ): Отправка на Email/СМС без печати чековой ленты
					</h3>
				</div>
				<span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
					54-FZ Digital Receipt
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка реестра электронных чеков...</div>
			) : (
				<div className="space-y-3">
					{dispatches.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
									<span className="text-xs font-mono text-teal-300">({item.targetDestination})</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Чек: <span className="font-mono text-slate-200">{item.fiscalReceiptNumber}</span> · Канал: {item.dispatchChannel}
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<div className="bg-teal-950 text-teal-300 px-2.5 py-1 rounded border border-teal-800 font-bold">
									Сумма: {Number(item.receiptAmountRub).toLocaleString()} ₽
								</div>
								{item.paperPrintSkipped && (
									<span className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono">
										🍃 Экономия ленты (Без бумаги)
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
