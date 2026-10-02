/**
 * DENTE CRM — Cashier, Payments & Receipts Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical & Financial Cheat Sheet:
 * - Split payments (Cash + POS Card + SBP QR + Family Balance) in 3 clicks
 * - Zero-Friction Cashier Invariant: Physical person INN is NEVER required
 * - Integer kopeck math without rounding bugs
 * - Offline Fiscal Receipt Queue & Auto-Retry
 * - Hotkeys (F9, Enter), FAQs, and interactive tour button
 */

import React from "react";
import {
	Banknote,
	CheckCircle2,
	CreditCard,
	Gamepad2,
	HelpCircle,
	QrCode,
	ShieldCheck,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const CashierGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
					<Banknote size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Касса, оплата и чеки</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
							Расчёт в 3 клика (F9)
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Быстрый чекаут без очередей у ресепшена: комбинированная сплит-оплата (наличные, банковская карта, СБП по QR-коду, депозит семьи)
						и автоматическая печать чека с точностью до копейки.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-emerald-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел закрывает финансовый цикл визита пациента и исключает кассовые ошибки.
					Администратор или врач принимает оплату за 10–15 секунд, а система автоматически учитывает скидки, авансы и формирует чек для фискального аппарата.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция по приёму оплаты</span>
					<span className="text-[10px] text-[var(--muted)]">Сплит в 3 клика</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Открытие чекаута (F9)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							В визите или расписании нажмите горячую клавишу <strong>F9</strong> или кнопку «К оплате». Сумма рассчитывается по оказанным услугам.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Распределение долей</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Введите доли оплаты: часть наличными, часть картой через POS-терминал, остаток с депозита семьи. Остаток к доплате пересчитывается мгновенно.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Пробитие чека</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите «Пробить чек». Фискальный чек отправляется на кассовый аппарат и регистрируется у оператора фискальных данных.
						</p>
					</div>
				</div>
			</div>

			{/* Способы оплаты */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Поддерживаемые способы расчёта
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<Banknote size={15} className="text-emerald-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Наличные</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Быстрый расчёт сдачи по купюрам 1 000, 2 000, 5 000 ₽ без калькулятора.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<CreditCard size={15} className="text-blue-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Банковская карта (POS)</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Подключение платёжных терминалов всех основных банков (Сбер, Т-Банк, ВТБ) или автономный POS.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<QrCode size={15} className="text-teal-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">СБП QR (Система быстрых платежей)</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Динамический QR-код на экране для оплаты через банковское приложение пациента.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-2 p-2 rounded-md bg-[var(--paper-soft)]">
						<Users size={15} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<span className="font-semibold text-[var(--ink)]">Семейный депозит / Аванс</span>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Списание средств с общего семейного кошелька родителей или родственников в 1 клик.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Быстрая касса</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Открыть кассу и чекаут:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-emerald-600 dark:text-emerald-400">
							F9
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Подтвердить и пробить чек:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-emerald-600 dark:text-emerald-400">
							Enter / Ctrl+Enter
						</kbd>
					</div>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Требуется ли ИНН пациента?</strong>
						<span>Категорически нет! Для физических лиц при оплате картой или наличными ИНН законом не требуется. Система никогда не блокирует чек из-за ИНН.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что если завис кассовый аппарат или пропал интернет?</strong>
						<span>Чек автоматически сохраняется в защищенной локальной очереди и будет пробит сразу при восстановлении связи без повторного ввода.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как оформить 100% скидку или гарантийную переделку?</strong>
						<span>Врач свободно выставляет 100% скидку. В кассе при сумме 0 ₽ чек в фискальный регистратор не отправляется (по закону нулевые чеки запрещены), а оформляется внутренний акт гарантийного обслуживания.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-emerald-600 dark:text-emerald-400" />
						<span>Интерактивный тренажёр: Касса и чеки</span>
					</div>
					<p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
						Отработайте проведение комбинированной сплит-оплаты на учебном счёте с подсказками.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
