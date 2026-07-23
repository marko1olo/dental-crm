export default function getSignedArea(polyline) {
    if (polyline.length < 3) {
        return 0;
    }
    const refPoint = polyline[0];
    let area = 0;
    for (let i = 0, len = polyline.length; i < len; i++) {
        const p1 = polyline[i];
        const p2Index = i === len - 1 ? 0 : i + 1;
        const p2 = polyline[p2Index];
        const aX = p1[0] - refPoint[0];
        const aY = p1[1] - refPoint[1];
        const bX = p2[0] - refPoint[0];
        const bY = p2[1] - refPoint[1];
        area += aX * bY - aY * bX;
    }
    area *= 0.5;
    return area;
}
