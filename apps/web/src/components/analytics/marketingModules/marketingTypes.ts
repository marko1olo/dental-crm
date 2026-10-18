import type {
	AdvertisingChannelPerformanceInput,
	PatientAttributionRecord,
} from "@dental/shared";

export type MarketingTabType = "funnel" | "channels" | "attributions";
export type MarketingPeriodType = "current_month" | "prev_month" | "quarter_3" | "year_2026";

export interface MarketingRoiModalProps {
	isOpen: boolean;
	onClose: () => void;
	clinicName?: string;
	customChannels?: AdvertisingChannelPerformanceInput[];
	customAttributions?: PatientAttributionRecord[];
}

export interface ChannelPerformanceRow {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	adSpendFormatted: string;
	callsCount: number;
	cplFormatted: string;
	bookedAppointmentsCount: number;
	cpaFormatted: string;
	paidPlansCount: number;
	revenueFormatted: string;
	cacFormatted: string;
	profitFormatted: string;
	profitKopecks: number;
	romiFormatted: string;
	romiStatus: string;
	notes?: string | undefined;
}
