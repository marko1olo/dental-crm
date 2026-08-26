/**
 * AnesthesiaAnatomyMapWidget.tsx — Anatomical Numbness Zones Visualization
 * Standards: Минздрав РФ, СтАР
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { TechniqueSpecification } from './anesthesiaTechniqueTypes';

export interface AnesthesiaAnatomyMapWidgetProps {
	readonly currentTechnique: TechniqueSpecification;
}

export const AnesthesiaAnatomyMapWidget: React.FC<AnesthesiaAnatomyMapWidgetProps> = ({
	currentTechnique,
}) => {
	const { anatomicZones } = currentTechnique;

	return (
		<div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex flex-col gap-2.5">
			<div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
				<Layers className="w-4 h-4 text-purple-400" />
				<span>Анатомические зоны онемения:</span>
			</div>

			<div className="grid grid-cols-2 gap-2 text-xs">
				<div
					className={`p-2 rounded-lg border flex items-center gap-2 ${
						anatomicZones.tongueNumbness
							? 'bg-purple-950/30 border-purple-500/50 text-purple-200 font-semibold'
							: 'bg-zinc-950/30 border-zinc-800 text-zinc-500'
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							anatomicZones.tongueNumbness ? 'bg-purple-400' : 'bg-zinc-600'
						}`}
					/>
					<span className="truncate">Язык (2/3)</span>
				</div>

				<div
					className={`p-2 rounded-lg border flex items-center gap-2 ${
						anatomicZones.lowerLipNumbness
							? 'bg-purple-950/30 border-purple-500/50 text-purple-200 font-semibold'
							: 'bg-zinc-950/30 border-zinc-800 text-zinc-500'
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							anatomicZones.lowerLipNumbness ? 'bg-purple-400' : 'bg-zinc-600'
						}`}
					/>
					<span className="truncate">Губа / Подбородок</span>
				</div>

				<div
					className={`p-2 rounded-lg border flex items-center gap-2 ${
						anatomicZones.cheekMucosaNumbness
							? 'bg-purple-950/30 border-purple-500/50 text-purple-200 font-semibold'
							: 'bg-zinc-950/30 border-zinc-800 text-zinc-500'
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							anatomicZones.cheekMucosaNumbness ? 'bg-purple-400' : 'bg-zinc-600'
						}`}
					/>
					<span className="truncate">Щека / Слизистая</span>
				</div>

				<div
					className={`p-2 rounded-lg border flex items-center gap-2 ${
						anatomicZones.hardPalateNumbness
							? 'bg-purple-950/30 border-purple-500/50 text-purple-200 font-semibold'
							: 'bg-zinc-950/30 border-zinc-800 text-zinc-500'
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							anatomicZones.hardPalateNumbness ? 'bg-purple-400' : 'bg-zinc-600'
						}`}
					/>
					<span className="truncate">Твердое небо</span>
				</div>
			</div>

			<div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300">
				<div className="font-semibold text-zinc-200 mb-0.5">Зона действия блокады:</div>
				<div className="text-[11px] text-zinc-400 leading-relaxed">
					{anatomicZones.summaryRu}
				</div>
			</div>
		</div>
	);
};
