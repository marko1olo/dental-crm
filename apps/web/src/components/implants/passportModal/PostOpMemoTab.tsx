/**
 * PostOpMemoTab.tsx — Интерактивная памятка пациенту после установки дентального имплантата.
 * Поддерживает 1-кликовую отправку в WhatsApp и Telegram, печать памятки и копирование в буфер
 * (холод 15 мин, хлоргексидин 0.05%, диета, уход за швами и ФДМ) — Мандаты 8e, 8x, 8am, 8ze.
 */

import React, { useState, useMemo } from "react";
import { Check, Copy, MessageCircle, Printer, Send, ShieldAlert, Sparkles } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { buildPostImplantMemoText } from "../../surgery/surgeryCatalogData";
import type { ImplantCapType } from "../implantQuickPresets";

export interface PostOpMemoTabProps {
	readonly patientName?: string | undefined;
	readonly toothFdi: number;
	readonly doctorName?: string | undefined;
	readonly implantBrand?: string | undefined;
	readonly capType?: ImplantCapType | undefined;
	readonly clinicPhone?: string | undefined;
}

export const PostOpMemoTab: React.FC<PostOpMemoTabProps> = ({
	patientName = "Пациент",
	toothFdi,
	doctorName = "Хирург-имплантолог",
	implantBrand = "Osstem",
	capType = "fdm",
	clinicPhone = "+7 (800) 555-35-35",
}) => {
	const [copied, setCopied] = useState<boolean>(false);

	const memoText = useMemo(() => {
		return buildPostImplantMemoText({
			patientName,
			toothFdi,
			doctorName,
			implantBrand,
			capType,
			clinicPhone,
			hasSutures: true,
			sutureRemovalDays: 10,
		});
	}, [patientName, toothFdi, doctorName, implantBrand, capType, clinicPhone]);

	const handleCopyText = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(memoText);
			}
			setCopied(true);
			showToast("Текст памятки скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Памятка готова к отправке", "info");
		}
	};

	const handleSendWhatsApp = () => {
		const encoded = encodeURIComponent(memoText);
		const url = `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") {
			window.open(url, "_blank", "noopener,noreferrer");
			showToast("Памятка подготовлена для отправки в WhatsApp", "success");
		}
	};

	const handleSendTelegram = () => {
		const encoded = encodeURIComponent(memoText);
		const url = `https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&text=${encoded}`;
		if (typeof window !== "undefined") {
			window.open(url, "_blank", "noopener,noreferrer");
			showToast("Памятка подготовлена для отправки в Telegram", "success");
		}
	};

	const handlePrintMemo = () => {
		if (typeof window !== "undefined") {
			window.print?.();
			showToast("Печать памятки пациенту", "success");
		}
	};

	return (
		<div className="implant-postop-memo-tab space-y-4" data-testid="tab-content-memo">
			{/* Информационный баннер */}
			<div className="p-3.5 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] flex items-start gap-3">
				<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div className="text-xs min-w-0 flex-1">
					<strong className="text-[var(--ink)] block text-sm mb-0.5">
						Клиническая памятка пациенту после имплантации (зуб #{toothFdi})
					</strong>
					<p className="text-[var(--muted)] leading-relaxed">
						Готовый текст рекомендаций (холод 15 мин, ванночки с 0.05% хлоргексидином со 2-х суток, диета).
						Отправка в 1 клик через мессенджер без утомительного набора текста вручную.
					</p>
				</div>
			</div>

			{/* Быстрые действия 1-клик */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
				<button
					type="button"
					onClick={handleSendWhatsApp}
					className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[#25D366]/10 hover:border-[#25D366] hover:text-[#128C7E] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
					data-testid="btn-memo-send-whatsapp"
					title="Отправить памятку в WhatsApp"
				>
					<MessageCircle size={16} className="text-[#25D366] shrink-0" />
					<span>В WhatsApp</span>
				</button>

				<button
					type="button"
					onClick={handleSendTelegram}
					className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[#0088cc]/10 hover:border-[#0088cc] hover:text-[#0088cc] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
					data-testid="btn-memo-send-telegram"
					title="Отправить памятку в Telegram"
				>
					<Send size={16} className="text-[#0088cc] shrink-0" />
					<span>В Telegram</span>
				</button>

				<button
					type="button"
					onClick={handleCopyText}
					className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
					data-testid="btn-memo-copy-text"
					title="Скопировать текст памятки в буфер"
				>
					{copied ? (
						<Check size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					) : (
						<Copy size={16} className="text-[var(--muted)] shrink-0" />
					)}
					<span>{copied ? "Скопировано!" : "Скопировать"}</span>
				</button>

				<button
					type="button"
					onClick={handlePrintMemo}
					className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
					data-testid="btn-memo-print"
					title="Распечатать памятку для выдачи на руки пациенту"
				>
					<Printer size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Печать</span>
				</button>
			</div>

			{/* Текстовый предпросмотр */}
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-3">
				<div className="flex items-center justify-between gap-2 border-b border-[var(--line-subtle)] pb-2.5">
					<span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
						Текст памятки для пациента
					</span>
					<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--teal,#0d9488)] font-semibold">
						{implantBrand} · {capType === "plug" ? "Заглушка" : "ФДМ"}
					</span>
				</div>

				<pre className="text-xs leading-relaxed font-sans text-[var(--ink)] whitespace-pre-wrap select-all font-normal bg-[var(--paper-soft)] p-3.5 rounded-xl border border-[var(--line)] overflow-x-auto">
					{memoText}
				</pre>

				<div className="flex items-center gap-2 text-[11px] text-[var(--muted)] pt-1">
					<ShieldAlert size={14} className="text-[var(--amber,#f59e0b)] shrink-0" />
					<span>
						При кровотечении, нарастающем отёке или температуре выше 38°C пациент информирован о немедленной связи с клиникой.
					</span>
				</div>
			</div>
		</div>
	);
};

export default PostOpMemoTab;
