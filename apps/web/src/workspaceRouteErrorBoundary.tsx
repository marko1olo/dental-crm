import { Component, type ErrorInfo, type PropsWithChildren } from "react";

export type LazyWorkspaceView =
	| "schedule"
	| "patients"
	| "documents"
	| "finance"
	| "analytics"
	| "communications"
	| "inbox"
	| "settings"
	| "visit"
	| "imaging"
	| "marketing"
	| "scanner"
	| "inventory"
	| "payroll";

type WorkspaceRouteErrorBoundaryProps = PropsWithChildren<{
	label: string;
	panelClassName: string;
	panelId: string;
	view: LazyWorkspaceView;
}>;

type WorkspaceRouteErrorBoundaryState = {
	detail: string;
	hasError: boolean;
};

function workspaceRouteErrorDetail(error: unknown): string {
	if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
		return "Файлы раздела не загрузились. Обычно помогает обновление после восстановления сети.";
	}

	return "Раздел остановлен до перезагрузки, чтобы не показывать неполные данные.";
}

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
	state: WorkspaceRouteErrorBoundaryState = { detail: "", hasError: false };

	static getDerivedStateFromError(
		error: unknown,
	): WorkspaceRouteErrorBoundaryState {
		return { detail: workspaceRouteErrorDetail(error), hasError: true };
	}

	componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
		if (!import.meta.env.PROD) {
			console.error(
				`DENTE route failed: ${this.props.view}`,
				error,
				errorInfo.componentStack,
			);
		}
	}

	componentDidUpdate(previousProps: WorkspaceRouteErrorBoundaryProps) {
		if (previousProps.view !== this.props.view && this.state.hasError) {
			this.setState({ detail: "", hasError: false });
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<section
					className={`${this.props.panelClassName} workspace-route-error flex items-center justify-center p-8`}
					id={this.props.panelId}
					role="alert"
					aria-live="assertive"
				>
					<div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md shadow-xl text-center max-w-sm">
						<svg
							className="w-12 h-12 text-red-500/80 mb-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<h3 className="text-xl font-medium mb-2 opacity-90">Сбой модуля</h3>
						<p className="text-sm opacity-70 mb-6">
							Не удалось загрузить этот раздел.
						</p>
						<div className="flex gap-2">
							<button
								className="px-6 py-2.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
								type="button"
								onClick={() => this.setState({ hasError: false, detail: "" })}
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Повторить
							</button>
							<button
								className="px-6 py-2.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200"
								type="button"
								onClick={requestDenteStaleWorkspaceRefresh}
							>
								Обновить страницу
							</button>
						</div>
					</div>
				</section>
			);
		}

		return this.props.children;
	}
}
