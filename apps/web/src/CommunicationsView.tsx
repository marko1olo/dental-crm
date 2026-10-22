import { lazy, Suspense } from "react";
import {
	CommunicationsActiveChatPane,
	CommunicationsChannelFilterBar,
	CommunicationsMobilePane,
	useCommunicationsViewController,
} from "./components/communications/communicationsViewModules";
import type { CommunicationsViewProps } from "./components/communications/communicationsViewModules";

const PatientRecallsHubModal = lazy(() =>
	import("./components/recalls/PatientRecallsHubModal").then((module) => ({
		default: module.PatientRecallsHubModal,
	})),
);

const PatientOmnichannelHubModal = lazy(() =>
	import("./components/messaging/PatientOmnichannelHubModal").then((module) => ({
		default: module.PatientOmnichannelHubModal,
	})),
);

const OmnichannelChatView = lazy(() =>
	import("./components/omnichannel_chat/OmnichannelChatView").then((module) => ({
		default: module.OmnichannelChatView,
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
				<div className="w-full max-w-full overflow-x-clip h-[calc(100dvh-124px)] bg-[var(--paper)] p-1.5 box-border flex flex-col gap-1" data-testid="communications-view">
					<div className="flex items-center justify-between pb-1 border-b border-[var(--line)] shrink-0">
						<button
							type="button"
							onClick={() => ctrl.setActiveSection("tasks")}
							className="secondary-button text-xs font-bold py-1 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						>
							← Очередь задач
						</button>
						<span className="text-xs font-bold text-[var(--ink)]">Омниканальный чат</span>
					</div>
					<div className="flex-1 min-h-0 overflow-hidden">
						<Suspense fallback={null}>
							<OmnichannelChatView />
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
					ctrl.setIsRecallsHubOpen(true);
				}}
				onOpenOmnichannelHub={() => {
					ctrl.setIsRecallsHubOpen(false);
					ctrl.setIsOmnichannelHubOpen(true);
				}}
				onGoToSchedule={ctrl.onGoToSchedule}
				isMoreMenuOpen={ctrl.isMoreMenuOpen}
				onToggleMoreMenu={() => ctrl.setIsMoreMenuOpen((prev) => !prev)}
				onCloseMoreMenu={() => ctrl.setIsMoreMenuOpen(false)}
			/>

			<CommunicationsActiveChatPane ctrl={ctrl} />

			{ctrl.isRecallsHubOpen && (
				<Suspense fallback={null}>
					<PatientRecallsHubModal
						isOpen={ctrl.isRecallsHubOpen}
						onClose={() => ctrl.setIsRecallsHubOpen(false)}
					/>
				</Suspense>
			)}

			{ctrl.isOmnichannelHubOpen && (
				<Suspense fallback={null}>
					<PatientOmnichannelHubModal
						isOpen={ctrl.isOmnichannelHubOpen}
						onClose={() => ctrl.setIsOmnichannelHubOpen(false)}
						portal={true}
					/>
				</Suspense>
			)}
		</div>
	);
}

export default CommunicationsView;
