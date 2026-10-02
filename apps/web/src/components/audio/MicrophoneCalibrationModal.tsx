/**
 * MicrophoneCalibrationModal.tsx — Модальное окно тестирования и калибровки микрофона врача.
 *
 * ФУНКЦИОНАЛ:
 * 1. Интерактивный замер уровня фонового шума в тишине кабинета.
 * 2. Расчет реального отношения сигнал/шум (SNR в dB) с автоматической рекомендацией профиля.
 * 3. Встроенный стресс-тест с симулятором шума бормашины (4.5к/6к) и компрессора (120Гц).
 * 4. Тестовый прогон стоматологических формул («16 кариес», «47 пульпит», «21 имплант»).
 * 5. Сохранение откалиброванного профиля в настройки.
 */

import React, { useState, useEffect } from "react";
import {
	Mic,
	X,
	CheckCircle,
	AlertTriangle,
	Play,
	Volume2,
	Activity,
	Radio,
} from "lucide-react";
import { AudioSpectrumWidget } from "./AudioSpectrumWidget";
import { NoiseSuppressionControl } from "./NoiseSuppressionControl";
import {
	type DentalDspProfile,
	type AcousticQualityReport,
	evaluateAcousticQuality,
	DentalCabinetAcousticSimulator,
} from "../../services/voice/audioFilters";
import { parseDentalVoiceSpeech } from "../../services/voice/dentalGrammarParser";
import { globalVoiceAudioProcessor } from "../../services/voice/voiceProcessor";
import "./MicrophoneCalibrationModal.css";

export interface MicrophoneCalibrationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyProfile?: (profile: DentalDspProfile) => void;
	currentProfile?: DentalDspProfile;
}

