import {
	AlertTriangle,
	Baby,
	HeartPulse,
	Pill,
	Plus,
	Save,
	ShieldAlert,
	Stethoscope,
	Syringe,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { usePatientStore } from "../store/patientStore";

const QUICK_ALLERGIES = [
	"Лидокаин",
	"Артикаин",
	"Пенициллин",
	"Ибупрофен",
	"Латекс",
	"Йод",
	"Амоксициллин",
];
const QUICK_DISEASES = [
	"Сахарный диабет",
	"Гипертония",
	"Бронхиальная астма",
	"Гепатит B/C",
	"ВИЧ",
	"Эпилепсия",
];
const QUICK_MEDICATIONS = [
	"Варфарин (Антикоагулянт)",
	"Ксарелто (Антикоагулянт)",
	"Инсулин",
	"Бифосфонаты",
];

export function AnamnesisPanel({ patientId }: { patientId: string }) {
	const {
		anamnesisDraft,
		setAnamnesisDraft,
		anamnesisSaveState,
		loadAnamnesis,
		saveAnamnesis,
	} = usePatientStore();

	const [newAllergy, setNewAllergy] = useState("");
	const [newDisease, setNewDisease] = useState("");
	const [newMed, setNewMed] = useState("");

	useEffect(() => {
		void loadAnamnesis(patientId);
	}, [patientId, loadAnamnesis]);

	const draft = anamnesisDraft as any;
	const allergies: string[] = draft.allergies || [];
	const systemicDiseases: string[] = draft.systemicDiseases || [];
	const medications: string[] = draft.medications || [];
	const hasCriticalAlerts: boolean = draft.hasCriticalAlerts || false;
	const criticalAlertNote: string = draft.criticalAlertNote || "";
	const pregnancyStatus: string = draft.pregnancyStatus || "none";

	const isSaving = anamnesisSaveState === "saving";

	const addTag = (
		field: "allergies" | "systemicDiseases" | "medications",
		val: string,
	) => {
		const trimmed = val.trim();
		if (!trimmed) return;
		setAnamnesisDraft((prev: any) => {
			const arr = prev[field] || [];
			if (arr.includes(trimmed)) return prev;
			return { ...prev, [field]: [...arr, trimmed] };
		});
	};

	const removeTag = (
		field: "allergies" | "systemicDiseases" | "medications",
		val: string,
	) => {
		setAnamnesisDraft((prev: any) => ({
			...prev,
			[field]: (prev[field] || []).filter((item: string) => item !== val),
		}));
	};

	const handleSave = () => saveAnamnesis(patientId);

	return (
		<section
			className="dashboard-card animate-fade-in"
			style={{
				padding: "24px",
				display: "flex",
				flexDirection: "column",
				gap: "24px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h3
					style={{
						margin: 0,
						fontSize: "1.2rem",
						fontWeight: 600,
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Stethoscope size={20} color="var(--primary)" /> Медицинская карта /
					Анамнез
				</h3>
			</div>

			{/* Critical Alert Banner */}
			<div
				style={{
					background: hasCriticalAlerts ? "var(--red-50)" : "var(--slate-50)",
					border: `1px solid ${hasCriticalAlerts ? "var(--red-200)" : "var(--slate-200)"}`,
					borderRadius: "12px",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					transition: "all 0.3s",
				}}
			>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontWeight: 600,
						color: hasCriticalAlerts ? "var(--red-600)" : "var(--slate-700)",
						cursor: "pointer",
					}}
				>
					<input
						type="checkbox"
						checked={hasCriticalAlerts}
						onChange={(e) =>
							setAnamnesisDraft((prev: any) => ({
								...prev,
								hasCriticalAlerts: e.target.checked,
							}))
						}
						style={{ transform: "scale(1.2)" }}
					/>
					<ShieldAlert size={20} />
					<span>Критическое предупреждение (Внимание врача!)</span>
				</label>

				{hasCriticalAlerts && (
					<textarea
						className="text-input w-full"
						value={criticalAlertNote}
						onChange={(e) =>
							setAnamnesisDraft((prev: any) => ({
								...prev,
								criticalAlertNote: e.target.value,
							}))
						}
						placeholder="Укажите причину: например, 'АНАФИЛАКТИЧЕСКИЙ ШОК НА ЛИДОКАИН'"
						style={{
							borderColor: "var(--red-300)",
							outlineColor: "var(--red-400)",
							minHeight: "60px",
							resize: "vertical",
						}}
					/>
				)}
			</div>

			{/* Allergies */}
			<div>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontWeight: 600,
						marginBottom: "8px",
					}}
				>
					<Syringe size={16} color="var(--rose-500)" /> Аллергические реакции
				</label>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "6px",
						marginBottom: "12px",
					}}
				>
					{QUICK_ALLERGIES.map((q) => (
						<button
							key={q}
							type="button"
							className="text-button"
							style={{
								padding: "4px 10px",
								fontSize: "0.8rem",
								borderRadius: "100px",
								background: "var(--rose-50)",
								color: "var(--rose-700)",
								border: "1px solid var(--rose-200)",
							}}
							onClick={() => addTag("allergies", q)}
						>
							+ {q}
						</button>
					))}
				</div>
				<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
					<input
						className="text-input"
						style={{ flex: 1 }}
						value={newAllergy}
						onChange={(e) => setNewAllergy(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								addTag("allergies", newAllergy);
								setNewAllergy("");
								e.preventDefault();
							}
						}}
						placeholder="Добавить аллергию вручную..."
					/>
					<button
						type="button"
						className="primary-button"
						onClick={() => {
							addTag("allergies", newAllergy);
							setNewAllergy("");
						}}
					>
						<Plus size={16} />
					</button>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{allergies.map((a) => (
						<span
							key={a}
							style={{
								background: "var(--rose-100)",
								color: "var(--rose-900)",
								padding: "4px 12px",
								borderRadius: "6px",
								fontSize: "0.9rem",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							{a}{" "}
							<X
								size={14}
								style={{ cursor: "pointer" }}
								onClick={() => removeTag("allergies", a)}
							/>
						</span>
					))}
				</div>
			</div>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Systemic Diseases */}
			<div>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontWeight: 600,
						marginBottom: "8px",
					}}
				>
					<HeartPulse size={16} color="var(--blue-500)" /> Системные заболевания
				</label>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "6px",
						marginBottom: "12px",
					}}
				>
					{QUICK_DISEASES.map((q) => (
						<button
							key={q}
							type="button"
							className="text-button"
							style={{
								padding: "4px 10px",
								fontSize: "0.8rem",
								borderRadius: "100px",
								background: "var(--blue-50)",
								color: "var(--blue-700)",
								border: "1px solid var(--blue-200)",
							}}
							onClick={() => addTag("systemicDiseases", q)}
						>
							+ {q}
						</button>
					))}
				</div>
				<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
					<input
						className="text-input"
						style={{ flex: 1 }}
						value={newDisease}
						onChange={(e) => setNewDisease(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								addTag("systemicDiseases", newDisease);
								setNewDisease("");
								e.preventDefault();
							}
						}}
						placeholder="Добавить заболевание вручную..."
					/>
					<button
						type="button"
						className="primary-button"
						onClick={() => {
							addTag("systemicDiseases", newDisease);
							setNewDisease("");
						}}
					>
						<Plus size={16} />
					</button>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{systemicDiseases.map((a) => (
						<span
							key={a}
							style={{
								background: "var(--blue-100)",
								color: "var(--blue-900)",
								padding: "4px 12px",
								borderRadius: "6px",
								fontSize: "0.9rem",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							{a}{" "}
							<X
								size={14}
								style={{ cursor: "pointer" }}
								onClick={() => removeTag("systemicDiseases", a)}
							/>
						</span>
					))}
				</div>
			</div>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Medications */}
			<div>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontWeight: 600,
						marginBottom: "8px",
					}}
				>
					<Pill size={16} color="var(--indigo-500)" /> Принимаемые препараты
				</label>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "6px",
						marginBottom: "12px",
					}}
				>
					{QUICK_MEDICATIONS.map((q) => (
						<button
							key={q}
							type="button"
							className="text-button"
							style={{
								padding: "4px 10px",
								fontSize: "0.8rem",
								borderRadius: "100px",
								background: "var(--indigo-50)",
								color: "var(--indigo-700)",
								border: "1px solid var(--indigo-200)",
							}}
							onClick={() => addTag("medications", q)}
						>
							+ {q}
						</button>
					))}
				</div>
				<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
					<input
						className="text-input"
						style={{ flex: 1 }}
						value={newMed}
						onChange={(e) => setNewMed(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								addTag("medications", newMed);
								setNewMed("");
								e.preventDefault();
							}
						}}
						placeholder="Добавить препарат вручную..."
					/>
					<button
						type="button"
						className="primary-button"
						onClick={() => {
							addTag("medications", newMed);
							setNewMed("");
						}}
					>
						<Plus size={16} />
					</button>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{medications.map((a) => (
						<span
							key={a}
							style={{
								background: "var(--indigo-100)",
								color: "var(--indigo-900)",
								padding: "4px 12px",
								borderRadius: "6px",
								fontSize: "0.9rem",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							{a}{" "}
							<X
								size={14}
								style={{ cursor: "pointer" }}
								onClick={() => removeTag("medications", a)}
							/>
						</span>
					))}
				</div>
			</div>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Pregnancy Status */}
			<div>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						fontWeight: 600,
						marginBottom: "12px",
					}}
				>
					<Baby size={16} color="var(--fuchsia-500)" /> Статус беременности
				</label>
				<div style={{ display: "flex", gap: "12px" }}>
					{[
						{ val: "none", label: "Нет" },
						{ val: "pregnant", label: "Беременность" },
						{ val: "lactating", label: "Лактация" },
					].map((opt) => (
						<button
							key={opt.val}
							type="button"
							className="text-button"
							onClick={() =>
								setAnamnesisDraft((prev: any) => ({
									...prev,
									pregnancyStatus: opt.val,
								}))
							}
							style={{
								flex: 1,
								padding: "10px",
								borderRadius: "8px",
								background:
									pregnancyStatus === opt.val
										? "var(--fuchsia-500)"
										: "var(--slate-50)",
								color:
									pregnancyStatus === opt.val ? "white" : "var(--slate-700)",
								border: `1px solid ${pregnancyStatus === opt.val ? "var(--fuchsia-600)" : "var(--slate-200)"}`,
								fontWeight: pregnancyStatus === opt.val ? 600 : 400,
								transition: "all 0.2s",
							}}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					marginTop: "16px",
					paddingTop: "16px",
					borderTop: "1px solid var(--slate-100)",
				}}
			>
				<button
					type="button"
					className="primary-button"
					onClick={handleSave}
					disabled={isSaving}
					style={{ flex: 1, justifyContent: "center", padding: "12px" }}
				>
					<Save size={18} />
					{isSaving ? "Сохранение..." : "Сохранить Анамнез"}
				</button>
				{anamnesisSaveState === "saved" && (
					<span style={{ color: "var(--emerald-600)", fontWeight: 500 }}>
						Успешно сохранено
					</span>
				)}
				{anamnesisSaveState === "error" && (
					<span style={{ color: "var(--red-600)", fontWeight: 500 }}>
						<AlertTriangle
							size={16}
							style={{ display: "inline", marginBottom: "-3px" }}
						/>{" "}
						Ошибка
					</span>
				)}
			</div>
		</section>
	);
}
