function addImageSlicesToViewports(renderingEngine, stackInputs, viewportIds) {
    for (const viewportId of viewportIds) {
        const viewport = renderingEngine.getViewport(viewportId);
        if (!viewport) {
            throw new Error(`Viewport with Id ${viewportId} does not exist`);
        }
        if (!viewport.addImages) {
            console.warn(`Viewport with Id ${viewportId} does not have addImages. Cannot add image segmentation to this viewport.`);
            return;
        }
    }
    viewportIds.forEach((viewportId) => {
        const viewport = renderingEngine.getViewport(viewportId);
        viewport.addImages(stackInputs);
    });
}
export default addImageSlicesToViewports;
