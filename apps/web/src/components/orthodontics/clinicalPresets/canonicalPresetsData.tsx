import React from "react";
import { Check, Sparkles, Zap, Layers, Activity } from "lucide-react";
import type { OrthoClinicalPresetsSectionProps } from "./types";

export interface ChairsidePresetItem {
	id: string;
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	action?: (() => void) | undefined;
	testId: string;
}

export function buildCanonicalPresets(props: OrthoClinicalPresetsSectionProps): ChairsidePresetItem[] {
	return [
		{
			id: "niti_014_activation",
			title: "Активация дуги 0.14 NiTi",
			subtitle: "Замена лигатур, нивелирующая дуга NiTi .014, контроль фиксации замков",
			icon: <Zap size={14} />,
			action: props.onPresetNiti014Activation,
			testId: "ortho-preset-niti-014-activation",
		},
		{
			id: "power_chain_change",
			title: "Смена эластических цепочек (power chain)",
			subtitle: "Консолидация дуги, закрытие трем и диастем, дуга SS .019x.025",
			icon: <Layers size={14} />,
			action: props.onPresetPowerChainChange,
			testId: "ortho-preset-power-chain-change",
		},
		{
			id: "bonding_both_mbt",
			title: "Фиксация брекет-системы верх/низ Roth/MBT .022",
			subtitle: "Прямая фиксация обеих челюстей (17-27, 47-37), дуги NiTi .014, выдача воска",
			icon: <Sparkles size={14} />,
			action: props.onPresetBondingBothMbt,
			testId: "ortho-preset-bonding-both-mbt",
		},
		{
			id: "aligner_scan",
			title: "Снятие слепков / 3D-сканирование под элайнеры",
			subtitle: "Оптический оттиск ВЧ/НЧ, регистрат прикуса, наряд в ЗТЛ на 3D-сетап",
			icon: <Activity size={14} />,
			action: props.onPresetAlignerScan,
			testId: "ortho-preset-aligner-scan",
		},
		{
			id: "aligner_trays_1_4",
			title: "Выдача капп 1-4 + аттачменты",
			subtitle: "Сдача капп 1-4, композитные аттачменты на клыки/премоляры, инструктаж",
			icon: <Check size={14} />,
			action: props.onPresetAlignerTrays1To4,
			testId: "ortho-preset-aligner-trays-1-4",
		},
	];
}
