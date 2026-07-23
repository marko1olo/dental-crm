import getContourHolesDataWorld from './getContourHolesDataWorld';
export default function getContourHolesDataCanvas(annotation, viewport) {
    const worldHoleContours = getContourHolesDataWorld(annotation);
    const canvasHoleContours = [];
    worldHoleContours.forEach((worldHoleContour) => {
        const numPoints = worldHoleContour.length;
        const canvasHoleContour = new Array(numPoints);
        for (let i = 0; i < numPoints; i++) {
            canvasHoleContour[i] = viewport.worldToCanvas(worldHoleContour[i]);
        }
        canvasHoleContours.push(canvasHoleContour);
    });
    return canvasHoleContours;
}
