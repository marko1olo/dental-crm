import React, { useState } from "react";
import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import {
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
} from "./labMath";
import { CadCamOcclusionHeatmapModal } from "./CadCamOcclusionHeatmapModal";
import type { CrownMaterialId } from "./crownMaterialTolerances";

export interface DentalLabOcclusionTabProps {
	occlusalScheme: string;
	setOcclusalScheme: (scheme: string) => void;
	contactTightness: string;
	setContactTightness: (tightness: string) => void;
	surfaceTexture: string;
	setSurfaceTexture: (texture: string) => void;
	cementGapMicrons: number;
	setCementGapMicrons: (gap: number) => void;
	toothFdi?: number | string | undefined;
	materialId?: string | undefined;
	onMaterialChange?: ((materialId: string) => void) | undefined;
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
	toothFdi = 16,
	materialId = "zirconia_ultra_translucent",
	onMaterialChange,
}: DentalLabOcclusionTabProps) {
	const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
	return (
		<div className="space-y-6">
			{/* CAD/CAM Clearance Heatmap Quick Launch Banner */}
			<div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--teal-surface)] to-[var(--paper-soft)] border border-[var(--teal-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal)] text-white flex items-center justify-center shadow-md shadow-[var(--teal)]/20 shrink-0">
						<Activity className="w-5 h-5" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
							CAD/CAM Окклюзионный Клиренс (3D Heatmap)
							<span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[var(--teal)] text-white font-bold">
								Зуб №{toothFdi}
							</span>
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Карта зазоров с зубом-антагонистом, допуски циркония / E.max / PFM и виртуальная эмалопластика.
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setIsHeatmapModalOpen(true)}
					className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--teal)] hover:opacity-95 shadow-md shadow-[var(--teal)]/20 transition-all flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
				>
					<Sparkles className="w-4 h-4" />
					<span>Открыть 3D Heatmap</span>
				</button>
			</div>

			{/* Occlusal Scheme */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-[var(--ink)]">
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
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)]"
										: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal-soft)]"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center justify-between">
									{scheme.name}
									{isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />}
								</div>
								<div className="text-xs text-[var(--muted)] mt-1">
									{scheme.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Contact Tightness */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-[var(--ink)]">
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
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)] font-bold"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--teal-soft)]"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									{c.name}
								</div>
								<div className="text-xs text-[var(--muted)] mt-1">
									{c.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Surface Texture */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-[var(--ink)]">
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
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)] font-bold"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--teal-soft)]"
								}`}
							>
								<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									{t.name}
								</div>
								<div className="text-xs text-[var(--muted)] mt-1">
									{t.desc}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Cement Gap Settings */}
			<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-4 space-y-3">
				<div className="flex items-center justify-between">
					<label className="block text-xs font-bold text-[var(--ink)]">
						Цементный зазор CAD/CAM (Cement Space Gap)
					</label>
					<span className="text-base font-black text-[var(--teal)] font-mono">
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
					className="w-full h-3 accent-[var(--teal)] cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-[var(--muted)] font-medium">
					<span>10 мкм (Прецизионная посадка)</span>
					<span>30–40 мкм (Стандарт ISO)</span>
					<span>100 мкм (Широкий зазор)</span>
				</div>
			</div>

			{/* CAD/CAM Clearance Heatmap Modal */}
			{isHeatmapModalOpen && (
				<CadCamOcclusionHeatmapModal
					isOpen={isHeatmapModalOpen}
					onClose={() => setIsHeatmapModalOpen(false)}
					initialToothFdi={toothFdi}
					initialMaterialId={materialId}
					initialCementGapMicrons={cementGapMicrons}
					onApplySettings={(settings) => {
						setCementGapMicrons(settings.cementGapMicrons);
						if (onMaterialChange) {
							onMaterialChange(settings.materialId);
						}
					}}
				/>
			)}
		</div>
	);
}
