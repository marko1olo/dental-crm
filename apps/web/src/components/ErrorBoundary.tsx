import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * ГРАНИЦА ОШИБОК ВОКРУГ ТЯЖЁЛЫХ БЛОКОВ НАСТРОЕК. Смонтирована в SettingsView.tsx
 * трижды: «Правила и регламенты», «Мессенджеры и рассылки», «Умный разбор
 * выгрузки».
 *
 * ЧТО БЫЛО СЛОМАНО. В разметку отказа безусловно подставлялся
 * `{this.state.error?.message}` — без единой проверки режима сборки. Текст
 * исключения в этой системе несёт что угодно: путь внутри бандла, имя таблицы,
 * фрагмент SQL, идентификатор записи, тело ответа сервера. Администратор клиники
 * не разработчик, объяснить ему эта строка ничего не может, а показывает она
 * внутреннее устройство системы. OWASP («Improper Error Handling») называет
 * ровно это: наружу отдаётся общая фраза, подробности уходят в журнал.
 *
 * ПОЧЕМУ ИМЕННО ТАК, А НЕ СВОИМ СПОСОБОМ. Устройство повторяет соседнюю границу
 * разделов (`workspaceRouteErrorBoundary.tsx`) и границу точки входа
 * (`bootErrorBoundary.tsx`): решение «показывать технический текст или нет»
 * вынесено в ЧИСТУЮ функцию с признаком режима в аргументе. Иначе его нечем
 * проверить: `error.message` — обычная строка, typecheck на неё зелёный, а
 * `import.meta.env` в node:test не существует. Тест лежит рядом:
 * `tests/moduleErrorBoundary.test.ts`.
 *
 * ЧТО ОСТАЛОСЬ НА ЭКРАНЕ. Только литералы этого файла плюс `moduleName` —
 * подпись блока, которую передаёт SettingsView и которая к содержимому
 * исключения отношения не имеет.
 */

interface Props {
	children?: ReactNode;
	/** Запасная разметка вместо стандартной панели отказа. */
	fallback?: ReactNode;
	/** Подпись блока для человека. Приходит литералом из SettingsView. */
	moduleName?: string;
}

export type ModuleErrorPresentation = {
	/** Русская фраза для сотрудника. Никогда не содержит текст исключения. */
	readonly detail: string;
	/**
	 * Полный технический текст со стеком. Пустая строка везде, кроме разработки:
	 * в production это выдача внутреннего устройства на экран клиники.
	 */
	readonly diagnostics: string;
};

export type ModuleErrorPresentationOptions = {
	/** Только для разработки. В production — строго false. */
	readonly includeDiagnostics: boolean;
};

/**
 * Фраза для человека. Разделение то же самое, что у двух соседних границ:
 * недогруженный чанк — единственный случай, когда повтор действительно помогает,
 * поэтому он отделён от всех остальных сбоев. Текст исключения не подставляется
 * ни в одной ветке.
 */
export function moduleErrorDetail(error: unknown): string {
	if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
		return "Файлы этого блока не загрузились. Обычно помогает повтор после восстановления сети.";
	}

	return "Блок остановлен до повтора, чтобы не показывать неполные настройки.";
}

function moduleErrorDiagnostics(error: unknown): string {
	if (!(error instanceof Error)) {
		return String(error);
	}

	const stack = error.stack?.trim() ?? "";
	return stack.length > 0
		? `[Error] ${error.message}\n${stack}`
		: `[Error] ${error.message}`;
}

export function moduleErrorPresentation(
	error: unknown,
	options: ModuleErrorPresentationOptions,
): ModuleErrorPresentation {
	return {
		detail: moduleErrorDetail(error),
		diagnostics: options.includeDiagnostics ? moduleErrorDiagnostics(error) : "",
	};
}

interface State {
	/*
	 * Признак отказа хранится отдельно от разбора СПЕЦИАЛЬНО: бросить можно и
	 * `undefined`, и тогда проверка «есть ли ошибка» по значению вернула бы «нет»
	 * и выпустила сломанное поддерево обратно на экран.
	 */
	hasError: boolean;
	presentation: ModuleErrorPresentation | null;
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		presentation: null,
	};

	public static getDerivedStateFromError(error: unknown): State {
		return {
			hasError: true,
			presentation: moduleErrorPresentation(error, {
				// Разработчик видит полный стек прямо на экране, сотрудник клиники —
				// никогда. Признак режима тот же, что и в остальном apps/web:
				// workspaceRouteErrorBoundary.tsx, main.tsx.
				includeDiagnostics: !import.meta.env.PROD,
			}),
		};
	}

	public componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
		/*
		 * Журнал ведётся в ЛЮБОМ режиме, включая production: после того как текст
		 * ошибки убран с экрана, консоль — единственный оставшийся след сбоя.
		 * Отдельного сборщика ошибок в apps/web нет ни одного (см. dependencies),
		 * заводить его ради этой строки — отдельное решение. Консоль сотруднику
		 * клиники не видна и ничего ему не показывает. Обе соседние границы
		 * (workspaceRouteErrorBoundary.tsx, bootErrorBoundary.tsx) пишут в консоль
		 * безусловно с той же мотивировкой.
		 */
		console.error(
			`ErrorBoundary caught an error in ${this.props.moduleName || "a component"}:`,
			error,
			errorInfo.componentStack,
		);
	}

	private handleReset = () => {
		this.setState({ hasError: false, presentation: null });
	};

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const presentation = this.state.presentation;

			return (
				<div className="error-boundary-container flex flex-col items-center justify-center p-8 m-4 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md transition-all duration-300">
					<div className="flex items-center gap-3 mb-4 text-red-500">
						<AlertTriangle className="w-8 h-8" />
						<h3 className="text-xl font-medium tracking-tight">
							Ошибка рендеринга
						</h3>
					</div>
					<p className="text-sm text-foreground/70 mb-6 text-center max-w-md">
						Не удалось загрузить раздел{" "}
						{this.props.moduleName ? `«${this.props.moduleName}»` : ""}.
						<br />
						{presentation ? presentation.detail : moduleErrorDetail(null)}
					</p>
					{presentation && presentation.diagnostics ? (
						<pre className="mb-6 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground/60">
							{presentation.diagnostics}
						</pre>
					) : null}
					<button
						onClick={this.handleReset}
						className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
					>
						<RefreshCw className="w-4 h-4" />
						Повторить загрузку
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
