import type {
	TopBarCoreProps,
	TopBarEmergencyAndSyncProps,
	TopBarNoticeAndErrorProps,
} from "./topBarBaseTypes";
import type {
	TopBarOnboardingDraftProps,
	TopBarOnboardingProps,
} from "./topBarOnboardingDraftTypes";

export type {
	TopBarCoreProps,
	TopBarEmergencyAndSyncProps,
	TopBarNoticeAndErrorProps,
	TopBarOnboardingDraftProps,
	TopBarOnboardingProps,
};

export interface AppTopBarProps
	extends TopBarCoreProps,
		TopBarEmergencyAndSyncProps,
		TopBarNoticeAndErrorProps,
		TopBarOnboardingProps {}
