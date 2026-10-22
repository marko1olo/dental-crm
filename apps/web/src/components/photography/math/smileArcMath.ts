import { Point2D, signedDistanceToLine } from './vectorGeometry';

export interface SmileArcResult {
	curvatureType: 'consonant' | 'flat' | 'reverse';
	symmetryScore: number;
	curvatureDepthPx: number;
	descriptionRu: string;
}

export function calculateSmileLineCurvature(
	commissureLeft: Point2D,
	commissureRight: Point2D,
	incisalEdges: Point2D[]
): SmileArcResult {
	if (!incisalEdges || incisalEdges.length === 0) {
		return { curvatureType: 'flat', symmetryScore: 100, curvatureDepthPx: 0, descriptionRu: 'Нет данных о режущих краях' };
	}

	let sumSignedDist = 0;
	let leftDepth = 0;
	let rightDepth = 0;
	let countLeft = 0;
	let countRight = 0;
	const midX = (commissureLeft.x + commissureRight.x) / 2;

	for (const edge of incisalEdges) {
		const dist = signedDistanceToLine(edge, commissureLeft, commissureRight);
		sumSignedDist += dist;
		if (edge.x < midX - 2) {
			leftDepth += Math.abs(dist);
			countLeft++;
		} else if (edge.x > midX + 2) {
			rightDepth += Math.abs(dist);
			countRight++;
		}
	}

	const avgSignedDist = sumSignedDist / incisalEdges.length;
	const avgLeft = countLeft > 0 ? leftDepth / countLeft : Math.abs(avgSignedDist);
	const avgRight = countRight > 0 ? rightDepth / countRight : Math.abs(avgSignedDist);

	const maxDepth = Math.max(avgLeft, avgRight, 1);
	const diff = Math.abs(avgLeft - avgRight);
	const symmetryScore = Math.max(0, Math.min(100, Math.round((1 - diff / maxDepth) * 100)));

	let curvatureType: 'consonant' | 'flat' | 'reverse' = 'consonant';
	let descriptionRu = 'Консонантная (гармоничная) дуга улыбки повторяет изгиб нижней губы';

	if (Math.abs(avgSignedDist) < 3) {
		curvatureType = 'flat';
		descriptionRu = 'Прямая (уплощенная) линия улыбки — снижение резцового перекрытия';
	} else if (avgSignedDist > 3) {
		curvatureType = 'reverse';
		descriptionRu = 'Обратная (инвертированная) линия улыбки — режущие края выше уголков рта';
	}

	return { curvatureType, symmetryScore, curvatureDepthPx: avgSignedDist, descriptionRu };
}
