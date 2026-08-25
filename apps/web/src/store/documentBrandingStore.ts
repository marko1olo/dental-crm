import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DocumentBrandColor =
	| "medical_navy"
	| "deep_teal"
	| "royal_burgundy"
	| "pure_slate"
	| "gold_luxury";

export type DocumentDensity = "compact" | "comfortable" | "formal";
export type DocumentFontFamily = "sans" | "serif" | "mono";
export type DocumentHeaderStyle = "modern_split" | "classic_centered" | "minimal_clean";

export interface DocumentBrandingState {
	// Clinic Identity & Requisites
	clinicName: string;
	clinicLegalName: string;
	licenseNumber: string;
	clinicAddress: string;
	clinicPhone: string;
	clinicEmail: string;
	clinicWebsite: string;
	clinicInn: string;
	clinicOgrn: string;
	logoUrl: string | null;
	slogan: string;

	// Visual Appearance & Theme
	brandAccentColor: DocumentBrandColor;
	layoutDensity: DocumentDensity;
	fontFamily: DocumentFontFamily;
	headerStyle: DocumentHeaderStyle;

	// Content & Security Modules
	showClinicLogo: boolean;
	showClinicRequisites: boolean;
	showQrVerification: boolean;
	showOdontogramDiagram: boolean;
	showRadiologyThumbnails: boolean;
	showDetailedSoap: boolean;
	showDoctorStampFrame: boolean;
	showPatientSignatureLine: boolean;
	customDisclaimer: string;
	customWatermarkText: string;

	// Actions
	updateBranding: (patch: Partial<DocumentBrandingState>) => void;
	resetToDefaults: () => void;
}

export const BRAND_COLOR_PALETTES: Record<
	DocumentBrandColor,
	{
		label: string;
		primary: string;
		primaryDark: string;
		softBg: string;
		accentBorder: string;
		textOnPrimary: string;
	}
> = {
	medical_navy: {
		label: "Классический медицинский (Navy)",
		primary: "#1e3a8a",
		primaryDark: "#172554",
		softBg: "#eff6ff",
		accentBorder: "#93c5fd",
		textOnPrimary: "#ffffff",
	},
	deep_teal: {
		label: "Клинический изумрудно-бирюзовый (Teal)",
		primary: "#0f766e",
		primaryDark: "#134e4a",
		softBg: "#f0fdfa",
		accentBorder: "#99f6e4",
		textOnPrimary: "#ffffff",
	},
	royal_burgundy: {
		label: "Премиальный бордо (Royal Burgundy)",
		primary: "#831843",
		primaryDark: "#701a75",
		softBg: "#fdf2f8",
		accentBorder: "#fbcfe8",
		textOnPrimary: "#ffffff",
	},
	pure_slate: {
		label: "Строгий монохромный графит (Slate)",
		primary: "#0f172a",
		primaryDark: "#020617",
		softBg: "#f8fafc",
		accentBorder: "#cbd5e1",
		textOnPrimary: "#ffffff",
	},
	gold_luxury: {
		label: "Золотой VIP контур (Luxury Gold)",
		primary: "#b45309",
		primaryDark: "#78350f",
		softBg: "#fffbeb",
		accentBorder: "#fde68a",
		textOnPrimary: "#ffffff",
	},
};

const DEFAULT_BRANDING: Omit<DocumentBrandingState, "updateBranding" | "resetToDefaults"> = {
	clinicName: "Стоматологическая клиника «DENTE»",
	clinicLegalName: "ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»",
	licenseNumber: "№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения",
	clinicAddress: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
	clinicPhone: "+7 (495) 777-88-99",
	clinicEmail: "info@dente-clinic.ru",
	clinicWebsite: "dente-clinic.ru",
	clinicInn: "7701234567",
	clinicOgrn: "1237700123456",
	logoUrl: null,
	slogan: "Премиальная цифровая стоматология и имплантология",

	brandAccentColor: "deep_teal",
	layoutDensity: "comfortable",
	fontFamily: "sans",
	headerStyle: "modern_split",

	showClinicLogo: true,
	showClinicRequisites: true,
	showQrVerification: true,
	showOdontogramDiagram: true,
	showRadiologyThumbnails: true,
	showDetailedSoap: true,
	showDoctorStampFrame: true,
	showPatientSignatureLine: true,
	customDisclaimer:
		"Пациент уведомлен о плане лечения, гарантийных обязательствах и необходимости соблюдения гигиенических рекомендаций. В случае возникновения жалоб обращаться к лечащему врачу.",
	customWatermarkText: "",
};

export const useDocumentBrandingStore = create<DocumentBrandingState>()(
	persist(
		(set) => ({
			...DEFAULT_BRANDING,
			updateBranding: (patch) => set((state) => ({ ...state, ...patch })),
			resetToDefaults: () => set(DEFAULT_BRANDING),
		}),
		{
			name: "dente_doc_branding_v1",
		},
	),
);
