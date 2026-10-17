import React from "react";
import { CheckCircle2, RotateCcw, Sparkles, Zap } from "lucide-react";
import { PresetButton } from "./PresetButton";
import type { OrthoClinicalPresetsSectionProps } from "./types";

export const RoutinePresets: React.FC<OrthoClinicalPresetsSectionProps> = (props) => {
	const {
		activePreset,
		onPresetActivation,
		onPresetWireChange,
		onPresetBonding,
		onPresetDebonding,
		onPresetLeveling,
	} = props;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
			<PresetButton
				title="Плановая активация"
				subtitle="(смена лигатур / эластиков, дуги сохранены)"
				isActive={activePreset === "activation"}
				onClick={onPresetActivation}
				icon={<RotateCcw size={13} />}
				testId="ortho-preset-routine-activation"
			/>
			<PresetButton
				title="Смена дуг"
				subtitle="(.014 NiTi -> .016x.022 сталь)"
				isActive={activePreset === "wire_change"}
				onClick={onPresetWireChange}
				icon={<Zap size={13} />}
				testId="ortho-preset-wire-change"
			/>
			<PresetButton
				title="Фиксация брекет-системы"
				subtitle="(Damon Q2 / Clear, прямой протокол)"
				isActive={activePreset === "bonding"}
				onClick={onPresetBonding}
				icon={<Sparkles size={13} />}
				testId="ortho-preset-bracket-bonding"
			/>
			<PresetButton
				title="Снятие брекет-системы"
				subtitle="(дебондинг, полировка, ретенция)"
				isActive={activePreset === "debonding"}
				onClick={onPresetDebonding}
				icon={<CheckCircle2 size={13} />}
				testId="ortho-preset-debonding-retainer"
			/>
			{onPresetLeveling && (
				<PresetButton
					title="Смена дуг: нивелирование"
					subtitle="(круглые термоактивные дуги NiTi)"
					isActive={activePreset === "leveling"}
					onClick={onPresetLeveling}
					icon={<RotateCcw size={13} />}
					testId="ortho-preset-leveling"
				/>
			)}
		</div>
	);
};
