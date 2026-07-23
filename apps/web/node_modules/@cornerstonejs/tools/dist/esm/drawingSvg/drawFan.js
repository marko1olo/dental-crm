import _getHash from './_getHash';
import setAttributesIfNecessary from './setAttributesIfNecessary';
import setNewAttributesIfValid from './setNewAttributesIfValid';
function drawFan(svgDrawingHelper, annotationUID, fanUID, center, innerRadius, outerRadius, startAngle, endAngle, options = {}, dataId = '', zIndex) {
    const { color, fill, width, lineWidth, lineDash, fillOpacity, strokeOpacity, } = Object.assign({
        color: 'rgb(0, 255, 0)',
        fill: 'transparent',
        width: '2',
        lineDash: undefined,
        lineWidth: undefined,
        strokeOpacity: 1,
        fillOpacity: 1,
    }, options);
    const strokeWidth = lineWidth || width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = _getHash(annotationUID, 'fan', fanUID);
    const existingFanElement = svgDrawingHelper.getSvgNode(svgNodeHash);
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const centerX = center[0];
    const centerY = center[1];
    const outerStartX = centerX + outerRadius * Math.cos(startRad);
    const outerStartY = centerY + outerRadius * Math.sin(startRad);
    const outerEndX = centerX + outerRadius * Math.cos(endRad);
    const outerEndY = centerY + outerRadius * Math.sin(endRad);
    const innerStartX = centerX + innerRadius * Math.cos(startRad);
    const innerStartY = centerY + innerRadius * Math.sin(startRad);
    const innerEndX = centerX + innerRadius * Math.cos(endRad);
    const innerEndY = centerY + innerRadius * Math.sin(endRad);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    let pathData = `M ${outerStartX} ${outerStartY}`;
    pathData += ` A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}`;
    pathData += ` L ${innerEndX} ${innerEndY}`;
    pathData += ` A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`;
    pathData += ` Z`;
    const attributes = {
        d: pathData,
        stroke: color,
        fill,
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
        'fill-opacity': fillOpacity,
        'stroke-opacity': strokeOpacity,
        'mix-blend-mode': 'normal',
    };
    if (existingFanElement) {
        setAttributesIfNecessary(attributes, existingFanElement);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newFanElement = document.createElementNS(svgns, 'path');
        if (dataId !== '') {
            newFanElement.setAttribute('data-id', dataId);
        }
        if (zIndex !== undefined) {
            newFanElement.style.zIndex = zIndex.toString();
        }
        setNewAttributesIfValid(attributes, newFanElement);
        svgDrawingHelper.appendNode(newFanElement, svgNodeHash);
    }
}
export default drawFan;
