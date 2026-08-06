import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import type { AppView } from "./workspaceShell";

/**
 * Разделы, которые грузятся лениво и потому оборачиваются этой границей ошибок.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стоял РУЧНОЙ список из десяти строк, продублированный
 * от `appViews` в workspaceShell.tsx. Когда в приложение добавили «Склад»,
 * «Стерилизацию» и «Обращения» (коммит 41a22b63d) — с подписями, подсказками,
 * иконками и регистрацией в workspacePreload.ts, то есть корректно во всех трёх
 * положенных местах, — этот список остался прежним, и сборка веба встала с тремя
 * TS2769 в App.tsx:4775/4789/4797. Продублированный перечень расходится всегда,
 * вопрос только когда.
 *
 * ПОЧЕМУ ТЕПЕРЬ ВЫВОДИТСЯ, А НЕ ДОПИСАН РУКАМИ. Добавить три строки означало бы
 * оставить ту же мину следующему разделу. Тип берётся из единственного источника
 * правды — `appViews`. Теперь новый раздел в `appViews` автоматически допустим
 * здесь, а раздел, которого в `appViews` нет, перестаёт компилироваться, — то есть
 * эта ошибка больше не возможна.
 *
 * ПОЧЕМУ «shift» БОЛЬШЕ НЕ ИСКЛЮЧЁН. Здесь стояло `Exclude<AppView, "shift">` с
 * обоснованием «это стартовый раздел, он грузится сразу и в ленивую обёртку не
 * попадает». Обоснование не соответствует коду: `ShiftView` объявлен как
 * `lazy(() => import("./ShiftView"))` (App.tsx:399) наравне с остальными
 * тринадцатью разделами, отдельного пути загрузки у него нет. Исключение из типа
 * не описывало устройство приложения, а просто ЗАПРЕЩАЛО обернуть стартовый
 * раздел этой границей — и он единственный оставался без неё.
 *
 * Импорт только типовой, он стирается при сборке; цикла с workspaceShell нет —
 * обратной зависимости от этого файла там не существует (проверено).
 */
export type LazyWorkspaceView = AppView;

type WorkspaceRouteErrorBoundaryProps = PropsWithChildren<{
	label: string;
	panelClassName: string;
	panelId: string;
	view: LazyWorkspaceView;
}>;

/**
 * Что видит человек, когда раздел не открылся.
 *
 * ЧТО БЫЛО СЛОМАНО. Прежняя функция возвращала на экран
 * `[Error] ${error.message}\n${error.stack || ''}` без единой проверки режима
 * сборки, и это значение рисовалось в `<small>` всегда. То есть администратор
 * клиники на рабочем месте получал сырой стек JavaScript: пути внутри бандла,
 * имена внутренних модулей и англоязычный текст исключения. Соседняя граница
 * ошибок оболочки (AppShell.tsx, `appShellErrorDetail`) в такой же ситуации
 * показывает человеческую русскую фразу и никогда не показывает стек — две
 * границы вели себя по-разному, и протекала та, что обёрнута вокруг всех
 * маршрутизируемых разделов.
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ ЧИСТАЯ ФУНКЦИЯ. Решение «показывать стек или нет» не видно
 * ни в типах, ни в сборке: `error.stack` — обычная строка, typecheck на неё
 * зелёный. Проверить это можно только тестом, а тест возможен только у чистой
 * функции, которой признак режима передан аргументом (в node:test
 * `import.meta.env` не существует).
 */
export type WorkspaceRouteErrorPresentation = {
	/** Русская фраза для сотрудника клиники. Никогда не содержит текст ошибки. */
	readonly hint: string;
	/**
	 * Полный технический текст ошибки со стеком. Пустая строка везде, кроме
	 * разработки: в production это утечка внутренностей бандла на экран клиники.
	 */
	readonly diagnostics: string;
	/** Время сбоя — единственная опора, которую сотрудник может назвать в поддержку. */
	readonly reference: string;
};

export type WorkspaceRouteErrorPresentationOptions = {
	/** Только для разработки. В production — строго false. */
	readonly includeDiagnostics: boolean;
	readonly occurredAt: Date;
};

/**
 * Русская фраза для сотрудника клиники. Имя и устройство функции намеренно
 * повторяют соседнюю границу ошибок оболочки — AppShell.tsx,
 * `appShellErrorDetail`, — чтобы в одном продукте не было двух разных языков
 * сообщений об ошибке. Текст исключения сюда не подставляется ни в одной ветке.
 */
