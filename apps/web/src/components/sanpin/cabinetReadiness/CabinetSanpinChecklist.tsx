/**
 * @file CabinetSanpinChecklist.tsx
 * @description Layer 4: Executive SanPiN 3.3686-21 readiness card with background auto-calculation (Mandates 8e, 8n).
 * Eliminates Tamagotchi micromanagement (CRM != Reality Simulator).
 * 20 physical item checkpoints are automated by default with 1-click "Норма",
 * and manual override is reserved strictly for equipment malfunctions / exceptions.
 */

import { CABINET_READINESS_PRESETS } from "@dental/shared";
import {
	AlertCircle,
	Check,
	CheckCircle2,
	ChevronDown,
	Filter,
	ShieldCheck,
	Sparkles,
	Wind,
	Wrench,
	Zap,
} from "lucide-react";
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
	const allItemsReady =
		disinfectionCompleted &&
		turbineSterile &&
		contraAngleSterile &&
		micromotorSterile &&
		class5Verified &&
		mirrorReady &&
		probeReady &&
		tweezersReady &&
		excavatorReady &&
		spatulaReady &&
		salivaConnected &&
		hveConnected &&
		(!currentPreset.requiresCofferdam || (rubberDamReady && clampsReady && forcepsReady));

	return (
		<div className="cabinet-sanpin-checklist-container" style={{ marginTop: "0.75rem" }}>
			{/* Executive Background Auto-Calculation Panel (Mandates 8e & 8n: Anti-Tamagotchi) */}
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "1rem 1.25rem",
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
				}}
			>
				{/* Header & Policy statement */}
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: "1rem",
						flexWrap: "wrap",
						marginBottom: "0.85rem",
					}}
				>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
							<h3
								style={{
									fontSize: "1rem",
									fontWeight: 800,
									margin: 0,
									color: "var(--ink, #0f172a)",
									display: "flex",
									alignItems: "center",
									gap: "0.45rem",
								}}
							>
								<ShieldCheck size={20} color="var(--teal, #0d9488)" />
								<span>Автоматический санитарный контроль готовности кабинета</span>
							</h3>
							<span
								style={{
									padding: "0.15rem 0.55rem",
									borderRadius: "0.375rem",
									fontSize: "0.72rem",
									fontWeight: 800,
									background: allItemsReady ? "rgba(13, 148, 136, 0.12)" : "rgba(245, 158, 11, 0.12)",
									color: allItemsReady ? "var(--teal, #0d9488)" : "var(--warn-fg, #b45309)",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.25rem",
								}}
							>
								{allItemsReady ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
								<span>{allItemsReady ? "Норма по умолчанию" : "Имеются исключения"}</span>
							</span>
						</div>
						<p
							style={{
								margin: "0.25rem 0 0",
								fontSize: "0.8rem",
								color: "var(--muted, #64748b)",
								lineHeight: 1.45,
							}}
						>
							Фоновый расчет нормативов без симуляции ручного труда (CRM != The Sims). Врач и ассистент не кликают
							20 бытовых галочек перед каждым приемом. Журналы дезинфекции и стерилизации формируются автоматически.
						</p>
					</div>

					{/* 1-Click "Норма" Preset CTA */}
					<button
						type="button"
						onClick={onQuickFillAllReady}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "40px",
							padding: "0.4rem 0.95rem",
							fontSize: "0.85rem",
							fontWeight: 800,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							borderRadius: "0.5rem",
							background: "rgba(13, 148, 136, 0.1)",
							color: "var(--teal, #0d9488)",
							border: "1px solid rgba(13, 148, 136, 0.3)",
							boxShadow: "0 1px 2px rgba(13, 148, 136, 0.08)",
						}}
						title="Подтвердить соблюдение нормативов СанПиН для текущего кабинета в 1 клик"
					>
						<Check size={16} /> <span>Норма в 1 клик</span>
					</button>
				</div>

				{/* Selectors: Cabinet & Specialization Profile */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
						gap: "1rem",
						padding: "0.75rem",
						background: "var(--paper-subtle, #f8fafc)",
						borderRadius: "0.5rem",
						border: "1px solid var(--line, #e2e8f0)",
						marginBottom: "1rem",
					}}
				>
					<div>
						<label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #1e293b)", display: "block", marginBottom: "0.3rem" }}>
							Стоматологический кабинет:
						</label>
						<select
							value={selectedCabinet}
							onChange={(e) => setSelectedCabinet(e.target.value)}
							className="sanpin-input"
							style={{ width: "100%", minHeight: "40px", fontSize: "0.85rem" }}
						>
							<option value="Кабинет № 1">Кабинет № 1 (Терапия/Эндодонтия)</option>
							<option value="Кабинет № 2">Кабинет № 2 (Терапия/Ортопедия)</option>
							<option value="Хирургический кабинет">Хирургический кабинет (Операционная)</option>
							<option value="Детский кабинет">Детский кабинет</option>
							<option value="Ортодонтический кабинет">Ортодонтический кабинет</option>
						</select>
					</div>

					<div>
						<label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #1e293b)", display: "block", marginBottom: "0.3rem" }}>
							Профиль приёма / Специализация:
						</label>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))", gap: "0.35rem" }}>
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
											minHeight: "40px",
											padding: "0.35rem 0.5rem",
											fontSize: "0.8rem",
											fontWeight: isSelected ? 800 : 500,
											background: isSelected ? "rgba(13, 148, 136, 0.12)" : "var(--paper, #ffffff)",
											border: isSelected
												? "2px solid var(--teal, #0d9488)"
												: "1px solid var(--paper-border, #cbd5e1)",
											color: isSelected ? "var(--teal, #0d9488)" : "inherit",
											borderRadius: "0.375rem",
											cursor: "pointer",
											textAlign: "center",
										}}
									>
										{p.shortLabelRu}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* 3 High-Level Statutory Status Cards (Norm by Default) */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
						gap: "0.75rem",
						marginBottom: "0.5rem",
					}}
				>
					{/* Card 1: Surface Disinfection */}
					<div
						style={{
							padding: "0.75rem",
							background: "var(--paper, #ffffff)",
							borderRadius: "0.5rem",
							border: disinfectionCompleted
								? "1px solid rgba(13, 148, 136, 0.3)"
								: "1px solid rgba(245, 158, 11, 0.3)",
							borderLeft: disinfectionCompleted
								? "4px solid var(--teal, #0d9488)"
								: "4px solid var(--warn-fg, #b45309)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
							<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
								<Sparkles size={15} color="var(--teal, #0d9488)" />
								<span>Дезинфекция поверхностей</span>
							</strong>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: disinfectionCompleted ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
								{disinfectionCompleted ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
								<span>{disinfectionCompleted ? "Обработано" : "Требуется"}</span>
							</span>
						</div>
						<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
							{disinfectantBrand} • {exposureMinutes} мин (норма не менее {currentPreset.minExposureMinutes} мин). Кресло, столик, светильник, шланги.
						</p>
					</div>

					{/* Card 2: Handpieces & Sterile Tray */}
					<div
						style={{
							padding: "0.75rem",
							background: "var(--paper, #ffffff)",
							borderRadius: "0.5rem",
							border: turbineSterile && contraAngleSterile && class5Verified
								? "1px solid rgba(13, 148, 136, 0.3)"
								: "1px solid rgba(245, 158, 11, 0.3)",
							borderLeft: turbineSterile && contraAngleSterile && class5Verified
								? "4px solid var(--teal, #0d9488)"
								: "4px solid var(--warn-fg, #b45309)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
							<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
								<ShieldCheck size={15} color="var(--teal, #0d9488)" />
								<span>Стерильные инструменты</span>
							</strong>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: turbineSterile && contraAngleSterile ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
								{turbineSterile && contraAngleSterile ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
								<span>{turbineSterile && contraAngleSterile ? "5 класс ОК" : "Проверить"}</span>
							</span>
						</div>
						<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
							Турбинный и угловой наконечники стерильны. Смотровой лоток (зеркало, зонд, пинцет, гладилка) укомплектован.
						</p>
					</div>

					{/* Card 3: Aspiration & Isolation */}
					<div
						style={{
							padding: "0.75rem",
							background: "var(--paper, #ffffff)",
							borderRadius: "0.5rem",
							border: salivaConnected && hveConnected
								? "1px solid rgba(13, 148, 136, 0.3)"
								: "1px solid rgba(245, 158, 11, 0.3)",
							borderLeft: salivaConnected && hveConnected
								? "4px solid var(--teal, #0d9488)"
								: "4px solid var(--warn-fg, #b45309)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
							<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
								<Wind size={15} color="var(--teal, #0d9488)" />
								<span>Аспирация и изоляция</span>
							</strong>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: salivaConnected && hveConnected ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
								{salivaConnected && hveConnected ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
								<span>{salivaConnected && hveConnected ? "Подключено" : "Проверить"}</span>
							</span>
						</div>
						<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
							Слюноотсос и пылесос (HVE) активны. {currentPreset.requiresCofferdam ? "Коффердам готов по протоколу." : "Коффердам по показаниям."}
						</p>
					</div>
				</div>
			</div>

			{/* Collapsible Section for Equipment Malfunctions & Exceptions Only */}
			<details
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "0.75rem 1.1rem",
					marginTop: "0.75rem",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 700,
						fontSize: "0.88rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						color: "var(--brand-primary, #2563eb)",
						userSelect: "none",
					}}
				>
					<Wrench size={16} />
					<span>Журнал исключений и ручная корректировка узлов (только при поломке или ремонте)</span>
					<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
							Все 20 параметров по умолчанию в норме • Нажмите для фиксации дефектов
						</span>
						<ChevronDown size={15} color="var(--muted, #64748b)" />
					</div>
				</summary>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: "1.25rem",
						marginTop: "1rem",
						paddingTop: "0.75rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
					}}
				>
					{/* Column 1: Disinfection Override */}
					<div
						style={{
							background: "var(--paper-subtle, #f8fafc)",
							border: "1px solid var(--paper-border, #e2e8f0)",
							borderRadius: "0.75rem",
							padding: "1rem",
						}}
					>
						<h4
							style={{
								fontSize: "0.9rem",
								fontWeight: 700,
								marginBottom: "0.6rem",
								color: "var(--teal, #0d9488)",
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
							}}
						>
							<Sparkles size={16} /> Параметры дезинфекции поверхностей:
						</h4>

						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.6rem",
								fontSize: "0.85rem",
								marginBottom: "0.6rem",
								cursor: "pointer",
								minHeight: "40px",
							}}
						>
							<input
								type="checkbox"
								checked={disinfectionCompleted}
								onChange={(e) => setDisinfectionCompleted(e.target.checked)}
								style={{ width: "18px", height: "18px" }}
							/>
							<span>Санитарная дезинфекция поверхностей (СанПиН 3.3686-21)</span>
						</label>

						<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.2rem" }}>
									Дезсредство:
								</label>
								<input
									type="text"
									value={disinfectantBrand}
									onChange={(e) => setDisinfectantBrand(e.target.value)}
									className="sanpin-input"
									style={{ minHeight: "40px", fontSize: "0.85rem" }}
								/>
							</div>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.2rem" }}>
									Экспозиция (мин):
								</label>
								<input
									type="number"
									min={1}
									max={30}
									value={exposureMinutes}
									onChange={(e) => setExposureMinutes(Number(e.target.value))}
									className="sanpin-input"
									style={{ minHeight: "40px", fontSize: "0.85rem" }}
								/>
							</div>
						</div>
						{exposureMinutes < currentPreset.minExposureMinutes && (
							<div style={{ color: "var(--bad-fg, #ef4444)", fontSize: "0.75rem", marginTop: "0.3rem", fontWeight: 600 }}>
								Внимание: по нормативу требуется экспозиция не менее {currentPreset.minExposureMinutes} мин!
							</div>
						)}
					</div>

					{/* Column 2: Individual Unit Checks for Breakdowns */}
					<div
						style={{
							background: "var(--paper-subtle, #f8fafc)",
							border: "1px solid var(--paper-border, #e2e8f0)",
							borderRadius: "0.75rem",
							padding: "1rem",
						}}
					>
						<h4
							style={{
								fontSize: "0.9rem",
								fontWeight: 700,
								marginBottom: "0.6rem",
								color: "var(--brand-primary, #2563eb)",
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
							}}
						>
							<Filter size={16} /> Ручная отметка неисправностей узлов:
						</h4>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
							{/* Handpieces */}
							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.55rem 0.75rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>
									Наконечники и стерильность:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem", cursor: "pointer" }}>
									<input type="checkbox" checked={turbineSterile} onChange={(e) => setTurbineSterile(e.target.checked)} style={{ width: "16px", height: "16px" }} />
									<span>Турбинный наконечник стерилен и исправен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem", cursor: "pointer" }}>
									<input type="checkbox" checked={contraAngleSterile} onChange={(e) => setContraAngleSterile(e.target.checked)} style={{ width: "16px", height: "16px" }} />
									<span>Угловой / микромоторный наконечник стерилен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
									<input type="checkbox" checked={class5Verified} onChange={(e) => setClass5Verified(e.target.checked)} style={{ width: "16px", height: "16px" }} />
									<span style={{ fontWeight: 600, color: "var(--ok-fg, #059669)" }}>Индикатор 5 класса (Интеграл/Медтест) проверен</span>
								</label>
							</div>

							{/* Tray */}
							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.55rem 0.75rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>
									Смотровой лоток:
								</strong>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.2rem" }}>
									<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
										<input type="checkbox" checked={mirrorReady} onChange={(e) => setMirrorReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
										<span>Зеркало</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
										<input type="checkbox" checked={probeReady} onChange={(e) => setProbeReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
										<span>Зонд</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
										<input type="checkbox" checked={tweezersReady} onChange={(e) => setTweezersReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
										<span>Пинцет</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
										<input type="checkbox" checked={excavatorReady} onChange={(e) => setExcavatorReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
										<span>Экскаватор</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", gridColumn: "span 2" }}>
										<input type="checkbox" checked={spatulaReady} onChange={(e) => setSpatulaReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
										<span>Гладилка-штопфер</span>
									</label>
								</div>
							</div>

							{/* Aspiration */}
							<div
								style={{
									background: "var(--paper, #ffffff)",
									padding: "0.55rem 0.75rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>
									Аспирация и изоляция:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem", cursor: "pointer" }}>
									<input type="checkbox" checked={salivaConnected} onChange={(e) => setSalivaConnected(e.target.checked)} style={{ width: "16px", height: "16px" }} />
									<span>Слюноотсос исправен и подключен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem", cursor: "pointer" }}>
									<input type="checkbox" checked={hveConnected} onChange={(e) => setHveConnected(e.target.checked)} style={{ width: "16px", height: "16px" }} />
									<span>Пылесос (высокообъемная канюля) исправен</span>
								</label>
								{currentPreset.requiresCofferdam && (
									<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
										<input
											type="checkbox"
											checked={rubberDamReady && clampsReady && forcepsReady}
											onChange={(e) => {
												const val = e.target.checked;
												setRubberDamReady(val);
												setClampsReady(val);
												setForcepsReady(val);
											}}
											style={{ width: "16px", height: "16px" }}
										/>
										<span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>Коффердам (платок, клампы, щипцы)</span>
									</label>
								)}
							</div>
						</div>
					</div>
				</div>
			</details>
		</div>
	);
}
