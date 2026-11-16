import React from "react";
import type { Tooth46ContainerProps } from "../../tooth46Types";
import { DEFAULT_TOOTH46_LAYERS } from "../../tooth46Types";
import { Tooth46ShaderDefs } from "../../Tooth46ShaderDefs";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import type { AnatomicalTemplateData, RootResorptionStage } from "../../../anatomicalGeometriesTypes";
import {
	PEDIATRIC_UPPER_MOLAR_GEOMETRY,
	PEDIATRIC_LOWER_MOLAR_GEOMETRY,
	getPhysiologicalRootResorptionGeometry,
} from "../../../anatomicalPediatricGeometries";
import {
	UPPER_INCISOR_GEOMETRY,
	UPPER_CANINE_GEOMETRY,
	LOWER_INCISOR_GEOMETRY,
	LOWER_CANINE_GEOMETRY,
} from "../../../anatomicalPediatric/resorptionFallbackGeometries";

export function getPediatricGeometry(num: number): AnatomicalTemplateData {
	const pos = num % 10;
	const quadrant = Math.floor(num / 10);
	const isTop = quadrant === 5 || quadrant === 6;

	if (pos === 4 || pos === 5) {
		return isTop ? PEDIATRIC_UPPER_MOLAR_GEOMETRY : PEDIATRIC_LOWER_MOLAR_GEOMETRY;
	}
	if (pos === 3) {
		return isTop ? UPPER_CANINE_GEOMETRY : LOWER_CANINE_GEOMETRY;
	}
	return isTop ? UPPER_INCISOR_GEOMETRY : LOWER_INCISOR_GEOMETRY;
}

