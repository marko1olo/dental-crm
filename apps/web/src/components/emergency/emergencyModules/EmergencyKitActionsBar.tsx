/**
 * Emergency Kit Actions Bar (Layer 4)
 * Warehouse writeoff and print actions for statutory kit pane.
 */

import React from 'react';
import { Check, PackageCheck, Printer, FileText } from 'lucide-react';

interface EmergencyKitActionsBarProps {
	isKitWrittenOff: boolean;
	isWritingOffKit: boolean;
	onWriteoffAntishockKit: () => void;
	onPrintEmergencyAct: () => void;
	onApplyToDiary?: ((text: string) => void) | undefined;
	onApplyToForm043: () => void;
}

export function EmergencyKitActionsBar({
	isKitWrittenOff,
	isWritingOffKit,
	onWriteoffAntishockKit,
	onPrintEmergencyAct,
	onApplyToDiary,
	onApplyToForm043,
}: EmergencyKitActionsBarProps) {
	return (
		<div className="emergency-actions-row">
			<button
				type="button"
				className={`emergency-copy-act-btn ${isKitWrittenOff ? 'teal' : 'surface'}`}
				data-testid="emergency-writeoff-kit-btn"
				onClick={onWriteoffAntishockKit}
				title="1-клик списание укладки «Антишок» со склада (мягкий овердрафт)"
			>
				{isKitWrittenOff ? <Check size={18} /> : <PackageCheck size={18} />}
				<span>{isWritingOffKit ? "Списание со склада..." : isKitWrittenOff ? "Укладка «Антишок» списана (Склад)" : "Списать укладку «Антишок» (Склад)"}</span>
			</button>

			<button
				type="button"
				className="emergency-copy-act-btn primary"
				data-testid="emergency-print-act-btn"
				onClick={onPrintEmergencyAct}
				title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"
			>
				<Printer size={18} />
				<span>Печать Акта (СМП)</span>
			</button>

			{onApplyToDiary && (
				<button
					type="button"
					className="emergency-copy-act-btn teal"
					onClick={onApplyToForm043}
					title="Вставить протокол оказания экстренной помощи в дневник приёма медицинской карты"
				>
					<FileText size={18} />
					<span>Вставить в медкарту</span>
				</button>
			)}
		</div>
	);
}
