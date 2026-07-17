import type React from "react";
import { useEffect, useState } from "react";
import { showToast } from "../GlobalToast";

interface GnathologyData {
	occlusionType: string;
	jawShift: string;
	tmjState: string;
	mouthOpeningMm: number | null;
	osteopathicStatus: string;
}

interface GnathologyFormProps {
	visitId: string | null;
	patientId: string | null;
}

export function GnathologyForm({ visitId, patientId }: GnathologyFormProps) {
	const [occlusion, setOcclusion] = useState("");
	const [shift, setShift] = useState("");
	const [tmj, setTmj] = useState("");
	const [opening, setOpening] = useState("45");
	const [osteoStatus, setOsteoStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!visitId) return;
		const token = localStorage.getItem("dente_staff_token");
		fetch(`/api/visits/${visitId}/gnathology`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!data || data.error) return;
				setOcclusion(data.occlusionType || "");
				setShift(data.jawShift || "");
				setTmj(data.tmjState || "");
				setOpening(data.mouthOpeningMm ? String(data.mouthOpeningMm) : "45");
				setOsteoStatus(data.osteopathicStatus || "");
			})
			.catch(console.error);
	}, [visitId]);

	const handleSave = async () => {
		if (!visitId) {
			showToast("Визит не активен", "warning");
			return;
		}
		setIsSaving(true);
		try {
			const token = localStorage.getItem("dente_staff_token");
			const res = await fetch(`/api/visits/${visitId}/gnathology`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					patientId,
					occlusionType: occlusion,
					jawShift: shift,
					tmjState: tmj,
					mouthOpeningMm: opening ? Number(opening) : null,
					osteopathicStatus: osteoStatus,
				}),
			});
			if (!res.ok) throw new Error("Ошибка при сохранении");
			showToast("Данные гнатологии сохранены", "success");
		} catch (err) {
			console.error(err);
			showToast("Ошибка сохранения", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const selectStyle: React.CSSProperties = {
		padding: "8px 12px",
		borderRadius: "8px",
		border: "1px solid var(--line)",
		background: "var(--paper)",
		color: "var(--text-primary)",
		fontSize: "14px",
		width: "100%",
	};

	return (
		<details
			className="gnathology-toggle"
			style={{
				marginTop: "8px",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "12px 16px",
				background: "var(--paper)",
			}}
		>
			<summary
				style={{
					fontWeight: 600,
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					listStyle: "none",
					color: "var(--text-primary)",
				}}
			>
				🦴 Гнатология и Остеопатия
			</summary>
			<div
				className="gnathology-content"
				style={{
					marginTop: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
				}}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
						gap: "12px",
					}}
				>
					<label
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--text-secondary)",
						}}
					>
						Тип окклюзии
						<select
							value={occlusion}
							onChange={(e) => setOcclusion(e.target.value)}
							style={selectStyle}
						>
							<option value="">-- Выберите --</option>
							<option value="I класс">I класс (нейтральная)</option>
							<option value="II класс, 1">II класс, 1 подкласс</option>
							<option value="II класс, 2">II класс, 2 подкласс</option>
							<option value="III класс">III класс (мезиальная)</option>
							<option value="Открытый прикус">Открытый прикус</option>
							<option value="Глубокий прикус">Глубокий прикус</option>
							<option value="Перекрёстный прикус">Перекрёстный прикус</option>
						</select>
					</label>

					<label
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--text-secondary)",
						}}
					>
						Смещение челюсти
						<select
							value={shift}
							onChange={(e) => setShift(e.target.value)}
							style={selectStyle}
						>
							<option value="">-- Выберите --</option>
							<option value="Нет">Нет смещения</option>
							<option value="Вправо">Латеродевиация вправо</option>
							<option value="Влево">Латеродевиация влево</option>
							<option value="Ретрузия">Ретрузия</option>
							<option value="Протрузия">Протрузия</option>
						</select>
					</label>

					<label
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--text-secondary)",
						}}
					>
						Состояние ВНЧС
						<select
							value={tmj}
							onChange={(e) => setTmj(e.target.value)}
							style={selectStyle}
						>
							<option value="">-- Выберите --</option>
							<option value="Норма">Безболезненно, шумов нет</option>
							<option value="Щелчок справа">Щелчок справа</option>
							<option value="Щелчок слева">Щелчок слева</option>
							<option value="Щелчок с обеих сторон">
								Щелчок с обеих сторон
							</option>
							<option value="Крепитация">Крепитация</option>
							<option value="Болезненность при пальпации">
								Болезненность при пальпации
							</option>
							<option value="Ограничение открывания">
								Ограничение открывания
							</option>
						</select>
					</label>

					<label
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "4px",
							fontSize: "13px",
							fontWeight: 500,
							color: "var(--text-secondary)",
						}}
					>
						Амплитуда открывания рта (мм)
						<input
							value={opening}
							onChange={(e) => setOpening(e.target.value)}
							type="number"
							min="0"
							max="80"
							placeholder="мм"
							style={selectStyle}
						/>
					</label>
				</div>

				<label
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "4px",
						fontSize: "13px",
						fontWeight: 500,
						color: "var(--text-secondary)",
					}}
				>
					Остеопатический статус (постура)
					<textarea
						value={osteoStatus}
						onChange={(e) => setOsteoStatus(e.target.value)}
						rows={2}
						placeholder="Положение головы, асимметрия надплечий, перекос таза..."
						style={{ ...selectStyle, resize: "vertical" }}
					/>
				</label>

				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<button
						type="button"
						className="primary-button"
						style={{ padding: "8px 20px" }}
						disabled={isSaving}
						onClick={handleSave}
					>
						{isSaving ? "Сохранение..." : "Сохранить данные"}
					</button>
				</div>
			</div>
		</details>
	);
}
