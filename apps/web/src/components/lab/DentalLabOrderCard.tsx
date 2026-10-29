import React, { useState } from "react";
import { Printer, User, Clock, Building2, Check, ArrowRight, Copy } from "lucide-react";
import {
	type DentalLabOrder,
	type LabStageId,
	type LabStageDef,
	LAB_STAGES,
	getVitaHex,
	formatRuDate,
	formatKopecks,
} from "./dentalLabData";

export interface DentalLabOrderCardProps {
	readonly order: DentalLabOrder;
	readonly onAdvanceStage?: (order: DentalLabOrder, nextStage: LabStageId) => void;
	readonly onOpenDetails?: (order: DentalLabOrder) => void;
	readonly isPrintBlankMode?: boolean;
}

function renderQrSvg(data: string): React.ReactNode {
	const size = 21;
	const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

	const addFinder = (r0: number, c0: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
					const row = cells[r0 + r];
					if (row) row[c0 + c] = true;
				}
			}
		}
	};
	addFinder(0, 0);
	addFinder(0, size - 7);
	addFinder(size - 7, 0);

	for (let i = 8; i < size - 8; i++) {
		const row6 = cells[6];
		if (row6) row6[i] = i % 2 === 0;
		const rowI = cells[i];
		if (rowI) rowI[6] = i % 2 === 0;
	}

	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
	}
	for (let r = 0; r < size; r++) {
		const row = cells[r];
		if (!row) continue;
		for (let c = 0; c < size; c++) {
			const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
			const inTiming = r === 6 || c === 6;
			if (!inFinder && !inTiming) {
				hash = (hash * 1664525 + 1013904223) >>> 0;
				row[c] = (hash & 1) === 1;
			}
		}
	}

	return (
		<svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" shapeRendering="crispEdges">
			<rect width={size} height={size} fill="#ffffff" />
			{cells.flatMap((row, r) =>
				row.map((active, c) =>
					active ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" /> : null,
				),
			)}
		</svg>
	);
}

