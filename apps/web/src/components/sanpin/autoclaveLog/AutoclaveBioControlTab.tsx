/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — BIOLOGICAL CONTROL TAB
 * Бактериологический контроль эффективности стерилизаторов (споровые тесты),
 * периодичность 1 раз в 6 месяцев (СанПиН 3.3686-21 п. 3642) и протоколы лабораторий.
 * ============================================================================
 */

import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Clock,
	FileCheck,
	FlaskConical,
	Plus,
	Save,
	ShieldAlert,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import React, { useState } from "react";
import {
	checkNextBioControlDeadline,
	evaluateBioControlResult,
	type BiologicalControlTestRecord,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_BIO_INDICATORS,
	STATUTORY_STERILIZERS_CATALOG,
	type BioIndicatorDefinition,
} from "./autoclaveLogPresets.js";

export interface AutoclaveBioControlTabProps {
	readonly bioRecords: readonly BiologicalControlTestRecord[];
	readonly onAddBioRecord: (record: BiologicalControlTestRecord) => void;
	readonly defaultResponsibleSpecialist?: string;
}

export function AutoclaveBioControlTab({
	bioRecords,
	onAddBioRecord,
	defaultResponsibleSpecialist = "Смирнова Анна Викторовна (Медсестра ЦСО)",
}: AutoclaveBioControlTabProps) {
	const [selectedSterilizerId, setSelectedSterilizerId] = useState<string>(
		STATUTORY_STERILIZERS_CATALOG[0]?.id ?? "autoclave-melag-vacuklav-23b",
	);
	const [bioIndicatorId, setBioIndicatorId] = useState<string>("bio_geobacillus_stearothermophilus");
	const [datePlaced, setDatePlaced] = useState<string>(new Date().toISOString().split("T")[0] ?? "2026-08-22");
	const [dateReadout, setDateReadout] = useState<string>(
		new Date(Date.now() + 48 * 3600 * 1000).toISOString().split("T")[0] ?? "2026-08-24",
	);
	const [lotNumber, setLotNumber] = useState<string>("LOT-SP-2026-08");
	const [testPointIndex, setTestPointIndex] = useState<1 | 2 | 3 | 4 | 5>(3);
	const [result, setResult] = useState<"sterile_passed" | "growth_failed" | "pending">("sterile_passed");
	const [laboratoryName, setLaboratoryName] = useState<string>("ФБУЗ «Центр гигиены и эпидемиологии»");
	const [protocolNumber, setProtocolNumber] = useState<string>("ПР-БИО-2026/08-114");
	const [responsibleSpecialist, setResponsibleSpecialist] = useState<string>(defaultResponsibleSpecialist);
	const [notes, setNotes] = useState<string>("Плановый контроль 1 раз в 6 месяцев. Протокол аккредитованной лаборатории.");

	// Последняя дата биоконтроля
	const latestBioDate = bioRecords[0]?.dateReadout ?? "2026-02-15";
	const deadline = checkNextBioControlDeadline(latestBioDate);

	const handleAddTest = (e: React.FormEvent) => {
		e.preventDefault();
		const sterilizer =
			STATUTORY_STERILIZERS_CATALOG.find((s) => s.id === selectedSterilizerId) ??
			STATUTORY_STERILIZERS_CATALOG[0];
		const indicator =
			STATUTORY_BIO_INDICATORS.find((b) => b.id === bioIndicatorId) ?? STATUTORY_BIO_INDICATORS[0];

		const newBioRecord: BiologicalControlTestRecord = {
			id: `BIO-${Date.now().toString().slice(-6)}`,
			sterilizerId: sterilizer?.id ?? "autoclave-melag-vacuklav-23b",
			sterilizerCode: sterilizer?.code ?? "АК-01",
			datePlaced,
			dateReadout,
			bioIndicatorId,
			sporeCultureNameRu: indicator?.microorganismName ?? "Geobacillus stearothermophilus",
			lotNumber: lotNumber.trim(),
			incubationHours: indicator?.incubationHours ?? 48,
			incubationTempCelsius: indicator?.incubationTempCelsius ?? 55,
			testPointIndex,
			result,
			laboratoryName: laboratoryName.trim(),
			protocolNumber: protocolNumber.trim(),
			responsibleSpecialistFullName: responsibleSpecialist.trim(),
			notes: notes.trim() || undefined,
		};

		onAddBioRecord(newBioRecord);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			{/* Statutory Deadline Banner */}
			<div
				style={{
					background: deadline.isOverdue
						? "rgba(239, 68, 68, 0.08)"
						: deadline.daysRemaining <= 14
							? "rgba(245, 158, 11, 0.08)"
							: "rgba(16, 185, 129, 0.08)",
					border: `1px solid ${
						deadline.isOverdue ? "#ef4444" : deadline.daysRemaining <= 14 ? "#f59e0b" : "#10b981"
					}`,
					borderRadius: "10px",
					padding: "1rem 1.25rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1rem",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "50%",
							background: deadline.isOverdue ? "#ef4444" : "#10b981",
							color: "#fff",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<FlaskConical size={20} />
					</div>
					<div>
						<div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink, #0f172a)" }}>
							Регламент бактериологического контроля (СанПиН 3.3686-21)
						</div>
						<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							{deadline.statusDescriptionRu}
						</div>
					</div>
				</div>

				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Срок следующего биоконтроля:</div>
					<div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
						{deadline.nextDueDate}
					</div>
				</div>
			</div>

			{/* Form to Add New Biological Control Protocol */}
			<form
				onSubmit={handleAddTest}
				style={{
					background: "var(--paper-strong, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "1.25rem",
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Регистрация протокола бактериологического контроля
				</div>

				<div className="autoclave-form-grid">
					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-sterilizer">
							Стерилизатор
						</label>
						<select
							id="bio-sterilizer"
							className="autoclave-select"
							value={selectedSterilizerId}
							onChange={(e) => setSelectedSterilizerId(e.target.value)}
						>
							{STATUTORY_STERILIZERS_CATALOG.map((st) => (
								<option key={st.id} value={st.id}>
									{st.code} — {st.brand} {st.model}
								</option>
							))}
						</select>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-indicator">
							Биологический тест (Споровая тест-культура)
						</label>
						<select
							id="bio-indicator"
							className="autoclave-select"
							value={bioIndicatorId}
							onChange={(e) => setBioIndicatorId(e.target.value)}
						>
							{STATUTORY_BIO_INDICATORS.map((bio) => (
								<option key={bio.id} value={bio.id}>
									{bio.microorganismName} ({bio.sporeCount})
								</option>
							))}
						</select>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-dates">
							Даты закладки и считывания посева
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
							<input
								id="bio-dates"
								type="date"
								className="autoclave-input"
								value={datePlaced}
								onChange={(e) => setDatePlaced(e.target.value)}
								required
							/>
							<input
								type="date"
								className="autoclave-input"
								value={dateReadout}
								onChange={(e) => setDateReadout(e.target.value)}
								required
							/>
						</div>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-result">
							Результат бактериологического анализа
						</label>
						<select
							id="bio-result"
							className="autoclave-select"
							value={result}
							onChange={(e) => setResult(e.target.value as any)}
						>
							<option value="sterile_passed">СТЕРИЛЬНО (Рост тест-культуры отсутствует)</option>
							<option value="growth_failed">БРАК (Обнаружен рост микроорганизмов)</option>
							<option value="pending">В процессе инкубации (48 ч)</option>
						</select>
					</div>
				</div>

				<div className="autoclave-form-grid">
					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-lab">
							Аккредитованная лаборатория / Центр гигиены
						</label>
						<input
							id="bio-lab"
							type="text"
							className="autoclave-input"
							value={laboratoryName}
							onChange={(e) => setLaboratoryName(e.target.value)}
							required
						/>
					</div>

					<div className="autoclave-form-group">
						<label className="autoclave-form-label" htmlFor="bio-protocol">
							Номер официального протокола испытаний
						</label>
						<input
							id="bio-protocol"
							type="text"
							className="autoclave-input"
							value={protocolNumber}
							onChange={(e) => setProtocolNumber(e.target.value)}
							required
						/>
					</div>
				</div>

				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<button type="submit" className="autoclave-btn autoclave-btn-primary" style={{ minWidth: "220px" }}>
						<Save size={16} />
						Сохранить протокол биоконтроля
					</button>
				</div>
			</form>

			{/* Biological Control History Table */}
			<div className="journal257-table-wrapper">
				<table className="journal257-table">
					<thead>
						<tr>
							<th>ID / Дата</th>
							<th>Аппарат</th>
							<th>Тест-культура</th>
							<th>Лаборатория и № протокола</th>
							<th>Результат контроля</th>
							<th>Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{bioRecords.map((bio) => {
							const evalRes = evaluateBioControlResult(bio);
							return (
								<tr key={bio.id}>
									<td>
										<div style={{ fontWeight: 700 }}>{bio.dateReadout}</div>
										<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{bio.id}</div>
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{bio.sterilizerCode}</div>
									</td>
									<td>
										<div style={{ fontWeight: 500 }}>{bio.sporeCultureNameRu}</div>
										<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>Партия: {bio.lotNumber}</div>
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{bio.protocolNumber}</div>
										<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{bio.laboratoryName}</div>
									</td>
									<td>
										<span
											className={`status-badge ${
												bio.result === "sterile_passed" ? "passed" : bio.result === "growth_failed" ? "failed" : "quarantine"
											}`}
										>
											{bio.result === "sterile_passed" ? (
												<>
													<CheckCircle2 size={13} /> СТЕРИЛЬНО
												</>
											) : bio.result === "growth_failed" ? (
												<>
													<XCircle size={13} /> БРАК (РОСТ)
												</>
											) : (
												<>
													<Clock size={13} /> ИНКУБАЦИЯ
												</>
											)}
										</span>
									</td>
									<td>
										<div style={{ fontSize: "0.8125rem" }}>{bio.responsibleSpecialistFullName}</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
