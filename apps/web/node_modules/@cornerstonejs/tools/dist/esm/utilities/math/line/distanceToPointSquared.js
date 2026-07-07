import distanceToPointSquaredInfo from './distanceToPointSquaredInfo';
export default function distanceToPointSquared(lineStart, lineEnd, point) {
    return distanceToPointSquaredInfo(lineStart, lineEnd, point).distanceSquared;
}
