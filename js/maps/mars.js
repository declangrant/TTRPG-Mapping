import { buildGridLayer } from "../utils/grid.js";
import { build3dLayer } from "../utils/objects.js";

require([
    "esri/config",
    "esri/Map",
    "esri/views/SceneView",
    "esri/layers/ElevationLayer",
    "esri/layers/TileLayer",
    "esri/layers/FeatureLayer",
    "esri/widgets/LayerList",
    "esri/layers/GraphicsLayer",
    "esri/Graphic"
], (
    esriConfig,
    Map,
    SceneView,
    ElevationLayer,
    TileLayer,
    FeatureLayer,
    LayerList,
    GraphicsLayer,
    Graphic
) => {

    esriConfig.apiKey = "AAPK1654767a9532465d97c2804bd9de6687SIO0Fqa0d2uvd79grN6p8QD86FbOv-b697Nc86GG73YOIMqs5RdOxa0F6os_DTep"

    // mars spatial reference
    const reference = 104971

    // define terrain
    const marsElevation = new ElevationLayer({
        url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDEM200M/ImageServer",
        copyright: "NASA, ESA, HRSC, Goddard Space Flight Center, USGS Astrogeology Science Center, Esri"
    });

    // define surface texture/imagery
    const marsImagery = new TileLayer({
        url: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM/MapServer",
        title: "Imagery",
        copyright: "USGS Astrogeology Science Center, NASA, JPL, Esri",
        listMode: "hide"
    });

    // create map object
    const map = new Map({
        ground: { layers: [marsElevation] },
        layers: [marsImagery]
    });

    // create viewer (main display)
    const view = new SceneView({
        map: map,
        container: "viewDiv",
        qualityProfile: "high",
        // setting the spatial reference for Mars_2000 coordinate system
        spatialReference: reference,
        camera: {
            position: {
                x: -60, y: 5, z: 1.5e7,     // over in-game features
                spatialReference: reference
            },
        }
    });

    const labelStyle = [{
        labelPlacement: "above-center",
        labelExpressionInfo: { expression: "$feature.name" },
        where: `classification <> 4`,
        symbol: {
            type: "label-3d",
            symbolLayers: [{
                type: "text",
                material: { color: [0, 0, 0, 0.9] },
                halo: { size: 2, color: [255, 255, 255, 0.7] },
                font: { size: 10 }
            }],
            verticalOffset: {
                screenLength: 40,
                maxWorldLength: 500000,
                minWorldLength: 0
            },
            callout: {
                type: "line",
                size: 0.5,
                color: [255, 255, 255, 0.9],
                border: { color: [0, 0, 0, 0.3] }
            }
        }
    }]

    // populate polygon renderer fields
    function createFillSymbol(value, color) {
        return {
            value: value,
            symbol: {
                type: "simple-fill",
                color: color.concat([0.5]),
                style: "diagonal-cross",
                outline: {
                    color: color.concat([1]),
                    width: 2
                }
            }
        };
    }

    // create location layer
    const locationLayer = new FeatureLayer({
        url: "https://services7.arcgis.com/DhtXm9kBXs1EuvvD/arcgis/rest/services/Mars_Locations/FeatureServer",
        title: "Locations",
        renderer: {
            type: "unique-value",
            field: "classification",
            uniqueValueInfos: [
                createFillSymbol(0, [70, 156, 17]),    // city
                createFillSymbol(1, [66, 135, 245]),   // outpost
                createFillSymbol(2, [112, 44, 176]),   // research
                createFillSymbol(3, [214, 77, 56]),    // military
                createFillSymbol(4, [100, 100, 100])   // industry
            ]
        },
        labelingInfo: labelStyle,
        popupEnabled: true,
        popupTemplate: {
            title: "{name}",
            outFields: ["*"],
            returnGeometry: true,
            content: getLocationInfo
        }
    });
    // format popup content
    function getLocationInfo(feature) {
        // create div
        const div = document.createElement("div");
        // display mandatory fields
        div.innerHTML =
            feature.graphic.geometry.extent.center.latitude.toFixed(5)+"°N, "+feature.graphic.geometry.extent.center.longitude.toFixed(5)+"°E | "
            +parseInt(feature.graphic.attributes.Shape__Area/10e6, 10)+" km²<br/>"
            +locationLayer.getField("classification").domain.codedValues[feature.graphic.attributes.classification].name+" "
        // display type
        if (feature.graphic.attributes.owner != null) {
            div.innerHTML += "controlled by "+feature.graphic.attributes.owner
        }
        div.innerHTML += "<br/>"
        // display population
        if (feature.graphic.attributes.population != null) {
            div.innerHTML += "Population: "+feature.graphic.attributes.population.toLocaleString("en-US")+"<br/>"
        }
        // display established date
        if (feature.graphic.attributes.established > 0) {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const date = new Date(feature.graphic.attributes.established);
            div.innerHTML += "Established "+months[date.getMonth()]+" "+date.getFullYear()+"<br/><br/>"
        }
        // display description
        if (feature.graphic.attributes.description != null) {
            div.innerHTML += feature.graphic.attributes.description
        }
        return div;
    }
    map.add(locationLayer);

    // create layer toggle panel
    const layerList = new LayerList({view});
    view.ui.add(layerList, "top-right");

    map.add(buildGridLayer(GraphicsLayer, Graphic, reference));

    map.add(build3dLayer("https://services7.arcgis.com/DhtXm9kBXs1EuvvD/arcgis/rest/services/Mars_Surface_Objects/FeatureServer", reference, FeatureLayer, GraphicsLayer, Graphic));

});