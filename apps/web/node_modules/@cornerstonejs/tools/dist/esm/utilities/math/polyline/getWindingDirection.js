import getSignedArea from './getSignedArea';
export default function getWindingDirection(polyline) {
    const signedArea = getSignedArea(polyline);
    return signedArea >= 0 ? 1 : -1;
}
