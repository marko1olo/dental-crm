import { AlertTriangle, RefreshCw } from "lucide-react";
import type React from "react";
import { panelStateText, type PanelSubject } from "../lib/panelStateText";

/**
 * Панель не смогла прочитать свои данные.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ. Три виджета карточки пациента показывали при
 * отказе сервера свою честную пустоту («Рекламации и осложнения отсутствуют»,
 * «Нет активных задач по пациенту») — то есть выдавали непрочитанное за
 * прочитанное и пустое. Правка в трёх местах разойдётся; здесь она одна.
 *
 * ОФОРМЛЕНИЕ. Одна строка и одна кнопка, без карточки, иконок статуса и рамок
 * поверх рамок: пустое и сломанное состояние не должны весить больше данных.
 * Тон предупреждения взят такой же, как у соседних виджетов карточки, чтобы на
 * одном экране не появилось второго языка ошибок.
 */
export const PanelLoadFailure: React.FC<{
	subject: PanelSubject;
	/** Код ответа сервера; null — до сервера не дошли вовсе. */
	status: number | null;
	/**
	 * Как перечитать данные. ОБЯЗАТЕЛЬНЫЙ, и это не строгость ради строгости.
	 *
	 * БЫЛО `onRetry?`, и решение «показывать ли кнопку повтора» принималось
	 * ДВАЖДЫ: один раз в panelRetryLabel по коду ответа, второй раз здесь — по
	 * тому, передал ли вызывающий обработчик. Два владельца одного решения
	 * расходятся в обе стороны. Панель, забывшая передать onRetry, печатала
	 * «повторите» без кнопки, которой можно повторить; панель, передавшая его,
	 * рисовала «Повторить» рядом с «сервер не знает такого раздела». Теперь
	 * обработчик — это данные (чем повторять), а решение (повторять ли вообще)
	 * принимает panelRetryLabel и только он.
	 *
	 * Все семь мест вызова передавали его и раньше, так что обязательность
	 * ничего не сломала — она закрыла первую из двух расходимостей.
	 */
	onRetry: () => void;
	className?: string;
}> = ({ subject, status, onRetry, className = "" }) => {
	const text = panelStateText(subject, { phase: "failed", status });
	return (
		<div
			role="alert"
			className={`flex flex-wrap items-start gap-x-3 gap-y-2 p-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900 ${className}`.trim()}
		>
			<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			{/* min-w-0 + break-words: причина отказа длиннее строки и обязана переноситься, а не обрезаться. */}
			<div className="flex-1 min-w-0 break-words">
				<div className="font-semibold">{text.title}</div>
				<div className="mt-0.5">{text.hint}</div>
			</div>
			{/*
				ОДНО решение, и принимает его `panelRetryLabel` по коду ответа: есть
				подпись — есть кнопка, нет подписи — нет и кнопки.

				БЫЛО: кнопка «Повторить» рисовалась по одному факту наличия `onRetry`.
				Рядом с «сервер не знает такого раздела — сообщите администратору»
				она предлагала действие, которое не сработает никогда, а после
				«войдите в смену заново» выглядела альтернативой входу. Когда кнопки
				нет, следующий шаг остаётся в самом тексте отказа выше — 404, 400 и
				422 заканчиваются словами «сообщите администратору», поэтому экран не
				превращается в тупик без выхода.
			*/}
			{text.retryLabel && (
				<button
					type="button"
					onClick={onRetry}
					className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
				>
					<RefreshCw size={13} aria-hidden="true" /> {text.retryLabel}
				</button>
			)}
		</div>
	);
};
