import React from "react";
import { Layers, Send, Wrench } from "lucide-react";
import { PresetButton } from "./PresetButton";
import type { OrthoClinicalPresetsSectionProps } from "./types";

export const AuxiliaryPresets: React.FC<OrthoClinicalPresetsSectionProps> = (props) => {
	const {
		activePreset,
		onPresetSprings,
		onPresetSeparationRings,
		onPresetAlignerLabOrder,
		onPresetRetainerLabOrder,
		onPresetPlateLabOrder,
		onPresetSplintLabOrder,
		alignerStep,
		alignerTotal,
	} = props;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
			{onPresetSprings && (
				<PresetButton
					title="Активация пружин"
					subtitle="(раскрывающие Open Coil / закрывающие)"
					isActive={activePreset === "springs"}
					onClick={onPresetSprings}
					icon={<Wrench size={13} />}
					testId="ortho-preset-springs"
				/>
			)}
			{onPresetSeparationRings && (
				<PresetButton
					title="Сепарация под кольца"
					subtitle="(эластические кольца под кольца/замки)"
					isActive={activePreset === "separation"}
					onClick={onPresetSeparationRings}
					icon={<Layers size={13} />}
					testId="ortho-preset-separation-rings"
				/>
			)}
			<PresetButton
				title="Наряд ЗТЛ (Элайнеры / Каппа)"
				subtitle={`шаг ${alignerStep} из ${alignerTotal} · срок 5-7 дней`}
				isActive={activePreset === "lab_aligners"}
				onClick={onPresetAlignerLabOrder}
				icon={<Send size={13} />}
				testId="ortho-preset-aligner-lab-order"
			/>
			<PresetButton
				title="Наряд ЗТЛ (Ретейнер / Каппа)"
				subtitle="Наряд в лабораторию / изготовление"
				isActive={activePreset === "lab_retainer"}
				onClick={onPresetRetainerLabOrder}
				icon={<Send size={13} />}
				testId="ortho-preset-retainer-lab-order"
			/>
			<PresetButton
				title="Наряд ЗТЛ (Пластинка с винтом)"
				subtitle="Наряд на съемную пластинку с винтом"
				isActive={activePreset === "lab_plate"}
				onClick={onPresetPlateLabOrder}
				icon={<Send size={13} />}
				testId="ortho-preset-plate-lab-order"
			/>
			<PresetButton
				title="Наряд ЗТЛ (Окклюзионный сплинт)"
				subtitle="миорелаксирующий / шина ВНЧС"
				isActive={activePreset === "lab_splint"}
				onClick={onPresetSplintLabOrder}
				icon={<Send size={13} />}
				testId="ortho-preset-splint-lab-order"
			/>
		</div>
	);
};
