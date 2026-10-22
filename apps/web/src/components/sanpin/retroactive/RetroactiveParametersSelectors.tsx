import React from "react";
import { Plus } from "lucide-react";
import { AUTOCLAVE_REGIME_PRESETS } from "../retroactiveSanpinEngine";

export interface RetroactiveParametersSelectorsProps {
	readonly nurseFullName: string;
	readonly setNurseFullName: (n: string) => void;
	readonly sterilizerModel: string;
	readonly setSterilizerModel: (m: string) => void;
	readonly availableSterilizers: Array<{ id: string; label: string; modelName: string }>;
	readonly onOpenEquipmentModal: () => void;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly setAutoclaveRegimeId: (r: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min") => void;
}

export function RetroactiveParametersSelectors({
	nurseFullName,
	setNurseFullName,
	sterilizerModel,
	setSterilizerModel,
	availableSterilizers,
	onOpenEquipmentModal,
	autoclaveRegimeId,
	setAutoclaveRegimeId,
}: RetroactiveParametersSelectorsProps) {
	return (
		<>
			<div className="sanpin-form-group">
				<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
					Дежурная медсестра ЦСО (ФИО):
				</label>
				<select
					value={nurseFullName}
					onChange={(e) => setNurseFullName(e.target.value)}
					className="sanpin-select"
					style={{ minHeight: "44px" }}
				>
					<option value="Медсестра ЦСО">Медсестра ЦСО</option>
					<option value="Главная медсестра">Главная медсестра</option>
					<option value="Оператор стерилизационной">Оператор стерилизационной</option>
					<option value="Ассистент стоматолога">Ассистент стоматолога</option>
				</select>
			</div>

			<div className="sanpin-form-group">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
						Аппарат стерилизатора клиники:
					</label>
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						style={{
							background: "none", border: "none", color: "var(--brand-primary, #2563eb)",
							fontSize: "0.75rem", cursor: "pointer", padding: 0, textDecoration: "underline",
							display: "inline-flex", alignItems: "center", gap: "0.2rem",
						}}
					>
						<Plus size={12} /> Добавить аппарат
					</button>
				</div>
				<select
					value={sterilizerModel}
					onChange={(e) => setSterilizerModel(e.target.value)}
					className="sanpin-select"
					style={{ minHeight: "44px" }}
				>
					{availableSterilizers.map((s) => (
						<option key={s.id} value={s.modelName}>
							{s.label}
						</option>
					))}
				</select>
			</div>

			<div className="sanpin-form-group">
				<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
					Режим автоклавирования:
				</label>
				<select
					value={autoclaveRegimeId}
					onChange={(e) => setAutoclaveRegimeId(e.target.value as any)}
					className="sanpin-select"
					style={{ minHeight: "44px" }}
				>
					{AUTOCLAVE_REGIME_PRESETS.map((r) => (
						<option key={r.id} value={r.id}>
							{r.nameRu}
						</option>
					))}
				</select>
			</div>
		</>
	);
}