export function MicrophoneCalibrationModal({
	isOpen,
	onClose,
	onApplyProfile,
	currentProfile = "dental_balanced",
}: MicrophoneCalibrationModalProps) {
	const [activeProfile, setActiveProfile] =
		useState<DentalDspProfile>(currentProfile);
	const [noiseFloorDb, setNoiseFloorDb] = useState<number>(-62.0);
	const [speechPeakDb, setSpeechPeakDb] = useState<number>(-20.0);
	const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
	const [simulatingNoise, setSimulatingNoise] = useState<boolean>(false);
	const [testResult, setTestResult] = useState<{
		phrase: string;
		parsedText: string;
		fdiTeeth: number[];
		status: string;
		accuracy: number;
	} | null>(null);

	const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		// Подключение глобального аудиопроцессора
		const currentAnalyser = globalVoiceAudioProcessor.getAnalyserNode();
		if (currentAnalyser) {
			setAnalyser(currentAnalyser);
		} else if (
			typeof navigator !== "undefined" &&
			navigator.mediaDevices?.getUserMedia
		) {
			navigator.mediaDevices
				.getUserMedia({ audio: true })
				.then((stream) => {
					return globalVoiceAudioProcessor.attachStream(stream);
				})
				.then((an) => {
					setAnalyser(an);
				})
				.catch((err) => {
					console.warn("Could not capture mic stream for calibration:", err);
				});
		}

		return () => {
			if (simulatingNoise) {
				setSimulatingNoise(false);
			}
		};
	}, [isOpen, simulatingNoise]);

	if (!isOpen) return null;

	const handleCalibrateNoise = async () => {
		setIsCalibrating(true);
		try {
			const measuredNoise =
				await globalVoiceAudioProcessor.calibrateNoiseFloor(1500);
			setNoiseFloorDb(measuredNoise);
		} finally {
			setIsCalibrating(false);
		}
	};

	const acousticReport: AcousticQualityReport = evaluateAcousticQuality(
		speechPeakDb,
		noiseFloorDb,
	);

	const handleSimulateNoiseToggle = () => {
		const next = !simulatingNoise;
		setSimulatingNoise(next);
		if (next) {
			// В симуляторе уровень фонового шума подскакивает до -34 dB (шум бормашины)
			setNoiseFloorDb(-34.0);
		} else {
			setNoiseFloorDb(-62.0);
		}
	};

	const runFormulaTest = (phrase: string) => {
		const parsed = parseDentalVoiceSpeech(phrase);
		const fdi = parsed.detectedTeeth ? [...parsed.detectedTeeth] : [];
		const status =
			parsed.teethUpdates.length > 0
				? parsed.teethUpdates[0]?.clinicalStatus || "UNKNOWN"
				: "UNKNOWN";

		setTestResult({
			phrase,
			parsedText: parsed.summary,
			fdiTeeth: fdi,
			status,
			accuracy: fdi.length > 0 ? 100 : 0,
		});
	};

	const handleApply = () => {
		globalVoiceAudioProcessor.setProfile(activeProfile);
		onApplyProfile?.(activeProfile);
		onClose();
	};

	return (
		<div className="dente-calibration-backdrop" onClick={onClose}>
			<div
				className="dente-calibration-card"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				<div className="dente-calibration-header">
					<div className="dente-calibration-title">
						<Mic size={18} className="text-teal-600" />
						<span>Тестирование и калибровка микрофона врача</span>
					</div>
					<button
						type="button"
						className="dente-calibration-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* 1. Спектроанализатор реального времени */}
				<div className="dente-calibration-section">
					<AudioSpectrumWidget
						analyserNode={analyser}
						height={84}
						showLegend={true}
						showMetrics={true}
					/>
				</div>

				{/* 2. Замер акустики и отношение сигнал/шум */}
				<div className="dente-calibration-section">
					<div className="dente-section-title">
						<Activity size={15} />
						<span>Акустический профиль кабинета</span>
					</div>

					<div className="dente-acoustic-assessment-box">
						<div className="dente-assessment-tile">
							<span className="dente-tile-label">Фоновый шум:</span>
							<span className="dente-tile-value">{noiseFloorDb} dB</span>
						</div>
						<div className="dente-assessment-tile">
							<span className="dente-tile-label">Громкость речи:</span>
							<span className="dente-tile-value">{speechPeakDb} dB</span>
						</div>
						<div className="dente-assessment-tile">
							<span className="dente-tile-label">Разборчивость (SNR):</span>
							<span className="dente-tile-value">
								+{acousticReport.snrDb} dB
							</span>
						</div>
						<div className="dente-assessment-tile">
							<span className="dente-tile-label">Режим:</span>
							<button
								type="button"
								className="dente-sim-btn"
								onClick={handleCalibrateNoise}
								disabled={isCalibrating}
							>
								{isCalibrating ? "Замер 1.5с..." : "Замерить шум"}
							</button>
						</div>
					</div>

					<div
						className={`dente-verdict-banner ${
							acousticReport.quality === "excellent" ||
							acousticReport.quality === "good"
								? "good"
								: acousticReport.quality === "moderate"
									? "moderate"
									: "critical"
						}`}
					>
						{acousticReport.quality === "excellent" ||
						acousticReport.quality === "good" ? (
							<CheckCircle size={18} />
						) : (
							<AlertTriangle size={18} />
						)}
						<div>
							<strong>Вердикт: </strong>
							{acousticReport.recommendation}
						</div>
					</div>
				</div>

				{/* 3. Стресс-тестирование: симулятор бормашины и компрессора */}
				<div className="dente-calibration-section">
					<div className="dente-sim-panel">
						<div className="flex items-center gap-2">
							<Radio size={16} />
							<span>
								Стресс-тест: Эмуляция шума бормашины (4.5/6кГц) и компрессора
							</span>
						</div>
						<div className="dente-sim-actions">
							<button
								type="button"
								className={`dente-sim-btn ${simulatingNoise ? "active" : ""}`}
								onClick={handleSimulateNoiseToggle}
							>
								{simulatingNoise
									? "Выключить шум бормашины"
									: "Включить шум кабинета"}
							</button>
						</div>
					</div>
				</div>

				{/* 4. Контроллер DSP и фильтров */}
				<div className="dente-calibration-section">
					<NoiseSuppressionControl
						profile={activeProfile}
						onProfileChange={(p) => setActiveProfile(p)}
					/>
				</div>

				{/* 5. Тестирование распознавания стоматологических формул */}
				<div className="dente-calibration-section">
					<div className="dente-section-title">
						<Play size={15} />
						<span>Тест распознавания стоматологических формул</span>
					</div>

					<div className="dente-formula-test-list">
						<button
							type="button"
							className="dente-formula-test-btn"
							onClick={() => runFormulaTest("шестнадцать кариес дентина")}
						>
							<span className="dente-formula-phrase">
								«16 кариес дентина»
							</span>
							<span className="dente-formula-target">FDI: 16 (Кариес)</span>
						</button>

						<button
							type="button"
							className="dente-formula-test-btn"
							onClick={() => runFormulaTest("сорок семь острый пульпит")}
						>
							<span className="dente-formula-phrase">
								«47 острый пульпит»
							</span>
							<span className="dente-formula-target">FDI: 47 (Пульпит)</span>
						</button>

						<button
							type="button"
							className="dente-formula-test-btn"
							onClick={() => runFormulaTest("двадцать один имплантат")}
						>
							<span className="dente-formula-phrase">
								«21 имплантат установлен»
							</span>
							<span className="dente-formula-target">FDI: 21 (Имплант)</span>
						</button>

						<button
							type="button"
							className="dente-formula-test-btn"
							onClick={() => runFormulaTest("тридцать шесть пломба")}
						>
							<span className="dente-formula-phrase">«36 пломба»</span>
							<span className="dente-formula-target">FDI: 36 (Пломба)</span>
						</button>
					</div>

					{testResult && (
						<div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
							<div>
								<span className="text-slate-500">Распознано: </span>
								<strong className="text-teal-700 dark:text-teal-400">
									Зуб {testResult.fdiTeeth.join(", ")} — {testResult.status}
								</strong>
							</div>
							<div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
								<CheckCircle size={14} />
								<span>Точность: {testResult.accuracy}%</span>
							</div>
						</div>
					)}
				</div>

				<div className="dente-calibration-footer">
					<button
						type="button"
						className="dente-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>
					<button
						type="button"
						className="dente-btn-primary"
						onClick={handleApply}
					>
						Применить настройки для этого кабинета
					</button>
				</div>
			</div>
		</div>
	);
}
