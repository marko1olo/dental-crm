/**
 * DENTE CRM — Cashier & 54-FZ Fast Guide
 *
 * 1-Page Clinical & Financial Cheat Sheet:
 * - Split payments (Cash + POS Card + Family Balance) in 3 clicks.
 * - Zero-Friction 54-FZ Invariant: Physical person INN is NEVER required for retail cash/card.
 * - SBP Dynamic QR Code payments.
 * - Offline Fiscal Receipt Queue & Auto-Retry.
 * - Kopeck-exact integer arithmetic (zero floating-point drift).
 */

import React from "react";
import { Banknote, CheckCircle2, CreditCard, QrCode, ShieldCheck, Users } from "lucide-react";

export const CashierGuide: React.FC = () => {
	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
					<Banknote size={16} />
				</div>
				<div>
					<div className="font-semibold text-sm text-[var(--ink)]">
						Касса и оплата: Быстрый расчёт без лишних препятствий
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-0.5">
						Оплата в 3 клика, комбинированный сплит (нал + карта + баланс семьи), поддержка СБП QR
						и автоматическая печать фискального чека без зависаний.
					</div>
				</div>
			</div>

			{/* 3-Click Split Payment Workflow */}
			<div className="space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Сплит-оплата счета в 3 клика (Комбинированный платеж):
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
								1
							</span>
							<span>Открытие чекаута (F9)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							В визите или расписании нажмите <kbd className="px-1 py-0.2 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">F9</kbd> или «К оплате».
							Итоговая сумма рассчитана автоматически по утвержденному плану.
						</p>
					</div>

					<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
								2
							</span>
							<span>Распределение долей</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Введите доли оплаты: часть наличными, часть по карте терминала, остаток с депозита семьи.
							Остаток к доплате пересчитывается мгновенно в копейках.
						</p>
					</div>

					<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
								3
							</span>
							<span>Печать фискального чека</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите «Пробить чек». Чек отправляется на кассовый аппарат (Атол / Штрих-М / LAN-принтер)
							и регистрируется в ОФД. Электронный чек доступен в ЛК пациента.
						</p>
					</div>
				</div>
			</div>

			{/* Payment Methods Grid */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Поддерживаемые способы оплаты
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<Banknote size={15} className="text-emerald-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Наличные (Cash)</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Быстрый расчёт сдачи по номиналам купюр (1 000, 2 000, 5 000 ₽).
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<CreditCard size={15} className="text-blue-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Банковская карта (POS)</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Интеграция с терминалами Сбербанк, Т-Банк, ВТБ, UCS или автономный POS.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<QrCode size={15} className="text-teal-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">СБП QR (Быстрые платежи)</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Динамический QR-код на экране монитора пациента. Комиссия 0.4–0.7%.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<Users size={15} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Семейный баланс / Аванс</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Списание с лицевого счёта главы семьи (родители/супруги) в 1 клик.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Legal & Offline Rules */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
					<ShieldCheck size={14} className="text-emerald-500" />
					<span>Кассовые правила и Офлайн-касса (Гарантии клиники)</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1 list-disc list-inside">
					<li>
						<strong>ИНН физлица НЕ требуется:</strong> Реквизит ИНН покупателя обязателен только при расчетах с юридическими лицами. Программа никогда не требует ИНН от обычных пациентов.
					</li>
					<li>
						<strong>Офлайн-буферизация чеков:</strong> Если в клинике отключился интернет или завис кассовый провод,
						чек записывается в защищенную очередь <code>FiscalReceiptQueueManager</code> и автоматически пробивается
						при восстановлении связи.
					</li>
					<li>
						<strong>Точность до копейки:</strong> Все денежные расчеты ведутся в целочисленных копейках (без округлений
						с плавающей запятой).
					</li>
				</ul>
			</div>
		</div>
	);
};