export const DentalLabOrderCard: React.FC<DentalLabOrderCardProps> = ({
	order,
	onAdvanceStage,
	onOpenDetails,
	isPrintBlankMode = false,
}) => {
	const [copied, setCopied] = useState(false);
	const stage: LabStageDef = LAB_STAGES.find((s) => s.id === order.status) ?? LAB_STAGES[0]!;
	const shadeHex = getVitaHex(order.colorVita);

	const handleCopyNumber = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (navigator.clipboard) {
			void navigator.clipboard.writeText(order.orderNumber);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handlePrint = (e: React.MouseEvent) => {
		e.stopPropagation();
		window.print();
	};

	const handleAdvance = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!onAdvanceStage) return;
		const nextIndex = stage.stepNumber;
		if (nextIndex < LAB_STAGES.length) {
			const nextStageDef = LAB_STAGES[nextIndex];
			if (nextStageDef) {
				onAdvanceStage(order, nextStageDef.id);
			}
		}
	};

	if (isPrintBlankMode) {
		return (
			<div
				className="bg-white text-slate-900 p-6 max-w-[600px] mx-auto border border-slate-300 rounded-xl font-sans text-xs print:p-0 print:border-none print:max-w-none print:shadow-none"
				style={{ breakInside: "avoid" }}
				data-testid={`lab-order-print-blank-${order.id}`}
			>
				<header className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
					<div>
						<div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
							{order.clinicName} • Зуботехнический наряд-заказ
						</div>
						<h1 className="text-xl font-black text-slate-900 mt-0.5">
							Наряд № {order.orderNumber}
						</h1>
					</div>
					<div className="w-16 h-16 border border-slate-300 rounded p-1 bg-white">
						{renderQrSvg(order.orderNumber)}
					</div>
				</header>

				<section className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
					<div>
						<span className="text-slate-500 block text-[10px] uppercase">Пациент</span>
						<strong className="text-sm font-semibold">{order.patientName}</strong>
					</div>
					<div>
						<span className="text-slate-500 block text-[10px] uppercase">Врач-ортопед</span>
						<strong className="text-sm font-semibold">{order.doctorName}</strong>
					</div>
					<div>
						<span className="text-slate-500 block text-[10px] uppercase">Зуб (формула FDI)</span>
						<span className="text-sm font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
							Зуб {order.toothFdi}
						</span>
					</div>
					<div>
						<span className="text-slate-500 block text-[10px] uppercase">Оттенок VITA</span>
						<div className="flex items-center gap-1.5 mt-0.5">
							<span className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-2xs" style={{ backgroundColor: shadeHex }} />
							<strong className="text-sm">{order.colorVita}</strong>
						</div>
					</div>
				</section>

				<section className="py-3 border-b border-slate-200">
					<span className="text-slate-500 block text-[10px] uppercase">Конструкция и материал</span>
					<div className="text-sm font-bold text-slate-900">{order.workTitle}</div>
					<div className="text-slate-600 mt-0.5">{order.material}</div>
					{order.notes && (
						<div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 text-[11px]">
							<span className="font-semibold text-slate-900">Указания технику: </span>
							{order.notes}
						</div>
					)}
				</section>

				<section className="grid grid-cols-3 gap-2 py-3 border-b border-slate-200 text-center">
					<div className="p-2 bg-slate-50 rounded border border-slate-200">
						<span className="text-slate-500 text-[10px] block">Дата заказа</span>
						<strong className="text-xs">{formatRuDate(order.createdDate)}</strong>
					</div>
					<div className="p-2 bg-slate-50 rounded border border-slate-200">
						<span className="text-slate-500 text-[10px] block">Примерка</span>
						<strong className="text-xs">{formatRuDate(order.fittingDate || "—")}</strong>
					</div>
					<div className="p-2 bg-teal-50 rounded border border-teal-200">
						<span className="text-teal-700 text-[10px] block font-semibold">Срок сдачи в клинику</span>
						<strong className="text-xs text-teal-900">{formatRuDate(order.dueDate)}</strong>
					</div>
				</section>

				<footer className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
					<div>
						<div className="border-b border-slate-400 pb-1 mb-1" />
						<span>Врач-ортопед (подпись / печать)</span>
					</div>
					<div>
						<div className="border-b border-slate-400 pb-1 mb-1" />
						<span>Зубной техник {order.labName}</span>
					</div>
				</footer>
			</div>
		);
	}

	return (
		<div
			onClick={() => onOpenDetails?.(order)}
			className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-teal-500/50 transition-all cursor-pointer flex flex-col justify-between gap-3 text-slate-900 dark:text-slate-100"
			data-testid={`lab-order-card-${order.id}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="font-black text-sm text-slate-900 dark:text-slate-100">
						{order.orderNumber}
					</span>
					<button
						type="button"
						onClick={handleCopyNumber}
						className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
						title="Скопировать номер"
						aria-label="Скопировать номер"
					>
						{copied ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
					</button>
					{order.isUrgent && (
						<span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-1.5 py-0.5 rounded">
							Срочно
						</span>
					)}
				</div>
				<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stage.badgeClass}`}>
					{stage.shortLabel}
				</span>
			</div>

			<div>
				<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
					<User size={14} className="text-slate-400 shrink-0" />
					<span className="truncate">{order.patientName}</span>
				</div>
				<div className="flex items-center gap-2 text-xs">
					<span className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded">
						Зуб {order.toothFdi}
					</span>
					<span className="text-slate-600 dark:text-slate-400 truncate">{order.workTitle}</span>
				</div>
			</div>

			<div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
				<div className="flex items-center gap-1.5">
					<span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs" style={{ backgroundColor: shadeHex }} />
					<span className="font-mono text-slate-700 dark:text-slate-300">{order.colorVita}</span>
				</div>
				<div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
					<Building2 size={13} />
					<span className="text-[11px] truncate max-w-[140px]">{order.labName}</span>
				</div>
			</div>

			<div className="flex items-center justify-between text-xs pt-1">
				<div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
					<Clock size={13} />
					<span>Срок: {formatRuDate(order.dueDate)}</span>
				</div>
				<span className="font-bold text-slate-900 dark:text-slate-100">
					{formatKopecks(order.patientPriceKopecks)}
				</span>
			</div>

			<div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
				<button
					type="button"
					onClick={handlePrint}
					className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
					data-testid={`btn-print-blank-${order.id}`}
				>
					<Printer size={14} />
					<span>Бланк А5</span>
				</button>
				{stage.stepNumber < LAB_STAGES.length && (
					<button
						type="button"
						onClick={handleAdvance}
						className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
						data-testid={`btn-advance-stage-${order.id}`}
					>
						<span>Далее</span>
						<ArrowRight size={14} />
					</button>
				)}
			</div>
		</div>
	);
};
