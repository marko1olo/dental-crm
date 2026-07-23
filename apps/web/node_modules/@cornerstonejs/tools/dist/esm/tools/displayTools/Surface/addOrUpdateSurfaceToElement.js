import { utilities } from '@cornerstonejs/core';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import { getSurfaceActorEntry, getSurfaceRepresentationUID, } from '../../../stateManagement/segmentation/helpers/getSegmentationActor';
function addOrUpdateSurfaceToElement(viewport, surface, segmentationId) {
    const surfaceActorEntry = getSurfaceActorEntry(viewport.id, segmentationId, surface.segmentIndex);
    const surfaceActor = surfaceActorEntry?.actor;
    const isVisible = surface.visible;
    if (surfaceActor) {
        surfaceActor.setVisibility(isVisible);
        if (!isVisible) {
            return;
        }
        const surfaceMapper = surfaceActor.getMapper();
        const currentPolyData = surfaceMapper.getInputData();
        const newPoints = surface.points;
        const newPolys = surface.polys;
        const currentPoints = currentPolyData.getPoints().getData();
        const currentPolys = currentPolyData.getPolys().getData();
        if (newPoints.length === currentPoints.length &&
            newPolys.length === currentPolys.length) {
            return;
        }
        const polyData = vtkPolyData.newInstance();
        polyData.getPoints().setData(newPoints, 3);
        const triangles = vtkCellArray.newInstance({
            values: Float32Array.from(newPolys),
        });
        polyData.setPolys(triangles);
        surfaceMapper.setInputData(polyData);
        surfaceMapper.modified();
        viewport.getRenderer().resetCameraClippingRange();
        return;
    }
    const points = surface.points;
    const polys = surface.polys;
    const color = surface.color;
    const surfacePolyData = vtkPolyData.newInstance();
    surfacePolyData.getPoints().setData(points, 3);
    const triangles = vtkCellArray.newInstance({
        values: Float32Array.from(polys),
    });
    surfacePolyData.setPolys(triangles);
    const mapper = vtkMapper.newInstance({});
    let clippingFilter;
    mapper.setInputData(surfacePolyData);
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(color[0] / 255, color[1] / 255, color[2] / 255);
    actor.getProperty().setLineWidth(2);
    const representationUID = getSurfaceRepresentationUID(segmentationId, surface.segmentIndex);
    viewport.addActor({
        uid: utilities.uuidv4(),
        actor: actor,
        clippingFilter,
        representationUID,
    });
    viewport.resetCamera();
    viewport.getRenderer().resetCameraClippingRange();
    viewport.render();
}
export default addOrUpdateSurfaceToElement;
