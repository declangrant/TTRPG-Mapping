export { buildGridLayer }

/**
 * Builds a GraphicsLayer with latitude and longitude lines.
 * 
 * @param {Object} GraphicsLayer esri/layers/GraphicsLayer definition, to deal with import errors.
 * @param {Object} Graphic esri/Graphic definition, to deal with import errors.
 * @param {int}    reference spatial reference of the planet
 * @returns {GraphicsLayer} 'Coordinate System' layer.
 */
function buildGridLayer(GraphicsLayer, Graphic, reference) {

    const graphicsLayer = new GraphicsLayer({
        title: "Coordinate System"
    });

    const lineSymbol = {
        type: "simple-line",
        color: [0, 0, 0],
        width: 1
    };

    // longitude lines
    for (let x=-180; x<180; x+=20) {
        let line = []
        for (let y=-90; y<=90; y+=5) {
            line.push([x, y])
        }
        const polyline = new Graphic({
            geometry: {
                type: "polyline",
                paths: line,
                spatialReference: reference
            },
            symbol: lineSymbol
        });
        graphicsLayer.add(polyline);
    }

    // latitude lines
    for (let y=-80; y<=80; y+=10) {
        let line = []
        for (let x=-180; x<190; x+=10) {
            line.push([x, y])
        }
        const polyline = new Graphic({
            geometry: {
                type: "polyline",
                paths: line,
                spatialReference: reference
            },
            symbol: lineSymbol
        });
        graphicsLayer.add(polyline);
    }

    // longitude labels at equator
    for (let x=-160; x<=180; x+=20) {
        const label = new Graphic({
            geometry: {
                type: "point",
                latitude: 0,
                longitude: x,
                spatialReference: reference
            },
            symbol: {
                type: "text",
                text: x+"°",
                font: { size: 11 },
                haloColor: [ 180, 180, 180, 0.6 ],
                haloSize: 1.5
            }
        })
        graphicsLayer.add(label)
    }
    
    // latitude labels
    for (let y=-80; y<=80; y+=10) {
        if (y==0) continue
        for (let x=-120; x<=120; x+=120) {
            const label = new Graphic({
                geometry: {
                    type: "point",
                    latitude: y,
                    longitude: x,
                    spatialReference: reference
                },
                symbol: {
                    type: "text",
                    text: y+"°",
                    font: { size: 11 },
                    haloColor: [ 180, 180, 180, 0.6 ],
                    haloSize: 1.5
                }
            })
            graphicsLayer.add(label)
        }
    }

    return graphicsLayer

}