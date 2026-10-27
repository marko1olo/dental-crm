export interface PaymentQuickPresetsParams {
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly isWarranty100: boolean;
	readonly setIsWarranty100: (val: boolean) => void;
	readonly setDiscountPercent: (val: number) => void;
	readonly setDiscountReason: (val: string) => void;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly availableDmsCoverageRub?: number | undefined;
	readonly splitCardRub: number;
	readonly splitCashRub: number;
	readonly splitDepositRub: number;
	readonly splitSbpRub: number;
	readonly splitCertificateRub: number;
	readonly splitBonusRub: number;
	readonly splitDmsRub: number;
	readonly resetSplitTenders: (overrides?: any) => void;
	readonly setActiveMethod: (m: any) => void;
	readonly setReceivedCashRub: (v: number) => void;
}
