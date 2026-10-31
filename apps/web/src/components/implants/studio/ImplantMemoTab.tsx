/**
 * ImplantMemoTab.tsx — Постоперационная памятка пациенту после имплантации (DENTE CRM).
 * Рекомендации по уходу, режиму и медикаментам, 1-клик экспорт в WhatsApp/Telegram и печать (Мандаты 8e, 8am).
 */

import React, { useState } from "react";
import { Check, Copy, HeartHandshake, MessageCircle, Send } from "lucide-react";

export interface ImplantMemoTabProps {
	readonly toothFdi: number;
	readonly patientName: string;
	readonly doctorName: string;
}

export const ImplantMemoTab: React.FC<ImplantMemoTabProps> = ({
	toothFdi,
	patientName,
	doctorName,
}) => {
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const memoText = `Памятка пациенту после операции дентальной имплантации (зуб #${toothFdi})
Пациент: ${patientName}
Лечащий хирург: ${doctorName}

1. Холод на область операции: прикладывать пузырь со льдом через салфетку по 15 минут с перерывами в первые 3 часа.
2. Питание: исключить горячую, острую и жесткую пищу на 48 часов. Жевать на противоположной стороне.
3. Гигиена: щадящие антисептические ротовые ванночки (хлоргексидин 0.05% или мирамистин) 3 раза в день без активного полоскания.
4. Ограничения: исключить сауну, баню, горячие ванны, алкоголь и тяжелые физические нагрузки на 7 дней.
5. Медикаменты: принимать назначенные врачом противовоспалительные препараты строго по схеме.
6. Контрольный осмотр и снятие швов: через 10–14 дней.

При возникновении непрекращающегося кровотечения или резкого отека немедленно свяжитесь с клиникой!`;

	const handleCopy = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(memoText);
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 2000);
			}
		} catch {
			// Fallback
		}
	};

	const handleShareWhatsApp = () => {
		const encoded = encodeURIComponent(memoText);
		if (typeof window !== "undefined") {
			window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
		}
	};

	const handleShareTelegram = () => {
		const encoded = encodeURIComponent(memoText);
		if (typeof window !== "undefined") {
			window.open(`https://t.me/share/url?text=${encoded}`, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<div className="space-y-3" data-testid="tab-content-memo">
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 text-xs">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
					<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<HeartHandshake size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Памятка пациенту после имплантации (зуб #{toothFdi}):</span>
					</div>
					<button
						type="button"
						onClick={handleCopy}
						className={`min-h-[44px] sm:min-h-[30px] px-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
							isCopied
								? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						data-testid="btn-copy-memo"
					>
						{isCopied ? <Check size={13} /> : <Copy size={13} />}
						<span>{isCopied ? "✓ Скопировано" : "Скопировать текст"}</span>
					</button>
				</div>

				<ul className="list-disc pl-4 space-y-1.5 text-[var(--muted)] leading-relaxed">
					<li>
						<strong className="text-[var(--ink)]">Холод:</strong> прикладывать на 15 минут с перерывами в течение первых 3–4 часов для снижения отека.
					</li>
					<li>
						<strong className="text-[var(--ink)]">Диета:</strong> щадящая негорячая пища на 48 часов, жевание строго на противоположной стороне.
					</li>
					<li>
						<strong className="text-[var(--ink)]">Антисептика:</strong> ванночки с хлоргексидином 0.05% или мирамистином после еды (не булькать!).
					</li>
					<li>
						<strong className="text-[var(--ink)]">Режим:</strong> исключить спорт, перегрев (сауна, баня, горячая ванна) и алкоголь на 7 дней.
					</li>
					<li>
						<strong className="text-[var(--ink)]">Контроль:</strong> плановый осмотр хирурга и снятие швов через 10–14 дней.
					</li>
				</ul>

				{/* 1-клик отправка в мессенджеры */}
				<div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center gap-2">
					<span className="text-[11px] text-[var(--muted)]">Отправить пациенту:</span>
					<button
						type="button"
						onClick={handleShareWhatsApp}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 text-xs font-medium rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-memo-whatsapp"
					>
						<MessageCircle size={14} />
						<span>WhatsApp</span>
					</button>
					<button
						type="button"
						onClick={handleShareTelegram}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 text-xs font-medium rounded-lg border border-sky-600/30 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-memo-telegram"
					>
						<Send size={14} />
						<span>Telegram</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default ImplantMemoTab;
