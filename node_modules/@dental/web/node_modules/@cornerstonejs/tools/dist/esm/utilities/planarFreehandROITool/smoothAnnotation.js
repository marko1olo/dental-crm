import { mat4, vec3 } from 'gl-matrix';
import interpolateSegmentPoints from './interpolation/interpolateSegmentPoints';
function shouldPreventInterpolation(annotation, options) {
    const knotsRatioPercentage = options?.knotsRatioPercentage || 30;
    if (!annotation?.data?.contour?.polyline?.length ||
        knotsRatioPercentage <= 0) {
        return true;
    }
    return false;
}
function rotateMatrix(normal, focal) {
    const mat = mat4.create();
    const eye = vec3.add(vec3.create(), focal, normal);
    const up = Math.abs(normal[0]) > 0.1
        ? vec3.fromValues(-normal[1], normal[0], 0)
        : vec3.fromValues(0, -normal[2], normal[1]);
    mat4.lookAt(mat, focal, eye, up);
    return mat;
}
function rotate(list, count = Math.floor(Math.random() * (list.length - 1))) {
    if (count === 0) {
        return 0;
    }
    const srcList = [...list];
    const { length } = list;
    for (let i = 0; i < length; i++) {
        list[i] = srcList[(i + count + length) % length];
    }
    return count;
}
export default function smoothAnnotation(annotation, options) {
    if (shouldPreventInterpolation(annotation, options)) {
        return false;
    }
    const { viewPlaneNormal } = annotation.metadata;
    const { closed, polyline } = annotation.data.contour;
    const rotateMat = rotateMatrix(viewPlaneNormal, annotation.data.contour.polyline[0]);
    const canvasPoints = annotation.data.contour.polyline.map((p) => {
        const planeP = vec3.transformMat4(vec3.create(), p, rotateMat);
        return [planeP[0], planeP[1]];
    });
    let rotation = closed ? rotate(canvasPoints) : 0;
    let interpolatedCanvasPoints = (interpolateSegmentPoints(canvasPoints, 0, canvasPoints.length - 1, options?.knotsRatioPercentage || 30));
    if (interpolatedCanvasPoints === canvasPoints) {
        return false;
    }
    rotate(interpolatedCanvasPoints, -rotation);
    for (let i = 1; i < options?.loop; i++) {
        rotation = closed ? rotate(interpolatedCanvasPoints) : 0;
        interpolatedCanvasPoints = (interpolateSegmentPoints(interpolatedCanvasPoints, 0, interpolatedCanvasPoints.length - 1, options?.knotsRatioPercentage || 30));
        rotate(interpolatedCanvasPoints, -rotation);
    }
    const unRotate = mat4.invert(mat4.create(), rotateMat);
    annotation.data.contour.polyline = (interpolatedCanvasPoints.map((p) => vec3.transformMat4([0, 0, 0], [...p, 0], unRotate)));
    return true;
}
