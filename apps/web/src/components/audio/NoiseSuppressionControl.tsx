/**
 * NoiseSuppressionControl.tsx — Интерактивный тулбар управления клиническим DSP и шумоподавлением.
 *
 * ФУНКЦИОНАЛ:
 * 1. 1-клик переключение профилей:
 *    - "Студия" (clean_studio)
 *    - "Кабинет" (dental_balanced)
 *    - "Дальний 3м" (far_field_boost)
 *    - "Бормашина" (ultra_noise_rejection)
 * 2. Гранулярное управление фильтрами (Notch турбины 4.5/6k, High-pass 100Hz, AGC, Noise Gate).
 * 3. Ползунок усиления тихой речи (Gain Boost) от 0 до +24 dB.
 */

import React, { useState } from "react";
import { Sliders, Volume2, ShieldAlert } from "lucide-react";
import {
	DENTAL_DSP_PRESETS,
	type DentalDspFilterConfig,
	type DentalDspProfile,
} from "../../services/voice/audioFilters";
if (typeof window !== "undefined") {
	void import("./NoiseSuppressionControl.css");
}

export interface NoiseSuppressionControlProps {
	profile?: DentalDspProfile | undefined;
	config?: DentalDspFilterConfig | undefined;
	onProfileChange?: ((profile: DentalDspProfile) => void) | undefined;
	onConfigChange?: ((config: Partial<DentalDspFilterConfig>) => void) | undefined;
	showGainSlider?: boolean | undefined;
	className?: string | undefined;
}

export function NoiseSuppressionControl({
	profile = "dental_balanced",
	config,
	onProfileChange,
	onConfigChange,
	showGainSlider = true,
	className = "",
}: NoiseSuppressionControlProps) {
	const currentConfig = config ?? DENTAL_DSP_PRESETS[profile];
	const [localGain, setLocalGain] = useState<number>(currentConfig.makeupGainDb);

	const handleProfileSelect = (p: DentalDspProfile) => {
		onProfileChange?.(p);
		const newCfg = DENTAL_DSP_PRESETS[p];
		setLocalGain(newCfg.makeupGainDb);
	};

	const handleToggleNotch = (enabled: boolean) => {
		onConfigChange?.({
			enableTurbineNotch1: enabled,
			enableTurbineNotch2: enabled,
		});
	};

	const handleToggleHighpass = (enabled: boolean) => {
		onConfigChange?.({ enableHighpass: enabled });
	};

	const handleToggleCompressor = (enabled: boolean) => {
		onConfigChange?.({ enableCompressor: enabled });
	};

	const handleToggleNoiseGate = (enabled: boolean) => {
		onConfigChange?.({ enableNoiseGate: enabled });
	};

	const handleGainChange = (gain: number) => {
		setLocalGain(gain);
		onConfigChange?.({ makeupGainDb: gain, enableAgc: gain > 0 });
	};

	return (
		<div className={`dente-noise-control-panel ${className}`}>
			<div className="dente-noise-control-top">
				<div className="dente-noise-title">
					<Sliders size={15} />
					<span>Профиль шумоподавления</span>
				</div>

				<div className="dente-profile-segmented" role="tablist">
					<button
						type="button"
						className={`dente-profile-btn ${
							profile === "clean_studio" ? "active" : ""
						}`}
						onClick={() => handleProfileSelect("clean_studio")}
						title="Минимальная обработка (гарнитура врача у микрофона)"
					>
						Гарнитура
					</button>

					<button
						type="button"
						className={`dente-profile-btn ${
							profile === "dental_balanced" ? "active" : ""
						}`}
						onClick={() => handleProfileSelect("dental_balanced")}
						title="Стандартный баланс (кабинет, слюноотсос, средняя дистанция)"
					>
						Кабинет
					</button>

					<button
						type="button"
						className={`dente-profile-btn ${
							profile === "far_field_boost" ? "active" : ""
						}`}
						onClick={() => handleProfileSelect("far_field_boost")}
						title="Усиление тихой речи с расстояния 2–4 метра (стол ассистента)"
					>
						Дальний 3м
					</button>

					<button
						type="button"
						className={`dente-profile-btn ${
							profile === "ultra_noise_rejection" ? "active" : ""
						}`}
						onClick={() => handleProfileSelect("ultra_noise_rejection")}
						title="Максимальное подавление свиста бормашины и ревущего компрессора"
					>
						Бормашина
					</button>
				</div>
			</div>

			<div className="dente-noise-toggles-row">
				<label
					className={`dente-toggle-chip ${
						currentConfig.enableTurbineNotch1 ? "active" : ""
					}`}
					title="Вырезание свиста роторного наконечника и пьезо-скейлера (4.5 / 6.0 кГц)"
				>
					<input
						type="checkbox"
						checked={currentConfig.enableTurbineNotch1}
						onChange={(e) => handleToggleNotch(e.target.checked)}
					/>
					<span>Срез бормашины (4.5к/6к)</span>
				</label>

				<label
					className={`dente-toggle-chip ${
						currentConfig.enableHighpass ? "active" : ""
					}`}
					title="Отсечка низкого гула компрессора, шагов и вибраций вентиляции (<100 Гц)"
				>
					<input
						type="checkbox"
						checked={currentConfig.enableHighpass}
						onChange={(e) => handleToggleHighpass(e.target.checked)}
					/>
					<span>Срез компрессора (&lt;100Гц)</span>
				</label>

				<label
					className={`dente-toggle-chip ${
						currentConfig.enableCompressor ? "active" : ""
					}`}
					title="Многополосный компрессор: вытягивание тихих звуков и согласных"
				>
					<input
						type="checkbox"
						checked={currentConfig.enableCompressor}
						onChange={(e) => handleToggleCompressor(e.target.checked)}
					/>
					<span>Компрессор речи</span>
				</label>

				<label
					className={`dente-toggle-chip ${
						currentConfig.enableNoiseGate ? "active" : ""
					}`}
					title="Спектральный гейт: глушение монотонного шипения слюноотсоса в паузах"
				>
					<input
						type="checkbox"
						checked={currentConfig.enableNoiseGate}
						onChange={(e) => handleToggleNoiseGate(e.target.checked)}
					/>
					<span>Гейт слюноотсоса</span>
				</label>

				{showGainSlider && (
					<div className="dente-gain-slider-group">
						<Volume2 size={14} />
						<span>Усиление:</span>
						<input
							type="range"
							min="0"
							max="24"
							step="1"
							value={localGain}
							onChange={(e) => handleGainChange(Number(e.target.value))}
							className="dente-gain-slider"
							title="Дополнительное усиление дальнего микрофона"
						/>
						<span className="dente-gain-val">+{localGain} dB</span>
					</div>
				)}
			</div>
		</div>
	);
}
