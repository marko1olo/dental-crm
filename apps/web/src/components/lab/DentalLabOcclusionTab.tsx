import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
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
	return (
		<div className="space-y-6">
			{/* Quick Clinical Norm Preset (Doctor Ergonomics) */}
			<div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-100 flex-wrap">
				<div className="flex items-center gap-2">
					<Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<div>
						<span className="text-xs font-bold block">
							Анатомическая норма (Стандарт ортопедии)
						</span>
						<span className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
							Взаимно-защищенная окклюзия, нормальный контакт (50 мкм), естественная текстура, зазор 30 мкм
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => {
						setOcclusalScheme("mutually_protected");
						setContactTightness("normal");
						setSurfaceTexture("natural_anatomy");
						setCementGapMicrons(30);
					}}
					className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
					title="Применить стандартные физиологические параметры в 1 клик"
				>
					⚡ Вся анатомическая норма (1 клик)
				</button>
			</div>

			{/* Occlusal Scheme */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-[var(--ink)]">
					Окклюзионная концепция & Контакты
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

			{/* Technical Milling & Cement Gap Settings (Collapsible for Clean Doctor View) */}
			<details className="group bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3.5 transition-all">
				<summary className="flex items-center justify-between cursor-pointer list-none select-none text-xs font-bold text-[var(--ink)]">
					<div className="flex items-center gap-2">
						<span className="text-[var(--muted)] group-open:rotate-90 transition-transform">▸</span>
						<span>Технические параметры CAD/CAM фрезерования (ЗТЛ)</span>
					</div>
					<span className="text-xs font-mono font-bold text-[var(--teal)] px-2 py-0.5 rounded bg-[var(--teal-surface)]">
						Зазор: {cementGapMicrons || 30} мкм
					</span>
				</summary>

				<div className="pt-3.5 mt-3 border-t border-[var(--line)] space-y-3">
					<div className="flex items-center justify-between">
						<label className="block text-xs font-bold text-[var(--ink)]">
							Цементный зазор CAD/CAM (Cement Space Gap)
						</label>
						<span className="text-sm font-black text-[var(--teal)] font-mono">
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
					<div className="flex justify-between text-[11px] text-[var(--muted)] font-medium">
						<span>10 мкм (Прецизионная)</span>
						<span>30–40 мкм (Стандарт ISO)</span>
						<span>100 мкм (Широкий зазор)</span>
					</div>
				</div>
			</details>
		</div>
	);
}
