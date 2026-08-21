import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
} from "./labMath";

export interface DentalLabOcclusionTabProps {
	occlusalScheme: string;
	setOcclusalScheme: (scheme: string) => void;
	contactTightness: string;
	setContactTightness: (tightness: string) => void;
	surfaceTexture: string;
	setSurfaceTexture: (texture: string) => void;
	cementGapMicrons: number;
	setCementGapMicrons: (gap: number) => void;
}

export function DentalLabOcclusionTab({
	occlusalScheme,
	setOcclusalScheme,
	contactTightness,
	setContactTightness,
	surfaceTexture,
	setSurfaceTexture,
	cementGapMicrons,
	setCementGapMicrons,
}: DentalLabOcclusionTabProps) {
	return (
		<div className="space-y-6">
			{/* Occlusal Scheme */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Окклюзионная концепция & Биомеханика
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{OCCLUSAL_SCHEMES.map((scheme) => {
						const isSelected = occlusalScheme === scheme.id;
						return (
							<button
								key={scheme.id}
								type="button"
								onClick={() => setOcclusalScheme(scheme.id)}
								className={`min-h-[52px] p-3.5 text-left rounded-xl border transition-all ${
									isSelected
										? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
									{scheme.name}
									{isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									{scheme.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Contact Tightness */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Плотность апроксимальных контактов (Контактные пункты)
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{CONTACT_TIGHTNESS_OPTIONS.map((c) => {
						const isSelected = contactTightness === c.id;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => setContactTightness(c.id)}
								className={`min-h-[52px] p-3.5 text-left rounded-xl border transition-all ${
									isSelected
										? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20 font-bold"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
									{c.name}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									{c.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Surface Texture */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Текстура поверхности & Финишная полировка
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{SURFACE_TEXTURE_OPTIONS.map((t) => {
						const isSelected = surfaceTexture === t.id;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => setSurfaceTexture(t.id)}
								className={`min-h-[52px] p-3.5 text-left rounded-xl border transition-all ${
									isSelected
										? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-2 ring-teal-500/20 font-bold"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
									{t.name}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									{t.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Cement Gap Settings */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
				<div className="flex items-center justify-between">
					<label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
						Цементный зазор CAD/CAM (Cement Space Gap)
					</label>
					<span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">
						{cementGapMicrons} мкм
					</span>
				</div>
				<input
					type="range"
					min="10"
					max="100"
					step="5"
					value={cementGapMicrons}
					onChange={(e) => setCementGapMicrons(Number(e.target.value))}
					className="w-full h-3 accent-teal-600 cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-slate-500 font-medium">
					<span>10 мкм (Прецизионная посадка)</span>
					<span>30–40 мкм (Стандарт ISO)</span>
					<span>100 мкм (Широкий зазор)</span>
				</div>
			</div>
		</div>
	);
}
