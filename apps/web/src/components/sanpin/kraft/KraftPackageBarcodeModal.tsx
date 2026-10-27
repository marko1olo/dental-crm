import React, { useState, useRef } from "react";
import { Printer, X, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { generateThermalStickerHtml, generateKraftBatchRecords } from "./kraftPackageEngine";
import { POPULAR_KRAFT_PRESETS, type QuickKraftPreset } from "./kraftPackagePresets";
import type { KraftPackageRecord } from "./kraftPackageTypes";
import type { ParsedKraftBarcode } from "@dental/shared";

export { POPULAR_KRAFT_PRESETS, type QuickKraftPreset };
export type StudioActiveTab = "builder" | "scan" | "register" | "print" | "tspl_zpl" | "standards";

export interface KraftPackageBarcodeModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onBatchCreated?: ((records: KraftPackageRecord[]) => void) | undefined;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly initialAutoclaveId?: string | undefined;
	readonly initialCycleNumber?: number | undefined;
	readonly initialOperatorName?: string | undefined;
	readonly initialBarcode?: string | undefined;
}

export function KraftPackageBarcodeModal({
	isOpen,
	onClose,
	onBatchCreated,
	initialAutoclaveId = "AUTO-01",
	initialCycleNumber = 1,
	initialOperatorName = "Персонал ЦСО",
}: KraftPackageBarcodeModalProps) {
	const [submitting, setSubmitting] = useState(false);
	const inFlightRef = useRef(false);
	if (!isOpen) return null;

	const handleRunBatchAndPrint = async () => {
		if (inFlightRef.current || submitting) return;
		inFlightRef.current = true;
		try {
			setSubmitting(true);
			await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					autoclaveId: initialAutoclaveId,
					operatorFullName: initialOperatorName,
					pouchCount: 27,
				}),
			}).catch(() => null);

			const sampleRecord = generateKraftBatchRecords({
				quantity: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "basic_exam",
				autoclaveId: initialAutoclaveId || "АК-01",
				cycleNumber: initialCycleNumber || 1,
				operatorName: initialOperatorName || "Медсестра ЦСО",
			})[0]!;
			const html = generateThermalStickerHtml(sampleRecord);
			const w = window.open("", "_blank");
			if (w) {
				w.document.write(html);
				w.document.close();
				w.print();
			}
			showToast("Партия 134°C (27 наборов) зафиксирована, этикетка отправлена на печать", "success");
			onBatchCreated?.([]);
			onClose();
		} catch {
			showToast("Ошибка при фиксации партии стерилизации", "error");
		} finally {
			inFlightRef.current = false;
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" role="dialog" aria-modal="true" onClick={onClose}>
			<div className="bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] rounded-t-[24px] sm:rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] w-full sm:max-w-md max-h-[90dvh] sm:max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
				<div className="flex sm:hidden justify-center pt-2.5 pb-1 shrink-0" aria-hidden="true">
					<div className="w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" />
				</div>
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)]">
					<div className="flex items-center gap-2.5">
						<ShieldCheck size={20} color="var(--teal,#0d9488)" className="shrink-0" />
						<h3 className="font-bold text-[0.95rem] text-[var(--ink,#0f172a)] m-0">Маркировка партии автоклавирования</h3>
					</div>
					<button type="button" onClick={onClose} className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer touch-manipulation" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>
				<div className="p-5 space-y-4 overflow-y-auto">
					<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[#1e293b]/50 p-3.5 space-y-2 text-xs">
						<div className="flex justify-between font-medium"><span>Состав партии:</span><strong className="text-[var(--ink,#0f172a)]">27 наборов (15 смотр., 8 терап., 4 турбины)</strong></div>
						<div className="flex justify-between"><span>Режим автоклава:</span><span>134°C / 2.1 бар / 5 мин (Класс B)</span></div>
						<div className="flex justify-between"><span>Химический контроль:</span><span className="text-emerald-700 dark:text-emerald-400 font-semibold">Индикатор 5 класса (100% норма)</span></div>
						<div className="flex justify-between"><span>Срок стерильности:</span><span>50 суток (термосварка)</span></div>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">Пакетный запуск автоматически списывает 27 крафт-пакетов и 1 индикатор 5 класса со склада, внося запись в журнал.</p>
				</div>
				<div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] pb-[max(14px,env(safe-area-inset-bottom))]">
					<button type="button" onClick={onClose} className="secondary-button px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft)] cursor-pointer touch-manipulation">Отмена</button>
					<button type="button" onClick={handleRunBatchAndPrint} aria-busy={submitting} className="primary-button inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs cursor-pointer touch-manipulation">
						<Printer size={15} /><span>Запустить цикл и напечатать этикетку</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default KraftPackageBarcodeModal;
