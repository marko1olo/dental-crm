import getSignedArea from './getSignedArea';
export default function getNormal2(polyline) {
    const area = getSignedArea(polyline);
    return [0, 0, area / Math.abs(area)];
}
