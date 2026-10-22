/**
 * Emergency Dispatcher Box & Action Buttons (Layer 4)
 * Verbatim dispatcher script and 1-click critical action buttons.
 */

import React from 'react';
import { Copy, Check, Printer, PackageCheck, FileText, Send } from 'lucide-react';
import type { EmergencyDispatcherBoxProps } from './emergencyRescueTypes';

export function EmergencyDispatcherBox({
	generatedCheatSheetText,
	isCopiedCheatSheet,
	onCopyCheatSheet,
	onPrintEmergencyAct,
	isKitWrittenOff,
	isWritingOffKit,
	onWriteoffAntishockKit,
	onApplyToDiary,
	onApplyToForm043,
	isCopiedAct,
	onCopyAct,
	isCopiedRelative,
	onCopyRelativeNotice,
}: EmergencyDispatcherBoxProps) {
	return (
		<>
			<div className="emergency-cheatsheet-textbox">
				<div className="emergency-cheatsheet-header">
					<span className="emergency-cheatsheet-title">Текст для зачитывания диспетчеру скорой помощи (103 / 112)</span>
					<span className="emergency-cheatsheet-hint">Зачитайте по пунктам в трубку при звонке</span>
				</div>
				<textarea
					readOnly
					className="emergency-protocol-textarea emergency-cheatsheet-textarea"
					value={generatedCheatSheetText}
					aria-label="Текст для диспетчера скорой помощи"
				/>
			</div>

			<div className="emergency-actions-row">
				<button
					type="button"
					className="emergency-copy-act-btn danger"
					data-testid="emergency-copy-cheatsheet-btn"
					onClick={onCopyCheatSheet}
					title="Скопировать готовый текст для звонка в 112 в буфер обмена"
				>
					{isCopiedCheatSheet ? <Check size={18} /> : <Copy size={18} />}
					<span>{isCopiedCheatSheet ? "Скопировано для звонка!" : "Скопировать для звонка (112)"}</span>
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

				<button
					type="button"
					className={`emergency-copy-act-btn ${isKitWrittenOff ? 'teal' : 'surface'}`}
					data-testid="emergency-handover-writeoff-btn"
					onClick={onWriteoffAntishockKit}
					title="1-клик списание укладки «Антишок» со склада (мягкий овердрафт)"
				>
					{isKitWrittenOff ? <Check size={18} /> : <PackageCheck size={18} />}
					<span>{isWritingOffKit ? "Списание со склада..." : isKitWrittenOff ? "Укладка «Антишок» списана со склада" : "Списать укладку «Антишок» (Склад)"}</span>
				</button>

				{onApplyToDiary ? (
					<button
						type="button"
						className="emergency-copy-act-btn teal"
						onClick={onApplyToForm043}
						title="Вставить протокол оказания экстренной помощи в дневник приёма медицинской карты"
					>
						<FileText size={18} />
						<span>Вставить в медкарту</span>
					</button>
				) : (
					<button
						type="button"
						className="emergency-copy-act-btn secondary"
						onClick={onCopyAct}
						title="Скопировать текст Акта в буфер обмена"
					>
						{isCopiedAct ? <Check size={18} /> : <Copy size={18} />}
						<span>{isCopiedAct ? "Скопировано!" : "Копировать Акт"}</span>
					</button>
				)}

				<button
					type="button"
					className="emergency-copy-act-btn surface"
					data-testid="emergency-copy-relative-notice-btn"
					onClick={onCopyRelativeNotice}
					title="Скопировать экстренное извещение для родственников в WhatsApp/Telegram"
				>
					<Send size={16} />
					<span>{isCopiedRelative ? "Извещение скопировано!" : "Извещение родственникам"}</span>
				</button>
			</div>
		</>
	);
}
