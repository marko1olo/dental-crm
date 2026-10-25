import React from "react";
import { Printer, Share2 } from "lucide-react";

export interface DentalLabPrintHeaderProps {
	clinicName: string;
	gostOrderNumber: string;
	formattedOrderDate: string;
	dueDate?: string | null | undefined;
	deliveryTimeSlot: string;
	deadlineInfo?: { badgeClass: string; labelRu: string } | null | undefined;
	isDraft: boolean;
	isSigned: boolean;
	handlePrint: () => void;
	onShareMessenger?: (() => void) | undefined;
}

export function DentalLabPrintHeader({
	clinicName,
	gostOrderNumber,
	formattedOrderDate,
	dueDate,
	deliveryTimeSlot,
	deadlineInfo,
	isDraft,
	isSigned,
	handlePrint,
	onShareMessenger,
}: DentalLabPrintHeaderProps): React.JSX.Element {
	const isOfficial = isSigned && !isDraft;

	return (
		<>
			{/* Header Toolbar */}
			<div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
						Наряд-заказ в зуботехническую лабораторию
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Официальный наряд-заказ с уникальным штрихкодом партии и ссылкой для трекинга техником.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{onShareMessenger && (
						<button
							type="button"
							onClick={onShareMessenger}
							data-testid="print-blank-share-messenger-btn"
							className="min-h-[36px] h-9 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
							title="Поделиться текстом наряда с зубным техником"
						>
							<Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
							<span>Поделиться в мессенджер</span>
						</button>
					)}
					<button
						type="button"
						onClick={handlePrint}
						data-testid="print-blank-action-btn"
						className="min-h-[36px] h-9 px-4 py-1.5 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
					>
						<Printer className="w-4 h-4" />
						Распечатать наряд (A4)
					</button>
				</div>
			</div>

			{/* Blank Header */}
			<div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
				<div>
					<div className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
						{clinicName}
					</div>
					<h1 className="text-lg sm:text-xl font-black tracking-wide uppercase m-0 mt-0.5 text-slate-900 dark:text-slate-100">
						Наряд-заказ в лабораторию № {gostOrderNumber}
					</h1>
					<p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 m-0 font-medium">
						Стоматологическая клиника · Отделение ортопедии и зубопротезирования
					</p>
				</div>
				<div className="text-right shrink-0">
					<span className="text-xs font-bold block text-slate-900 dark:text-slate-100">
						Дата сдачи слепка/скана: <strong>{formattedOrderDate}</strong>
					</span>
					{dueDate && (
						<span className="text-xs font-bold text-rose-600 print:text-black block mt-0.5">
							Срок сдачи: {new Date(dueDate).toLocaleDateString("ru-RU")}
						</span>
					)}
					<span className="text-xs font-semibold block text-slate-700 dark:text-slate-300 print:text-black mt-0.5">
						Окно курьера: <strong>{deliveryTimeSlot}</strong>
					</span>
					{deadlineInfo && (
						<span
							className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${deadlineInfo.badgeClass}`}
							data-testid="print-blank-deadline-badge"
						>
							{deadlineInfo.labelRu}
						</span>
					)}
				</div>
			</div>

			{/* Statutory Stamp */}
			<div
				className={`p-2.5 rounded-lg border text-xs font-black uppercase tracking-wider flex justify-between items-center ${
					isOfficial
						? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
						: "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
				}`}
			>
				<span>{isOfficial ? "ШТАМП: ПОДПИСАНО ВРАЧОМ • ОФИЦИАЛЬНЫЙ НАРЯД" : "ШТАМП: ЧЕРНОВИК • ПРЕДВАРИТЕЛЬНОЕ ТЗ"}</span>
				<span className="font-mono text-[11px] font-bold">{isOfficial ? "СТАТУС: ПОДПИСАН" : "СТАТУС: ЧЕРНОВИК"}</span>
			</div>
		</>
	);
}
