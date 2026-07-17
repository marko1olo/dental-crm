import React from "react";
import { UploadCloud, Check } from "lucide-react";

export function Step6Legal({
	legal,
	setLegal,
	logoUploaded,
	setLogoUploaded,
	accentColor,
	isDark,
	textColor,
}: any) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 24,
				width: "100%",
			}}
		>
			<div style={{ textAlign: "center", marginBottom: 8 }}>
				<p
					style={{
						margin: 0,
						fontSize: 18,
						color: accentColor,
						fontWeight: 700,
					}}
				>
					ЮРИДИЧЕСКИЕ РЕКВИЗИТЫ
				</p>
				<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
					Введите данные для автоматической генерации договоров и загрузите
					логотип.
				</p>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
				<div style={{ flex: "1 1 calc(50% - 8px)", minWidth: "200px" }}>
					<label
						style={{
							display: "block",
							fontSize: 12,
							color: "#888",
							marginBottom: 4,
						}}
					>
						ИНН (10 или 12 цифр)
					</label>
					<input
						value={legal.inn}
						onChange={(e) =>
							setLegal({
								...legal,
								inn: e.target.value.replace(/\D/g, "").slice(0, 12),
							})
						}
						placeholder="0000000000"
						style={{
							width: "100%",
							padding: "14px 16px",
							borderRadius: 12,
							border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
							background: "transparent",
							color: textColor,
							fontSize: 15,
						}}
					/>
				</div>
				<div style={{ flex: "1 1 calc(50% - 8px)", minWidth: "200px" }}>
					<label
						style={{
							display: "block",
							fontSize: 12,
							color: "#888",
							marginBottom: 4,
						}}
					>
						ОГРН (13 или 15 цифр)
					</label>
					<input
						value={legal.ogrn || ""}
						onChange={(e) =>
							setLegal({
								...legal,
								ogrn: e.target.value.replace(/\D/g, "").slice(0, 15),
							})
						}
						placeholder="0000000000000"
						style={{
							width: "100%",
							padding: "14px 16px",
							borderRadius: 12,
							border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
							background: "transparent",
							color: textColor,
							fontSize: 15,
						}}
					/>
				</div>
				<div style={{ flex: "1 1 100%" }}>
					<label
						style={{
							display: "block",
							fontSize: 12,
							color: "#888",
							marginBottom: 4,
						}}
					>
						Юридический адрес
					</label>
					<input
						value={legal.address || ""}
						onChange={(e) => setLegal({ ...legal, address: e.target.value })}
						placeholder="г. Москва, ул. Ленина, д. 1"
						style={{
							width: "100%",
							padding: "14px 16px",
							borderRadius: 12,
							border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
							background: "transparent",
							color: textColor,
							fontSize: 15,
						}}
					/>
				</div>
			</div>

			<div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
				<div
					style={{
						height: 160,
						border: `2px dashed ${accentColor}`,
						borderRadius: 16,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						background: logoUploaded ? `${accentColor}11` : "transparent",
					}}
					onClick={() => {
						if (!logoUploaded) {
							setTimeout(() => setLogoUploaded(true), 1500);
						}
					}}
				>
					{logoUploaded ? (
						<>
							<Check size={40} color={accentColor} />
							<span style={{ marginTop: 12, color: accentColor }}>
								Логотип загружен
							</span>
						</>
					) : (
						<>
							<UploadCloud size={40} color={accentColor} />
							<span style={{ marginTop: 12, color: accentColor }}>
								Загрузить логотип клиники
							</span>
							<span style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
								PNG, JPG, SVG до 5MB
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
