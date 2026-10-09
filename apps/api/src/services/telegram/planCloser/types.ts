export type TelegramInlineButton = {
	text: string;
	callback_data?: string;
	url?: string;
};

export type TelegramInlineKeyboard = {
	inline_keyboard: TelegramInlineButton[][];
};

export type CloserScreenResult = {
	text: string;
	replyMarkup: TelegramInlineKeyboard;
};

export interface TreatmentPlanStageInfo {
	stageIndex: number;
	name: string;
	description: string;
	priceRub: number;
	estimatedVisits?: number;
	timelineDays?: number;
	isCompleted?: boolean;
}

export type BankProviderKey = "tinkoff" | "sberbank" | "otp" | "clinic_internal";
export type InstallmentMonths = 3 | 6 | 12 | 24;

export interface BankInstallmentOption {
	months: InstallmentMonths;
	monthlyPaymentRub: number;
	monthlyPaymentRu: string;
	partsRub: number[];
	totalAmountRub: number;
	downPaymentRub: number;
	financedAmountRub: number;
	overpaymentRub: number;
	interestRatePercent: number;
	bankProvider: BankProviderKey;
	bankNameRu: string;
	ndflRefundRub: number;
}

export interface PendingTreatmentPlanSummary {
	planId: string;
	organizationId: string;
	patientId: string;
	patientName: string;
	patientPhone: string | null;
	doctorId: string | null;
	doctorName: string;
	doctorTitle: string;
	title: string;
	name: string;
	status: string;
	totalPriceRub: number;
	teeth: number[];
	createdAt: Date;
	hoursSinceCreation: number;
	followUpEligible: boolean;
	telegramChatLinked: boolean;
	telegramChatId?: string | null;
	stages: TreatmentPlanStageInfo[];
	installments: Record<
		InstallmentMonths,
		{
			monthlyPaymentRub: number;
			monthlyPaymentFormatted: string;
		}
	>;
}

export interface CloserCallbackParams {
	callbackData: string;
	callbackQueryId?: string | null | undefined;
	chatFingerprint: string;
	chatId: string;
	messageId: number | null;
	botToken: string;
	organizationId?: string | null | undefined;
	clinicId?: string | null | undefined;
	botConfigId?: string | null | undefined;
}

export interface CloserCallbackResult {
	handled: boolean;
	action: string;
	screen?: CloserScreenResult;
	error?: string;
}

export interface CreateInstallmentLeadInput {
	planId: string;
	monthsCount: InstallmentMonths;
	downPaymentRub?: number | undefined;
	bankProvider?: BankProviderKey | undefined;
	notes?: string | undefined;
	organizationId?: string | undefined;
}

export interface CreateCuratorCallInput {
	planId: string;
	notes?: string | undefined;
	organizationId?: string | undefined;
}
