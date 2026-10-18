import { SoundFeedbackService } from "../../../../services/audio/SoundFeedbackService";
import { showToast } from "../../../GlobalToast";
import {
	type ToothState,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	applyFastCariesK021Protocol,
	applyFastProHygieneProtocol,
} from "../toothChartTypes";
import { useToothChartVoiceAndHotkeys } from "./useToothChartVoiceAndHotkeys";

export interface ToothChartExpressActionsOptions {
	isMixedEffective: boolean;
	isPediatricEffective: boolean;
	selectedTeeth: number[];
	externalMarkIntact?: (() => void) | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onMarkProHygieneDone?: ((protocol: any) => void) | undefined;
	onApplyFastCariesK021?: ((protocol: any) => void) | undefined;
}

export function useToothChartExpressActions({
	isMixedEffective,
	isPediatricEffective,
	selectedTeeth,
	externalMarkIntact,
	onQuickStateChange,
	onMarkProHygieneDone,
	onApplyFastCariesK021,
}: ToothChartExpressActionsOptions) {
	useToothChartVoiceAndHotkeys(selectedTeeth, onQuickStateChange);

	const handleMarkIntactDentition = () => {
		if (externalMarkIntact) {
			externalMarkIntact();
			return;
		}
		if (onQuickStateChange) {
			const allTargets = isMixedEffective
				? [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH]
				: isPediatricEffective
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
				: [...TOP_TEETH, ...BOTTOM_TEETH];
			onQuickStateChange(allTargets, "Healthy", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Вся зубная формула отмечена как санированная (интактная)", "success");
		}
	};

	const handleMarkWisdomTeethMissing = () => {
		if (onQuickStateChange) {
			onQuickStateChange([18, 28, 38, 48], "Missing", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkMolarsMissing = () => {
		if (onQuickStateChange) {
			onQuickStateChange([16, 26, 36, 46], "Missing", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Моляры (16, 26, 36, 46) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkFrontIntact = () => {
		if (onQuickStateChange) {
			onQuickStateChange([13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33], "Healthy", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Фронтальная группа зубов отмечена как интактная", "success");
		}
	};

	const handleMarkProHygieneDone = () => {
		if (onQuickStateChange) {
			const allTargets = isMixedEffective
				? [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH]
				: isPediatricEffective
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
				: [...TOP_TEETH, ...BOTTOM_TEETH];
			onQuickStateChange(allTargets, "Healthy", []);
		}
		const protocol = applyFastProHygieneProtocol();
		onMarkProHygieneDone?.(protocol);
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Профессиональная гигиена: протокол ${protocol.diagnosis} и услуга ${protocol.serviceCode} (${protocol.serviceName}) добавлены`, "success");
	};

	const handleApplyFastCariesK021 = () => {
		const targetTooth = selectedTeeth.length > 0 ? selectedTeeth[0]! : (isPediatricEffective ? 51 : 16);
		onQuickStateChange?.([targetTooth], "Caries", ["O"]);
		const protocol = applyFastCariesK021Protocol(targetTooth);
		onApplyFastCariesK021?.(protocol);
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Кариес дентина (K02.1) зуба ${targetTooth}: протокол ${protocol.diagnosis} и пломба ${protocol.serviceCode} добавлены`, "success");
	};

	return {
		handleMarkIntactDentition,
		handleMarkWisdomTeethMissing,
		handleMarkMolarsMissing,
		handleMarkFrontIntact,
		handleMarkProHygieneDone,
		handleApplyFastCariesK021,
	};
}
