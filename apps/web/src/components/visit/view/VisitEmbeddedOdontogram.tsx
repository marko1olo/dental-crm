import React from "react";
import { VisitOdontogramToothItem } from "./VisitOdontogramToothItem";

export interface VisitEmbeddedOdontogramProps {
	activeQuadrant: number | null;
	setActiveQuadrant: (q: number | null) => void;
	activeStamp: string;
	setActiveStamp: (stamp: string) => void;
	activeStampRef: React.MutableRefObject<string>;
	toothRows: string[][];
	toothStateByCode: Record<string, string>;
	draft?: { quality?: { detectedToothCodes?: string[] } } | null;
	handleToothClick: (code: string, state: string) => void;
}

export function VisitEmbeddedOdontogram({
	activeQuadrant,
	setActiveQuadrant,
	setActiveStamp,
	activeStampRef,
	toothRows,
	toothStateByCode,
	draft,
	handleToothClick,
}: VisitEmbeddedOdontogramProps) {
	const detectedCodes = draft?.quality?.detectedToothCodes || [];

	return (
		<section className="tooth-map" aria-label="Зубная карта">
			<div
				className="tooth-map-selected"
				style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
				aria-hidden="true"
			>
				<button
					type="button"
					tabIndex={-1}
					onClick={() => {
						setActiveStamp("watch");
						activeStampRef.current = "watch";
					}}
				>
					Наблюдение
				</button>
			</div>

			<div className="tooth-map-head">
				<div>
					<h3>Зубная карта приёма</h3>
					<p>Отметки зубов и состояние зубного ряда текущего приёма.</p>
				</div>
			</div>

			{/* Навигация по квадрантам */}
			<nav
				className="quadrant-nav flex items-center gap-1.5 overflow-x-auto pb-1"
				aria-label="Секторы челюсти"
			>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[44px] px-3 py-2 ${activeQuadrant === null ? "active" : ""}`}
					onClick={() => setActiveQuadrant(null)}
					title="Обе челюсти целиком"
				>
					Все секторы
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[44px] px-3 py-2 ${activeQuadrant === 1 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(1)}
					title="Первый сектор: зубы 11–18"
				>
					Верх справа
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[44px] px-3 py-2 ${activeQuadrant === 2 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(2)}
					title="Второй сектор: зубы 21–28"
				>
					Верх слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[44px] px-3 py-2 ${activeQuadrant === 3 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(3)}
					title="Третий сектор: зубы 31–38"
				>
					Низ слева
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn shrink-0 min-h-[44px] px-3 py-2 ${activeQuadrant === 4 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(4)}
					title="Четвёртый сектор: зубы 41–48"
				>
					Низ справа
				</button>
			</nav>

			{/* Зубная схема с квадрантами */}
			<div
				className={`tooth-arch-wrapper ${activeQuadrant !== null ? "zoom-active" : ""}`}
			>
				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels upper-labels">
						<span
							className="quadrant-label"
							title="Первый сектор: зубы 11–18"
						>
							верх справа
						</span>
						<span
							className="quadrant-label"
							title="Второй сектор: зубы 21–28"
						>
							верх слева
						</span>
					</div>
				)}

				{/* Верхняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 1 ||
					activeQuadrant === 2) && (
					<div className="tooth-jaw upper-jaw">
						{/* Правая половина верхней: Q1 — 18→11 */}
						{(activeQuadrant === null || activeQuadrant === 1) && (
							<div className="tooth-half tooth-row">
								{(toothRows[0] || []).slice(0, 8).map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
									/>
								))}
							</div>
						)}

						{/* Левая половина верхней: Q2 — 21→28 */}
						{(activeQuadrant === null || activeQuadrant === 2) && (
							<div className="tooth-half tooth-row">
								{(toothRows[0] || []).slice(8).map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Нижняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 3 ||
					activeQuadrant === 4) && (
					<div className="tooth-jaw lower-jaw">
						{/* Правая половина нижней: Q4 — 48→41 */}
						{(activeQuadrant === null || activeQuadrant === 4) && (
							<div className="tooth-half tooth-row">
								{(toothRows[1] || []).slice(0, 8).map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
									/>
								))}
							</div>
						)}

						{/* Левая половина нижней: Q3 — 31→38 */}
						{(activeQuadrant === null || activeQuadrant === 3) && (
							<div className="tooth-half tooth-row">
								{(toothRows[1] || []).slice(8).map((code) => (
									<VisitOdontogramToothItem
										key={code}
										code={code}
										state={toothStateByCode[code] ?? "idle"}
										isDetected={detectedCodes.includes(code)}
										onClick={handleToothClick}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels lower-labels">
						<span
							className="quadrant-label"
							title="Четвёртый сектор: зубы 41–48"
						>
							низ справа
						</span>
						<span
							className="quadrant-label"
							title="Третий сектор: зубы 31–38"
						>
							низ слева
						</span>
					</div>
				)}
			</div>
		</section>
	);
}
