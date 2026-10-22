import { countLabel } from "../../lib/russianPlural.js";
import {
	type DispatchReport,
	type Notice,
	type ReportVoice,
	noticeFrom,
	speak,
} from "./deliveryReportTypes.js";

function messages(count: number): string {
	return countLabel(count, "сообщение", "сообщения", "сообщений");
}

const dispatchVoice: ReportVoice<DispatchReport> = {
	claimed: { role: "total", order: 10, say: (n) => `Взято из очереди: ${messages(n)}.` },
	sent: { role: "delivered", order: 20, say: (n) => `Отправлено: ${messages(n)}.` },
	retried: {
		role: "undelivered",
		order: 30,
		say: (n) => n > 0 ? `Пока не ушло, попробуем ещё раз: ${n}. Шлюз отказал — причина по каждому сообщению в журнале ниже. Следующая попытка будет позже сама; чтобы не ждать, нажмите «Отправить из очереди» снова через несколько минут.` : null,
	},
	failed: {
		role: "undelivered",
		order: 40,
		say: (n) => n > 0 ? `Не ушло совсем: ${n}. Попытки закончились — причина в журнале ниже, там же кнопка «Повторить» в строке сообщения.` : null,
	},
	notConfigured: {
		role: "undelivered",
		order: 50,
		say: (n) => n > 0 ? `Отправлять нечем: ${n}. Канал связи не настроен, и сами эти сообщения не уйдут никогда — сначала нужно подключить канал выше.` : null,
	},
	suppressed: {
		role: "undelivered",
		order: 60,
		say: (n) => n > 0 ? `Отправлять не стали: ${n}. Пациент отказался от сообщений, исчерпан суточный предел или это реклама в тихие часы — в журнале ниже состояние «Не отправлено» и причина.` : null,
	},
	deferred: {
		role: "undelivered",
		order: 70,
		say: (n) => n > 0 ? `Отложено до утра: ${n}. Сейчас тихие часы — эти сообщения уйдут сами, когда тишина закончится (границы указаны в правилах рассылки ниже).` : null,
	},
	releasedStuck: {
		role: "detail",
		order: 80,
		say: (n) => n > 0 ? `Заодно возвращено в очередь: ${n} — эти сообщения зависли на предыдущей отправке.` : null,
	},
	awaitingRetry: {
		role: "undelivered",
		order: 90,
		say: (n) => n > 0 ? `Кроме этих, ждут повторной попытки: ${messages(n)} — их уже пробовали отправить, и не получилось. Нажмите «Отправить из очереди» ещё раз через несколько минут.` : null,
	},
	awaitingSchedule: {
		role: "detail",
		order: 100,
		say: (n) => n > 0 ? `Ещё ${messages(n)} ждут своего времени — они уйдут, когда наступит срок.` : null,
	},
};

export function describeDispatchReport(report: DispatchReport): Notice {
	if (report.claimed === 0) {
		if (report.awaitingRetry > 0) {
			const extra = report.awaitingSchedule > 0 ? ` Ещё ${report.awaitingSchedule} ждут назначенного времени.` : "";
			return {
				kind: "fail",
				text: `Ничего не отправлено: ${messages(report.awaitingRetry)} ждут повторной попытки после неудачной отправки, и раньше срока их брать нельзя. Причина по каждому — в журнале ниже; там же кнопка «Повторить», если ждать не нужно.${extra}`,
			};
		}
		if (report.awaitingSchedule > 0) {
			return {
				kind: "done",
				text: `Отправлять сейчас нечего: ${messages(report.awaitingSchedule)} в очереди ждут назначенного времени и уйдут сами, когда оно наступит. Неудачных отправок нет.`,
			};
		}
		return {
			kind: "done",
			text: "Отправлять было нечего: в очереди нет сообщений. Они появятся после кнопки «Поставить напоминания» или после запуска рассылки.",
		};
	}
	return noticeFrom(speak(report, dispatchVoice));
}
