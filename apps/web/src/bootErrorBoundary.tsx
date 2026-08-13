import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "./utils/logger";

/**
 * ГРАНИЦА ОШИБОК ТОЧКИ ВХОДА. Одна на оба контура, которые монтирует main.tsx.
 *
 * ЧТО БЫЛО СЛОМАНО. Этот класс жил внутри AppShell.tsx и оборачивал только
 * рабочее место клиники. Второй контур того же main.tsx — онлайн-запись пациента
 * (pages/PublicBookingWidget.tsx) и портал зуботехника (GuestLabPortal.tsx) —
 * рендерился вообще без границы ошибок: любое исключение при рендере оставляло
 * неаутентифицированному посетителю пустую страницу без единого объяснения и без
 * действия. Хуже, чем у сотрудника: сотрудник хотя бы знает, куда написать.
 *
 * ПОЧЕМУ ПЕРЕЕЗД, А НЕ ЧЕТВЁРТАЯ ГРАНИЦА. В apps/web/src уже три реализации
 * (эта, workspaceRouteErrorBoundary.tsx и components/ErrorBoundary.tsx), и
 * заводить четвёртую ради публичного контура значило бы гарантировать, что
 * поведение разъедется. Ни одна из двух других для публичного контура не годится:
 * WorkspaceRouteErrorBoundary требует раздел рабочего места (`view: AppView`) и
 * говорит с сотрудником про «раздел» и «рабочее место», а components/ErrorBoundary
 * печатает `error.message` прямо на экран — на публичной странице это выдача
 * внутренностей системы постороннему человеку. Поэтому класс вынесен сюда и
 * параметризован только ТЕКСТОМ, а поведение у обоих контуров общее.
 *
 * ТЕКСТ ОШИБКИ НА ЭКРАН НЕ ПОПАДАЕТ НИ В ОДНОЙ ВЕТКЕ. Ни `error.message`, ни
 * стек, ни имена модулей бандла: посетитель публичной страницы — постороннее лицо,
 * а сотруднику эта строка всё равно ничего не объясняет.
 */

/** Кому показываем отказ: сотруднику клиники или постороннему посетителю. */
export type BootAudience = "clinic" | "public";

type BootErrorCopy = {
	readonly lead: string;
	/** Сбой сети при подгрузке чанка — единственный случай, где обновление реально помогает. */
	readonly chunkDetail: string;
	readonly otherDetail: string;
	readonly actionLabel: string;
};

const bootErrorCopy: Record<BootAudience, BootErrorCopy> = {
	clinic: {
		lead: "Не удалось открыть рабочее место клиники.",
		chunkDetail:
			"Файлы интерфейса не загрузились. Обычно помогает обновление страницы после восстановления сети.",
		otherDetail:
			"Интерфейс остановлен до перезагрузки, чтобы не показывать неполное рабочее место.",
		actionLabel: "Обновить рабочее место",
	},
	public: {
		lead: "Страница не открылась.",
		chunkDetail:
			"Часть файлов страницы не загрузилась. Обычно помогает обновление, когда вернётся связь.",
		otherDetail:
			"Страница остановлена до обновления, чтобы не показывать неполную форму.",
		actionLabel: "Обновить страницу",
	},
};

export function bootErrorDetail(
	audience: BootAudience,
	error: unknown,
): string {
	const copy = bootErrorCopy[audience];
	if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
		return copy.chunkDetail;
	}

	return copy.otherDetail;
}

/**
 * Service worker кэширует оболочку рабочего места, и после неудачной выкладки
 * простая перезагрузка вернула бы тот же испорченный кэш. На публичном контуре
 * service worker сознательно не регистрируется (main.tsx), поэтому там нечего
 * сбрасывать и перезагрузка выполняется сразу.
 */
function requestBootRefresh(audience: BootAudience): void {
	if (audience === "clinic") {
		navigator.serviceWorker?.controller?.postMessage({
			type: "DENTE_CLEAR_SHELL_CACHE",
		});
		window.setTimeout(() => window.location.reload(), 50);
		return;
	}

	window.location.reload();
}

type BootErrorBoundaryProps = {
	readonly audience: BootAudience;
	readonly children: ReactNode;
};

type BootErrorBoundaryState = {
	/*
	 * Признак отказа хранится отдельно от самого исключения СПЕЦИАЛЬНО: бросить
	 * можно и `undefined`, и тогда проверка «есть ли ошибка» по значению дала бы
	 * «нет» и вернула бы сломанное поддерево на экран.
	 */
	failed: boolean;
	error: unknown;
};

export class BootErrorBoundary extends Component<
	BootErrorBoundaryProps,
	BootErrorBoundaryState
> {
	state: BootErrorBoundaryState = { failed: false, error: null };

	static getDerivedStateFromError(error: unknown): BootErrorBoundaryState {
		// Здесь только чистое сохранение: текст для человека зависит от `audience`,
		// то есть от props, до которых у статического метода доступа нет, и потому
		// считается в render(). Подстановка текста через setState() в
		// componentDidCatch() объявлена в документации React устаревшей.
		(
			window as Window & typeof globalThis & { LAST_BOOT_ERROR?: string }
		).LAST_BOOT_ERROR = String((error as { stack?: string })?.stack || error);
		return { failed: true, error };
	}

	componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
		/*
		 * Журнал ведётся в ЛЮБОМ режиме, включая production. Раньше здесь стояло
		 * `if (!import.meta.env.PROD)`, и в production падение не оставляло следа
		 * нигде — это не «зато чисто в консоли», а буквально отсутствие улики.
		 * Документация React: production- и development-сборки по-разному обходятся
		 * с пойманным исключением, и в production оно НЕ всплывает до window, то есть
		 * ни window.onerror, ни addEventListener('error') его уже не увидят. Отдельного
		 * сборщика ошибок в apps/web нет ни одного (см. dependencies), заводить его
		 * ради этой строки — отдельное решение, а не побочный эффект правки.
		 * Соседняя граница разделов (workspaceRouteErrorBoundary.tsx) пишет в консоль
		 * безусловно с той же мотивировкой; консоль сотруднику клиники не видна и
		 * ничего ему не показывает.
		 */
		logger.error(
			`DENTE boot failed (${this.props.audience})`,
			error,
			errorInfo.componentStack,
		);
	}

	render() {
		if (this.state.failed) {
			const copy = bootErrorCopy[this.props.audience];

			return (
				<main
					className="boot-state boot-state-error"
					role="alert"
					aria-live="assertive"
				>
					<h1>DENTE</h1>
					<p>{copy.lead}</p>
					<p>{bootErrorDetail(this.props.audience, this.state.error)}</p>
					<button
						type="button"
						onClick={() => requestBootRefresh(this.props.audience)}
					>
						{copy.actionLabel}
					</button>
				</main>
			);
		}

		return this.props.children;
	}
}