export const PediatricToothContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 54,
	isFlipped: isFlippedProp,
	onClick,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;

	const num = toothNumber;
	const quadrant = Math.floor(num / 10);
	const isTop = quadrant === 5 || quadrant === 6;
	const isFlipped = isFlippedProp ?? (quadrant === 6 || quadrant === 7);

	const geom = getPediatricGeometry(num);

	const r = badgeRadius ?? 14;
	const cy = badgeCy ?? (isTop ? (r > 10 ? 24.0 : 20.0) : (r > 10 ? 176.0 : 160.0));
	const baseHeight = 218;
	const viewBox = "0 0 100 218";

	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const enamelFill = isDark ? "url(#dente-enamel-porcelain)" : "url(#dente-enamel-porcelain)";
	const rootFill = isDark ? "url(#dente-root-dentin)" : "url(#dente-root-dentin)";

	// Физиологическая резорбция корней
	const resorptionStage: RootResorptionStage =
		a.periapicalCondition === "resorption" ? 50 : 0;
	const resorptionGeom = getPhysiologicalRootResorptionGeometry(num, resorptionStage);
	const activeRootPath = resorptionGeom.isResorbed && resorptionGeom.rootPath
		? resorptionGeom.rootPath
		: geom.root;

	const isEndo = Boolean(a.canals || a.pulp);

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", cursor: onClick ? "pointer" : "default", ...(style ?? {}) }}
			aria-label={`Молочный анатомический зуб ${num}`}
			role="img"
			onClick={onClick}
		>
			<Tooth46ShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{/* 1. Периапикальная зона / верхушечные очаги */}
				{a.periapicalHalo && (
					<g data-testid="pediatric-periapical-halo">
						{geom.apexHalos.map((apex, i) => (
							<circle
								key={`apex-halo-${i}-${apex.x}-${apex.y}`}
								cx={apex.x}
								cy={apex.y}
								r={8}
								fill={isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(220, 38, 38, 0.25)"}
								stroke={isDark ? "rgba(248, 113, 113, 0.8)" : "rgba(239, 68, 68, 0.7)"}
								strokeWidth={1.2}
							/>
						))}
					</g>
				)}

				{/* 2. Корневая система молочного зуба с физиологической резорбцией */}
				{a.roots && !a.missing && (
					<g data-testid="pediatric-roots" opacity={resorptionGeom.isResorbed ? resorptionGeom.opacity : 1.0}>
						<path
							d={activeRootPath}
							fill={rootFill}
							stroke={stroke}
							strokeWidth={1.4}
							strokeLinejoin="round"
						/>
						{/* Анатомическая пришеечная граница CEJ */}
						{geom.cej && (
							<path
								d={geom.cej}
								fill="none"
								stroke={stroke}
								strokeWidth={1.2}
								strokeDasharray="2,2"
								opacity={0.6}
							/>
						)}
					</g>
				)}

				{/* 3. Анатомическая коронка молочного зуба */}
				{a.crown && !a.missing && (
					<g data-testid="pediatric-crown">
						<path
							d={geom.crown}
							fill={a.zirconiaCrown ? "url(#dente-zirconia-crown)" : enamelFill}
							stroke={stroke}
							strokeWidth={1.5}
							strokeLinejoin="round"
						/>
						{/* Окклюзионные фиссуры молочного зуба */}
						{geom.fissures && !a.zirconiaCrown && (
							<path
								d={geom.fissures}
								fill="none"
								stroke={isDark ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.5)"}
								strokeWidth={1.1}
								strokeLinecap="round"
							/>
						)}
					</g>
				)}

				{/* 4. Пульпа и корневые каналы молочного зуба */}
				{isEndo && !a.missing && (
					<g data-testid="pediatric-endo">
						{geom.pulpChamber && a.pulp && (
							<path
								d={geom.pulpChamber}
								fill={a.guttaPercha ? "url(#dente-guttapercha-gradient)" : "rgba(244, 63, 94, 0.85)"}
								stroke="rgba(225, 29, 72, 0.9)"
								strokeWidth={1}
							/>
						)}
						{geom.canals.map((c) => (
							<path
								key={`canal-${c.id}`}
								d={c.path}
								fill="none"
								stroke={a.guttaPercha ? "#f43f5e" : "#fb7185"}
								strokeWidth={2.2}
								strokeLinecap="round"
							/>
						))}
					</g>
				)}

				{/* 5. Патологии: кариес молочного зуба */}
				{a.caries && !a.zirconiaCrown && !a.missing && (
					<g data-testid="pediatric-caries">
						{(() => {
							const surfs = geom.surfaces;
							const cType = a.cariesType;
							const paths: string[] = [];
							if (cType === "class2_mo") {
								if (surfs.O) paths.push(surfs.O);
								if (surfs.M) paths.push(surfs.M);
							} else if (cType === "class2_do") {
								if (surfs.O) paths.push(surfs.O);
								if (surfs.D) paths.push(surfs.D);
							} else if (cType === "class2_mod") {
								if (surfs.O) paths.push(surfs.O);
								if (surfs.M) paths.push(surfs.M);
								if (surfs.D) paths.push(surfs.D);
							} else if (cType === "class5") {
								if (surfs.C) paths.push(surfs.C);
								else if (surfs.V) paths.push(surfs.V);
							} else {
								if (surfs.O) paths.push(surfs.O);
							}
							return paths.map((p, idx) => (
								<path
									key={`pediatric-caries-surf-${idx}`}
									d={p}
									fill="rgba(180, 83, 9, 0.85)"
									stroke="rgba(120, 53, 15, 0.9)"
									strokeWidth={1.2}
								/>
							));
						})()}
					</g>
				)}

				{/* 6. Реставрация: композитная пломба молочного зуба */}
				{a.composite && !a.zirconiaCrown && !a.missing && (
					<g data-testid="pediatric-composite">
						{(() => {
							const surfs = geom.surfaces;
							const paths: string[] = [];
							if (surfs.O) paths.push(surfs.O);
							return paths.map((p, idx) => (
								<path
									key={`pediatric-comp-surf-${idx}`}
									d={p}
									fill="url(#dente-composite-gradient)"
									stroke="rgba(148, 163, 184, 0.8)"
									strokeWidth={1.2}
								/>
							));
						})()}
					</g>
				)}

				{/* 7. Удаленный молочный зуб / физиологическая смена */}
				{a.missing && (
					<g data-testid="pediatric-missing" opacity={0.35}>
						<path
							d={geom.crown}
							fill="none"
							stroke={stroke}
							strokeWidth={1.2}
							strokeDasharray="3,3"
						/>
						{geom.root && (
							<path
								d={geom.root}
								fill="none"
								stroke={stroke}
								strokeWidth={1.2}
								strokeDasharray="3,3"
							/>
						)}
						<line x1={20} y1={20} x2={80} y2={140} stroke="#ef4444" strokeWidth={2.5} />
						<line x1={80} y1={20} x2={20} y2={140} stroke="#ef4444" strokeWidth={2.5} />
					</g>
				)}
			</g>

			{/* Статусный бейдж с номером зуба FDI */}
			{a.showBadge !== false && (
				<ToothStatusBadge
					presetId={presetId}
					layers={a}
					r={r}
					cy={cy}
					toothNumber={num}
				/>
			)}
		</svg>
	);
};

export const PediatricUpperIncisorContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 51} />;

export const PediatricUpperCanineContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 53} />;

export const PediatricUpperMolarContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 54} />;

export const PediatricLowerIncisorContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 71} />;

export const PediatricLowerCanineContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 73} />;

export const PediatricLowerMolarContainer: React.FC<
	Tooth46ContainerProps & { toothNumber?: number; isFlipped?: boolean }
> = (props) => <PediatricToothContainer {...props} toothNumber={props.toothNumber ?? 74} />;
