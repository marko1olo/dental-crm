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

export type { CommunicationsViewProps };

export function CommunicationsView(
	rawProps?: Partial<CommunicationsViewProps>,
) {
	const ctrl = useCommunicationsViewController(rawProps);

	if (ctrl.isMobile) {
		return <CommunicationsMobilePane ctrl={ctrl} />;
	}

	return (
		<div
			className="panel communications-panel"
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
