export { build3dLayer }

function build3dLayer(url, reference, FeatureLayer, GraphicsLayer, Graphic) {

    const graphicsLayer = new GraphicsLayer({
        title: "3D Objects"
    });

    const objectLayer = new FeatureLayer({
        url: url
    });

    objectLayer.queryFeatures({
        where: "1=1",
        returnGeometry: true,
        outFields: ["*"]
    }).then((featureSet) => {
        featureSet.features.forEach(feature => {
            const label = new Graphic({
                geometry: {
                    type: "point",
                    latitude: feature.geometry.latitude,
                    longitude: feature.geometry.longitude,
                    spatialReference: reference
                },
                symbol: {
                    type: "point-3d",
                    symbolLayers: [{
                        type: "object",
                        resource: { href: `assets/3d/${feature.attributes.model}.glb` }
                        }]
                }
            })
            graphicsLayer.add(label)
        });
    });

    return graphicsLayer

}