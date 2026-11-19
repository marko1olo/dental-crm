import { lazy, Suspense } from "react";
import {
	CommunicationsActiveChatPane,
	CommunicationsChannelFilterBar,
	CommunicationsMobilePane,
	useCommunicationsViewController,
} from "./components/communications/communicationsViewModules";
import type { CommunicationsViewProps } from "./components/communications/communicationsViewModules";

const OmnichannelOperatorDesk = lazy(() =>
	import("./components/chat/OmnichannelOperatorDesk").then((module) => ({
		default: module.OmnichannelOperatorDesk,
	})),
);

export type { CommunicationsViewProps };

export function CommunicationsView(
	rawProps?: Partial<CommunicationsViewProps>,
) {
	const ctrl = useCommunicationsViewController(rawProps);

	if (ctrl.isMobile) {
		if (ctrl.activeSection === "omnichannel") {
			return (
				<div className="w-full max-w-full overflow-x-clip h-[calc(100dvh-196px)] bg-[var(--paper)] p-1.5 box-border flex flex-col gap-1" data-testid="communications-view">
					<div className="flex items-center justify-between pb-2 border-b border-[var(--line)] shrink-0 gap-2">
						<button
							type="button"
							onClick={() => ctrl.setActiveSection("tasks")}
							className="inline-flex items-center justify-center min-h-[44px] h-11 px-4 rounded-xl text-sm font-semibold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors shrink-0"
						>
							← Очередь задач
						</button>
						<span className="text-sm font-semibold text-[var(--ink)]">Омниканальный чат</span>
					</div>
					<div className="flex-1 min-h-0 overflow-hidden">
						<Suspense fallback={null}>
							<OmnichannelOperatorDesk />
						</Suspense>
					</div>
				</div>
			);
		}
		return <CommunicationsMobilePane ctrl={ctrl} />;
	}

	return (
		<div
			className="panel communications-panel w-full max-w-full overflow-x-clip"
			id="communications"
			data-testid="communications-view"
		>
			<CommunicationsChannelFilterBar
				activeSection={ctrl.activeSection}
				onSelectSection={ctrl.setActiveSection}
				onOpenRecallsHub={() => {
					ctrl.setIsOmnichannelHubOpen(false);
					window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"));
				}}
				onOpenOmnichannelHub={() => {
					ctrl.setIsRecallsHubOpen(false);
					ctrl.setActiveSection("omnichannel");
				}}
				onGoToSchedule={ctrl.onGoToSchedule}
				isMoreMenuOpen={ctrl.isMoreMenuOpen}
				onToggleMoreMenu={() => ctrl.setIsMoreMenuOpen((prev) => !prev)}
				onCloseMoreMenu={() => ctrl.setIsMoreMenuOpen(false)}
			/>

			<CommunicationsActiveChatPane ctrl={ctrl} />
		</div>
	);
}

export default CommunicationsView;
