import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import Sidebar from './components/Sidebar.jsx';
import LibraryInfoBox from './components/LibraryInfoBox.jsx';

const INITIAL_VIEW = {
  center: [-71.11647, 42.37432],
  zoom: 16.8,
  bearing: 135,
  pitch: 60
};

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [selectedLibrary, setSelectedLibrary] = useState(null);

  const handleLibraryClick = useCallback((library, lat, lng) => {
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 18,
        pitch: 60,
        bearing: 135,
        duration: 1000
      });
      setSelectedLibrary(library);
    }
  }, []);

  const resetMapView = useCallback(() => {
    if (map.current) {
      map.current.flyTo({
        ...INITIAL_VIEW,
        duration: 1000
      });
    }
  }, []);

  const handleCloseInfoBox = useCallback(() => {
    setSelectedLibrary(null);
    resetMapView();
  }, [resetMapView]);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          lightPreset: "dusk",
          // showPointOfInterestLabels: false,
        }
      },
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      bearing: INITIAL_VIEW.bearing,
      pitch: INITIAL_VIEW.pitch,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }));



    map.current.on('load', () => {
      // Create the Tile3DLayer for the ESRI 3D buildings
      map.current.setFilter('poi-label', ['=', 'category_en', 'Library']) 

      // // add a geojson source with a polygon to be used in the clip layer.
      // map.current.addSource('eraser', {
      //   type: 'geojson',
      //   data: {
      //     type: 'FeatureCollection',
      //     features: [
      //       {
      //         type: 'Feature',
      //         properties: {},
      //         geometry: {
      //           coordinates: [
      //             [
      //               [-0.12573, 51.53222],
      //               [-0.12458, 51.53219],
      //               [-0.12358, 51.53492],
      //               [-0.12701, 51.53391],
      //               [-0.12573, 51.53222]
      //             ]
      //           ],
      //           type: 'Polygon'
      //         }
      //       }
      //     ]
      //   }
      // });

      // // add a geojson source which specifies the custom model to be used by the model layer.
      // map.current.addSource('model', {
      //   type: 'geojson',
      //   data: {
      //     type: 'Feature',
      //     properties: {
      //       'model-uri': `${window.location.origin}/model-fixed.glb`
      //     },
      //     geometry: {
      //       coordinates: [-71.11942814672554,
      //     42.37209913119082],
      //       type: 'Point'
      //     }
      //   }
      // });

      //   map.current.addSource('center', {
      //   type: 'geojson',
      //   data: {
      //     type: 'Feature',
      //     geometry: {
      //       coordinates: [-71.12075, 42.3706],
      //       type: 'Point'
      //     }
      //   }
      // });

      // // add the clip layer and configure it to also remove symbols and trees.
      // // `clip-layer-scope` layout property is used to specify that only models from the Mapbox Standard Style should be clipped.
      // // this will prevent the newly added model from getting clipped.
      // map.current.addLayer({
      //   id: 'eraser',
      //   type: 'clip',
      //   source: 'eraser',
      //   layout: {
      //     // specify the layer types to be removed by this clip layer
      //     'clip-layer-types': ['symbol'],
      //     'clip-layer-scope': ['basemap']
      //   }
      // });


      // // add the model layer and specify the appropriate `slot` to ensure the symbols are rendered correctly.
      // map.current.addLayer({
      //   id: 'tower',
      //   type: 'model',
      //   slot: 'middle',
      //   source: 'model',
      //   minzoom: 15,
      //   layout: {
      //     'model-id': ['get', 'model-uri']
      //   },
      //   paint: {
      //     'model-opacity': 1,
      //     'model-color': '#ffff00',
      //     'model-color-mix-intensity': 0.5,
      //     'model-rotation': [0.0, 0.0, 0.0],
      //     'model-translation': [0, 0, 15],
      //     'model-scale': [0.3, 0.3, 0.3],
      //     'model-cast-shadows': true,
      //     'model-emissive-strength': 0.8

      //   }
      // });



    });



    return () => map.current.remove();
  }, []);

  return (
    <div className="container">
      <Sidebar onLibraryClick={handleLibraryClick} />
      <div
        ref={mapContainer}
        className="map-container"
      >
        <LibraryInfoBox
          library={selectedLibrary}
          onClose={handleCloseInfoBox}
        />
      </div>
    </div>
  );
}