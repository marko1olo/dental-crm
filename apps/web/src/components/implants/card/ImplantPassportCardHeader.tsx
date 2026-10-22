import React from "react";
import { Copy, Printer, Share2, Send } from "lucide-react";
import { DentalImplant } from "../../icons/DentalIcons";
import type { FastImplantPassportData } from "../presets/implantPresetTypes";

export interface ImplantPassportCardHeaderProps {
	readonly data: FastImplantPassportData;
	readonly onCopy: () => void;
	readonly onPrint: () => void;
	readonly onShareWhatsApp: () => void;
	readonly onShareTelegram: () => void;
}

export const ImplantPassportCardHeader: React.FC<ImplantPassportCardHeaderProps> = ({
	data,
	onCopy,
	onPrint,
	onShareWhatsApp,
	onShareTelegram,
}) => {
	return (
		<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-2">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
					<DentalImplant size={22} />
				</div>
				<div className="min-w-0">
					<h4 className="text-sm font-black text-[var(--ink)] tracking-tight truncate">
						Паспорт имплантата DENTE · Гарантийный сертификат
					</h4>
					<span className="text-[11px] font-mono text-[var(--muted)] truncate block">
						{data.passportId || "IMP-PASSPORT-BLANK"} · Медицинская карта пациента
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 flex-wrap">
				<span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
					{data.toothFdi ? `Зуб FDI #${data.toothFdi}` : "Зуб FDI #____"}
				</span>
				<div className="flex items-center gap-2 print:hidden">
					<button
						type="button"
						onClick={onShareWhatsApp}
						className="icon-button min-h-[44px] min-w-[44px] text-[var(--teal,#0d9488)]"
						title="Поделиться в WhatsApp"
						data-testid="btn-share-whatsapp"
					>
						<Share2 size={16} />
					</button>
					<button
						type="button"
						onClick={onShareTelegram}
						className="icon-button min-h-[44px] min-w-[44px] text-[var(--brand-primary,#0ea5e9)]"
						title="Поделиться в Telegram"
						data-testid="btn-share-telegram"
					>
						<Send size={16} />
					</button>
					<button
						type="button"
						onClick={onCopy}
						className="icon-button min-h-[44px] min-w-[44px] text-[var(--ink)]"
						title="Скопировать данные паспорта"
						data-testid="btn-copy-passport-card"
					>
						<Copy size={16} />
					</button>
					<button
						type="button"
						onClick={onPrint}
						className="primary-button min-h-[48px] px-4 py-2 text-xs flex items-center gap-1.5 font-bold"
						title="Распечатать паспорт / гарантийный сертификат"
						data-testid="btn-print-passport-card"
					>
						<Printer size={16} className="shrink-0" />
						<span className="hidden sm:inline">Распечатать паспорт</span>
						<span className="sm:hidden">Печать</span>
					</button>
				</div>
			</div>
		</div>
	);
};
