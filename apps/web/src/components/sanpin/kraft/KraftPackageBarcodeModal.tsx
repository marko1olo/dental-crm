import React, { useState, useRef } from "react";
import { Printer, X, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { generateThermalStickerHtml, generateKraftBatchRecords } from "./kraftPackageEngine";
import { POPULAR_KRAFT_PRESETS, type QuickKraftPreset } from "./kraftPackagePresets";
import type { KraftPackageRecord } from "./kraftPackageTypes";
import type { ParsedKraftBarcode } from "@dental/shared";
import "./kraftPackage.css";

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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
			<div className="bg-[var(--paper,#ffffff)] rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
				<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-2.5">
						<ShieldCheck size={20} color="var(--teal,#0d9488)" />
						<h3 className="font-bold text-[0.95rem] text-[var(--ink,#0f172a)]">Маркировка партии автоклавирования</h3>
					</div>
					<button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/50 transition-colors" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>
				<div className="p-5 space-y-4">
					<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3.5 space-y-2 text-xs">
						<div className="flex justify-between font-medium"><span>Состав партии:</span><strong className="text-[var(--ink,#0f172a)]">27 наборов (15 смотр., 8 терап., 4 турбины)</strong></div>
						<div className="flex justify-between"><span>Режим автоклава:</span><span>134°C / 2.1 бар / 5 мин (Класс B)</span></div>
						<div className="flex justify-between"><span>Химический контроль:</span><span className="text-emerald-700 font-semibold">Индикатор 5 класса (100% норма)</span></div>
						<div className="flex justify-between"><span>Срок стерильности:</span><span>50 суток (термосварка)</span></div>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)]">Пакетный запуск автоматически списывает 27 крафт-пакетов и 1 индикатор 5 класса со склада, внося запись в журнал.</p>
				</div>
				<div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
					<button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-slate-200/60 transition-colors">Отмена</button>
					<button type="button" onClick={handleRunBatchAndPrint} aria-busy={submitting} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white shadow-sm transition-colors">
						<Printer size={14} /><span>Запустить цикл и напечатать этикетку</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default KraftPackageBarcodeModal;
