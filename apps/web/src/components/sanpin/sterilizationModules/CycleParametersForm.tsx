import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { ClinicAutoclaveDevice } from "../autoclave/autoclaveDeviceTypes";
import type { SterilizationRegimeOption } from "./sterilizationCycleTypes";
import { STATUTORY_REGIMES_OPTIONS } from "./sterilizationCycleTypes";
import { CyclePresetsSelector } from "./CyclePresetsSelector";

export interface CycleParametersFormProps {
	readonly cycleDate: string;
	readonly onCycleDateChange: (val: string) => void;
	readonly cycleTime: string;
	readonly onCycleTimeChange: (val: string) => void;
	readonly cycleNumber: number;
	readonly onCycleNumberChange: (val: number) => void;
	readonly selectedDeviceId: string;
	readonly onDeviceChange: (devId: string) => void;
	readonly clinicDevices: readonly ClinicAutoclaveDevice[];
	readonly selectedRegimeId: string;
	readonly onRegimeChange: (regimeId: string) => void;
	readonly selectedRegime: SterilizationRegimeOption;
	readonly actualTemp: number;
	readonly onActualTempChange: (val: number) => void;
	readonly actualPressure: number;
	readonly onActualPressureChange: (val: number) => void;
	readonly actualDuration: number;
	readonly onActualDurationChange: (val: number) => void;
	readonly onFillNormIn1Click: () => void;
}

export function CycleParametersForm({
	cycleDate, onCycleDateChange, cycleTime, onCycleTimeChange,
	cycleNumber, onCycleNumberChange, selectedDeviceId, onDeviceChange,
	clinicDevices, selectedRegimeId, onRegimeChange, selectedRegime,
	actualTemp, onActualTempChange, actualPressure, onActualPressureChange,
	actualDuration, onActualDurationChange, onFillNormIn1Click,
}: CycleParametersFormProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			<div className="sanpin-form-row">
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Дата проведения</label>
					<input type="date" required value={cycleDate} onChange={(e) => onCycleDateChange(e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.85rem" }} />
				</div>
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Время цикла</label>
					<input type="time" required value={cycleTime} onChange={(e) => onCycleTimeChange(e.target.value)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.85rem" }} />
				</div>
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">№ цикла за смену</label>
					<input type="number" min={1} max={30} required value={cycleNumber} onChange={(e) => onCycleNumberChange(parseInt(e.target.value, 10) || 1)} className="sanpin-input" style={{ minHeight: "36px", fontSize: "0.85rem", fontWeight: 700 }} />
				</div>
			</div>

			<CyclePresetsSelector
				selectedRegimeId={selectedRegimeId}
				onSelectPreset={(p) => {
					onRegimeChange(p.regimeOptionId);
					onActualTempChange(p.temperatureC);
					onActualPressureChange(p.pressureBar);
					onActualDurationChange(p.durationMin);
				}}
			/>

			<div className="sanpin-form-group">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
					<label className="sanpin-form-label" style={{ margin: 0, fontWeight: 700 }}>Стерилизационный аппарат клиники</label>
					<button type="button" onClick={onFillNormIn1Click} className="sanpin-btn sanpin-btn-secondary" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
						<CheckCircle2 size={13} color="#16a34a" /> <span>Заполнить нормой</span>
					</button>
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
					<select value={selectedDeviceId} onChange={(e) => onDeviceChange(e.target.value)} className="sanpin-select" style={{ minHeight: "36px", fontSize: "0.85rem" }}>
						{clinicDevices.length > 0 ? clinicDevices.map((d) => (
							<option key={d.id} value={d.id}>{d.brandModelRu} {d.serialNumber ? `(№${d.serialNumber})` : ""}</option>
						)) : (
							<>
								<option value="melag_vacuklav_23b">Melag Vacuklav 23 B+ (Автоклав B-класса, 22 л)</option>
								<option value="euronda_e9">Euronda E9 Next Med (Автоклав B-класса, 24 л)</option>
								<option value="gp20_spu">ГП-20 СПУ (Сухожаровой шкаф 180°C, 20 л)</option>
							</>
						)}
					</select>
					<select value={selectedRegimeId} onChange={(e) => onRegimeChange(e.target.value)} className="sanpin-select" style={{ minHeight: "36px", fontSize: "0.85rem" }}>
						{STATUTORY_REGIMES_OPTIONS.map((reg) => (
							<option key={reg.id} value={reg.id}>{reg.nameRu}</option>
						))}
					</select>
				</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{selectedRegime.descriptionRu}</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", padding: "0.75rem", borderRadius: "8px", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}>
				<div className="sanpin-form-group" style={{ margin: 0 }}>
					<label className="sanpin-form-label" style={{ fontSize: "0.75rem" }}>Температура (°C)</label>
					<input type="number" step={0.1} required value={actualTemp} onChange={(e) => onActualTempChange(parseFloat(e.target.value) || 0)} className="sanpin-input" style={{ minHeight: "34px", fontWeight: 700 }} />
					<span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Норма: {selectedRegime.targetTemperature}°C</span>
				</div>
				<div className="sanpin-form-group" style={{ margin: 0 }}>
					<label className="sanpin-form-label" style={{ fontSize: "0.75rem" }}>Давление (бар)</label>
					<input type="number" step={0.05} required value={actualPressure} onChange={(e) => onActualPressureChange(parseFloat(e.target.value) || 0)} className="sanpin-input" style={{ minHeight: "34px", fontWeight: 700 }} />
					<span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Норма: {selectedRegime.targetPressure} бар</span>
				</div>
				<div className="sanpin-form-group" style={{ margin: 0 }}>
					<label className="sanpin-form-label" style={{ fontSize: "0.75rem" }}>Выдержка (мин)</label>
					<input type="number" step={0.5} required value={actualDuration} onChange={(e) => onActualDurationChange(parseFloat(e.target.value) || 0)} className="sanpin-input" style={{ minHeight: "34px", fontWeight: 700 }} />
					<span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Норма: {selectedRegime.exposureMinutes} мин</span>
				</div>
			</div>
		</div>
	);
}
