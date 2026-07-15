import { create } from "zustand";

export interface TourStep {
	targetId: string; // The DOM element ID to highlight
	title: string;
	content: string;
	placement?: "top" | "bottom" | "left" | "right" | "center";
}

export type TourModule =
	| "imaging"
	| "schedule"
	| "emk"
	| "odontogram"
	| "finance"
	| null;

interface OnboardingState {
	activeModule: TourModule;
	currentStepIndex: number;
	steps: TourStep[];
	isActive: boolean;
	startTour: (module: TourModule, steps: TourStep[]) => void;
	nextStep: () => void;
	prevStep: () => void;
	endTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
	activeModule: null,
	currentStepIndex: 0,
	steps: [],
	isActive: false,
	startTour: (module, steps) =>
		set({ activeModule: module, steps, currentStepIndex: 0, isActive: true }),
	nextStep: () => {
		const { currentStepIndex, steps } = get();
		if (currentStepIndex < steps.length - 1) {
			set({ currentStepIndex: currentStepIndex + 1 });
		} else {
			get().endTour();
		}
	},
	prevStep: () => {
		const { currentStepIndex } = get();
		if (currentStepIndex > 0) {
			set({ currentStepIndex: currentStepIndex - 1 });
		}
	},
	endTour: () =>
		set({
			isActive: false,
			activeModule: null,
			steps: [],
			currentStepIndex: 0,
		}),
}));
