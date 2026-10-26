/**
 * CtPopoutQuadrants.tsx — 4-сегментный мультипланарный вьюпорт КТ (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Box } from "lucide-react";

interface Props {
	activeProjection: string;
	sliceIndex: number;
	slabThicknessMm: number;
	activeWlPreset: string;
	isNerveVisible: boolean;
}

export const CtPopoutQuadrants: React.FC<Props> = ({
	activeProjection, sliceIndex, slabThicknessMm, activeWlPreset, isNerveVisible,
}) => {
	return (
		<main className="flex-1 min-h-0 p-2 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2 bg-black">
			{/* Quadrant 1: 3D Raymarching Volume */}
			<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
				<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
					<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">3D ОБЪЕМ (VR)</span>
					<span className="text-[10px] font-mono text-zinc-400">Проекция: {activeProjection.toUpperCase()}</span>
				</div>
				<div className="flex-1 flex items-center justify-center relative">
					<div className="w-56 h-56 rounded-full border border-cyan-500/20 flex items-center justify-center relative">
						<div className="w-44 h-44 rounded-2xl border border-dashed border-cyan-400/30 flex items-center justify-center rotate-12">
							<Box className="w-24 h-24 text-cyan-400/60 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
						</div>
						{isNerveVisible && (
							<div className="absolute inset-x-8 bottom-12 h-6 border-b-2 border-rose-500/80 rounded-b-full filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" title="Нижнечелюстной канал (N. Alveolaris Inferior)" />
						)}
					</div>
				</div>
				<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
					<span>Плотность кости: D2 (850 HU)</span>
					<span>FOV: 12×9 см</span>
					<span>Воксель: 0.2 мм</span>
				</div>
			</section>

			{/* Quadrant 2: Axial Slice */}
			<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
				<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
					<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">АКСИАЛЬНЫЙ (AXIAL)</span>
					<span className="text-[10px] font-mono text-zinc-400">Срез #{sliceIndex} / 450</span>
				</div>
				<div className="flex-1 flex items-center justify-center relative">
					<div className="w-48 h-48 rounded-full border border-teal-500/30 flex items-center justify-center">
						<div className="w-36 h-28 border-b-2 border-dashed border-amber-400/60 rounded-b-full flex items-center justify-center">
							<div className="w-2 h-2 rounded-full bg-teal-400" />
						</div>
					</div>
				</div>
				<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
					<span>Z: +14.2 мм</span>
					<span>Сплайн дуги: Активен</span>
					<span>WL: {activeWlPreset.toUpperCase()}</span>
				</div>
			</section>

			{/* Quadrant 3: Coronal Slice */}
			<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
				<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
					<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">КОРОНАЛЬНЫЙ (CORONAL)</span>
					<span className="text-[10px] font-mono text-zinc-400">Y: 0.0 мм</span>
				</div>
				<div className="flex-1 flex items-center justify-center relative">
					<div className="w-44 h-40 border border-indigo-500/20 rounded-xl flex items-center justify-center">
						<div className="w-28 h-20 border-b border-indigo-400/40 rounded-b-xl" />
					</div>
				</div>
				<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
					<span>ВЧ Пазухи: Норма</span>
					<span>Slab: {slabThicknessMm} мм</span>
				</div>
			</section>

			{/* Quadrant 4: Cross-Section / Panoramic */}
			<section className="relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col group">
				<div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
					<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">КРОСС-СЕКЦИЯ / ПАНОРАМА</span>
					<span className="text-[10px] font-mono text-zinc-400">Зона 46–47</span>
				</div>
				<div className="flex-1 flex items-center justify-center relative">
					<div className="w-52 h-28 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-2">
						<div className="w-40 h-10 border-b-2 border-amber-400/40 rounded-b-full" />
						{isNerveVisible && (
							<div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-mono">
								<div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
								<span>Канал N. Mandibularis (отступ 4.8 мм)</span>
							</div>
						)}
					</div>
				</div>
				<div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800">
					<span>Толщина альвеолярного гребня: 7.4 мм</span>
					<span>Высота до канала: 12.1 мм</span>
				</div>
			</section>
		</main>
	);
};
