/**
 * @file CabinetSanpinChecklist.tsx
 * @description Layer 4: Structured SanPiN checklist with 1-click "Норма" preset (Mandate 8e).
 */

import { CABINET_READINESS_PRESETS } from "@dental/shared";
import { Check, CheckCircle2, Filter, Sparkles, Zap } from "lucide-react";
import React from "react";
import type { CabinetSanpinChecklistProps } from "./types";

export function CabinetSanpinChecklist({
	selectedCabinet,
	setSelectedCabinet,
	selectedProfile,
	setSelectedProfile,
	currentPreset,
	disinfectionCompleted,
	setDisinfectionCompleted,
	disinfectantBrand,
	setDisinfectantBrand,
	exposureMinutes,
	setExposureMinutes,
	turbineSterile,
	setTurbineSterile,
	contraAngleSterile,
	setContraAngleSterile,
	micromotorSterile,
	setMicromotorSterile,
	class5Verified,
	setClass5Verified,
	mirrorReady,
	setMirrorReady,
	probeReady,
	setProbeReady,
	tweezersReady,
	setTweezersReady,
	excavatorReady,
	setExcavatorReady,
	spatulaReady,
	setSpatulaReady,
	salivaConnected,
	setSalivaConnected,
	hveConnected,
	setHveConnected,
	rubberDamReady,
	setRubberDamReady,
	clampsReady,
	setClampsReady,
	forcepsReady,
	setForcepsReady,
	onQuickFillAllReady,
}: CabinetSanpinChecklistProps) {
	return (
		<div className="cabinet-sanpin-checklist-container" style={{ marginTop: "0.75rem" }}>
			<details
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "0.75rem 1.1rem",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 700,
						fontSize: "0.9rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						color: "var(--brand-primary, #2563eb)",
						userSelect: "none",
					}}
				>
					<Filter size={16} />
					<span>Детальный чек-лист узлов установки (20 параметров — для исключений и поломок)</span>
					<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.65rem" }}>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onQuickFillAllReady();
							}}
							className="sanpin-btn sanpin-btn-secondary"
							style={{
								minHeight: "36px",
								padding: "0.3rem 0.75rem",
								fontSize: "0.82rem",
								fontWeight: 700,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "6px",
								background: "rgba(13, 148, 136, 0.1)",
								color: "var(--teal, #0d9488)",
								border: "1px solid rgba(13, 148, 136, 0.3)",
							}}
							title="Отметить все пункты текущего профиля как готовые по норме в 1 клик"
						>
							<Check size={14} /> <span>Норма в 1 клик</span>
						</button>
						<span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
							Развернуть для ручной корректировки
						</span>
					</div>
				</summary>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: "1.25rem",
						marginTop: "1rem",
					}}
				>
					{/* Column 1: Configuration & Disinfection */}
					<div
						style={{
							background: "var(--paper-subtle, #f8fafc)",
							border: "1px solid var(--paper-border, #e2e8f0)",
							borderRadius: "0.75rem",
							padding: "1.25rem",
						}}
					>
						<h3
							style={{
								fontSize: "1rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								marginBottom: "1rem",
								color: "var(--brand-primary, #2563eb)",
							}}
						>
							<Filter size={18} /> Шаг 1: Профиль приёма и Кабинет
						</h3>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
							<div>
								<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
									Стоматологический кабинет:
								</label>
								<select
									value={selectedCabinet}
									onChange={(e) => setSelectedCabinet(e.target.value)}
									className="sanpin-input"
									style={{ width: "100%", minHeight: "44px" }}
								>
									<option value="Кабинет № 1">Кабинет № 1 (Терапия/Эндодонтия)</option>
									<option value="Кабинет № 2">Кабинет № 2 (Терапия/Ортопедия)</option>
									<option value="Хирургический кабинет">Хирургический кабинет (Операционная)</option>
									<option value="Детский кабинет">Детский кабинет</option>
									<option value="Ортодонтический кабинет">Ортодонтический кабинет</option>
								</select>
							</div>

							<div>
								<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
									Специализация / Профиль приёма:
								</label>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.4rem" }}>
									{CABINET_READINESS_PRESETS.map((p) => {
										const isSelected = selectedProfile === p.type;
										return (
											<button
												key={p.type}
												type="button"
												onClick={() => {
													setSelectedProfile(p.type);
													setExposureMinutes(p.minExposureMinutes);
												}}
												style={{
													minHeight: "42px",
													padding: "0.4rem 0.6rem",
													fontSize: "0.82rem",
													fontWeight: isSelected ? 800 : 500,
													background: isSelected ? "rgba(37, 99, 235, 0.12)" : "var(--paper-subtle, #f8fafc)",
													border: isSelected
														? "2px solid var(--brand-primary, #2563eb)"
														: "1px solid var(--paper-border, #cbd5e1)",
													color: isSelected ? "var(--brand-primary, #2563eb)" : "inherit",
													borderRadius: "0.5rem",
													cursor: "pointer",
													textAlign: "left",
												}}
											>
												{p.shortLabelRu}
											</button>
										);
									})}
								</div>
							</div>

							<div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "0.75rem" }}>
								<h4
									style={{
										fontSize: "0.9rem",
										fontWeight: 700,
										marginBottom: "0.5rem",
										color: "var(--teal, #0d9488)",
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
									}}
								>
									<Sparkles size={16} /> Дезинфекция поверхностей установки:
								</h4>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.6rem",
										fontSize: "0.85rem",
										marginBottom: "0.5rem",
										cursor: "pointer",
										minHeight: "44px",
									}}
								>
									<input
										type="checkbox"
										checked={disinfectionCompleted}
										onChange={(e) => setDisinfectionCompleted(e.target.checked)}
										style={{ width: "20px", height: "20px" }}
									/>
									<span>Поверхности протерты (кресло, столик, светильник, шланги)</span>
								</label>

								<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
									<div>
										<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Дезсредство:</label>
										<input
											type="text"
											value={disinfectantBrand}
											onChange={(e) => setDisinfectantBrand(e.target.value)}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.85rem" }}
										/>
									</div>
									<div>
										<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Экспозиция (мин):</label>
										<input
											type="number"
											min={1}
											max={30}
											value={exposureMinutes}
											onChange={(e) => setExposureMinutes(Number(e.target.value))}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.85rem" }}
										/>
									</div>
								</div>
								{exposureMinutes < currentPreset.minExposureMinutes && (
									<div style={{ color: "var(--bad-fg, #ef4444)", fontSize: "0.75rem", marginTop: "0.3rem", fontWeight: 600 }}>
										Внимание: требуется экспозиция не менее {currentPreset.minExposureMinutes} мин!
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Column 2: Handpieces, Sterile Tray & Aspiration */}
					<div
						style={{
							background: "var(--paper-subtle, #f8fafc)",
							border: "1px solid var(--paper-border, #e2e8f0)",
							borderRadius: "0.75rem",
							padding: "1.25rem",
						}}
					>
						<h3
							style={{
								fontSize: "1rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								marginBottom: "0.75rem",
								color: "var(--brand-primary, #2563eb)",
							}}
						>
							<Sparkles size={18} /> Шаг 2: Стерильные инструменты и Аспирация
						</h3>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.65rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Наконечники и крафт-пакеты:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", cursor: "pointer", minHeight: "36px" }}>
									<input type="checkbox" checked={turbineSterile} onChange={(e) => setTurbineSterile(e.target.checked)} style={{ width: "18px", height: "18px" }} />
									<span>Турбинный наконечник стерилен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", cursor: "pointer", minHeight: "36px" }}>
									<input type="checkbox" checked={contraAngleSterile} onChange={(e) => setContraAngleSterile(e.target.checked)} style={{ width: "18px", height: "18px" }} />
									<span>Угловой / микромоторный наконечник стерилен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", minHeight: "36px" }}>
									<input type="checkbox" checked={class5Verified} onChange={(e) => setClass5Verified(e.target.checked)} style={{ width: "18px", height: "18px" }} />
									<span style={{ fontWeight: 600, color: "var(--ok-fg, #059669)" }}>Индикатор 5 класса (Интеграл/Медтест) проверен</span>
								</label>
							</div>

							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.65rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Базовый смотровой лоток:
								</strong>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.25rem" }}>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", minHeight: "32px" }}>
										<input type="checkbox" checked={mirrorReady} onChange={(e) => setMirrorReady(e.target.checked)} style={{ width: "16px", height: "16px" }} />
										<span>Зеркало</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", minHeight: "32px" }}>
										<input type="checkbox" checked={probeReady} onChange={(e) => setProbeReady(e.target.checked)} style={{ width: "16px", height: "16px" }} />
										<span>Зонд</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", minHeight: "32px" }}>
										<input type="checkbox" checked={tweezersReady} onChange={(e) => setTweezersReady(e.target.checked)} style={{ width: "16px", height: "16px" }} />
										<span>Пинцет</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", minHeight: "32px" }}>
										<input type="checkbox" checked={excavatorReady} onChange={(e) => setExcavatorReady(e.target.checked)} style={{ width: "16px", height: "16px" }} />
										<span>Экскаватор</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", gridColumn: "span 2", minHeight: "32px" }}>
										<input type="checkbox" checked={spatulaReady} onChange={(e) => setSpatulaReady(e.target.checked)} style={{ width: "16px", height: "16px" }} />
										<span>Гладилка-штопфер</span>
									</label>
								</div>
							</div>

							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.65rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Аспирационная система и Коффердам:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", cursor: "pointer", minHeight: "34px" }}>
									<input type="checkbox" checked={salivaConnected} onChange={(e) => setSalivaConnected(e.target.checked)} style={{ width: "18px", height: "18px" }} />
									<span>Слюноотсос (канюля подключена)</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", cursor: "pointer", minHeight: "34px" }}>
									<input type="checkbox" checked={hveConnected} onChange={(e) => setHveConnected(e.target.checked)} style={{ width: "18px", height: "18px" }} />
									<span>Пылесос (высокообъемная канюля)</span>
								</label>
								{currentPreset.requiresCofferdam && (
									<div style={{ marginTop: "0.4rem", borderTop: "1px dashed var(--line, #cbd5e1)", paddingTop: "0.4rem" }}>
										<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", minHeight: "36px" }}>
											<input
												type="checkbox"
												checked={rubberDamReady && clampsReady && forcepsReady}
												onChange={(e) => {
													const val = e.target.checked;
													setRubberDamReady(val);
													setClampsReady(val);
													setForcepsReady(val);
												}}
												style={{ width: "18px", height: "18px" }}
											/>
											<span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>Коффердам (платок, клампы 2A/W8A, щипцы)</span>
										</label>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</details>
		</div>
	);
}
