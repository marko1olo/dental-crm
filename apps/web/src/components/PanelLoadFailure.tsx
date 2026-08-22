import { AlertTriangle, RefreshCw } from "lucide-react";
import type React from "react";
import { type PanelSubject, panelStateText } from "../lib/panelStateText";

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
			style={{ gridColumn: "1 / -1", width: "100%" }}
			className={`flex flex-col sm:flex-row items-start gap-3 p-3.5 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900 ${className}`.trim()}
		>
			<div className="flex items-start gap-2.5 flex-1 min-w-0 w-full">
				<AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
				{/* min-w-0 + break-words: причина отказа длиннее строки и обязана переноситься, а не обрезаться. */}
				<div className="flex-1 min-w-0 break-words">
					<div className="font-semibold text-amber-950 dark:text-amber-100">{text.title}</div>
					<div className="mt-0.5 text-amber-900/90 dark:text-amber-200/90">{text.hint}</div>
				</div>
			</div>
			{/*
				ОДНО решение, и принимает его `panelRetryLabel` по коду ответа: есть
				подпись — есть кнопка, нет подписи — нет и кнопки.
			*/}
			{text.retryLabel && (
				<button
					type="button"
					onClick={onRetry}
					className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors text-xs self-start sm:self-auto"
				>
					<RefreshCw size={13} aria-hidden="true" /> {text.retryLabel}
				</button>
			)}
		</div>
	);
};