export function workspaceRouteErrorDetail(error: unknown): string {
	if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
		return "Файлы раздела не загрузились. Обычно помогает обновление после восстановления сети.";
	}

	return "Раздел остановлен до обновления, чтобы не показывать неполное рабочее место.";
}

function workspaceRouteErrorDiagnostics(error: unknown): string {
	if (!(error instanceof Error)) {
		return String(error);
	}

	const stack = error.stack?.trim() ?? "";
	return stack.length > 0
		? `[Error] ${error.message}\n${stack}`
		: `[Error] ${error.message}`;
}

export function workspaceRouteErrorPresentation(
	error: unknown,
	options: WorkspaceRouteErrorPresentationOptions,
): WorkspaceRouteErrorPresentation {
	return {
		hint: workspaceRouteErrorDetail(error),
		diagnostics: options.includeDiagnostics
			? workspaceRouteErrorDiagnostics(error)
			: "",
		reference: options.occurredAt.toLocaleString("ru-RU"),
	};
}

type WorkspaceRouteErrorBoundaryState = {
	presentation: WorkspaceRouteErrorPresentation | null;
};

function requestDenteStaleWorkspaceRefresh(): void {
	navigator.serviceWorker?.controller?.postMessage({
		type: "DENTE_CLEAR_SHELL_CACHE",
	});
	window.setTimeout(() => window.location.reload(), 50);
}

export class WorkspaceRouteErrorBoundary extends Component<
	WorkspaceRouteErrorBoundaryProps,
	WorkspaceRouteErrorBoundaryState
> {
	state: WorkspaceRouteErrorBoundaryState = { presentation: null };

	static getDerivedStateFromError(
		error: unknown,
	): WorkspaceRouteErrorBoundaryState {
		return {
			presentation: workspaceRouteErrorPresentation(error, {
				// Разработчик видит полный стек прямо на экране, сотрудник клиники — никогда.
				// Признак режима тот же, что и в остальном apps/web: AppShell.tsx, main.tsx.
				includeDiagnostics: !import.meta.env.PROD,
				occurredAt: new Date(),
			}),
		};
	}

	componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
		// Консоль получает ошибку целиком в любом режиме, включая production. Раньше
		// журналирование было закрыто проверкой `!import.meta.env.PROD`, и после того
		// как стек убран с экрана, в production не осталось бы вообще ни одного следа
		// сбоя. Консоль не видна сотруднику клиники и ничего ему не показывает.
		console.error(
			`DENTE route failed: ${this.props.view}`,
			error,
			errorInfo.componentStack,
		);
	}

	componentDidUpdate(previousProps: WorkspaceRouteErrorBoundaryProps) {
		if (previousProps.view !== this.props.view && this.state.presentation) {
			this.setState({ presentation: null });
		}
	}

	private retryWorkspaceRoute = () => {
		// Мягкий повтор: раздел монтируется заново без перезагрузки страницы, поэтому
		// незаписанные данные в других панелях рабочего места остаются на месте.
		this.setState({ presentation: null });
	};

	render() {
		const presentation = this.state.presentation;

		if (presentation) {
			return (
				<section
					className={`${this.props.panelClassName} workspace-route-error`}
					id={this.props.panelId}
					role="alert"
					aria-live="assertive"
				>
					<div className="panel-heading">
						<h2>{this.props.label}</h2>
						<span className="status-pill status-needs_review">
							не открылось
						</span>
					</div>
					<p>Раздел временно не открылся. Уже введенные данные не менялись.</p>
					<small>{presentation.hint}</small>
					<small>
						Если раздел не открывается и после обновления — сообщите в поддержку
						время сбоя: {presentation.reference}
					</small>
					{presentation.diagnostics ? (
						<small className="block max-w-full overflow-x-auto font-mono text-xs whitespace-pre-wrap break-words">
							{presentation.diagnostics}
						</small>
					) : null}
					<div className="flex flex-wrap gap-2">
						<button
							className="secondary-button"
							type="button"
							onClick={this.retryWorkspaceRoute}
						>
							Повторить открытие
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={requestDenteStaleWorkspaceRefresh}
						>
							Обновить рабочее место
						</button>
					</div>
				</section>
			);
		}

		return this.props.children;
	}
}
