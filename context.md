# Using deck.gl with React

While not directly based on React, deck.gl is designed from ground up to work with [React](https://facebook.github.io/react/) based applications. deck.gl layers fit naturally into React's component render flow and flux/redux based applications. deck.gl layers will be performantly rerendered whenever you rerender your normal JSX or React components.


## The DeckGL React Component

To use deck.gl with React, simply import the `DeckGL` React component and render it as a child of another component, passing in your list of deck.gl layers as a property.

```tsx
import React from 'react';
import {DeckGL} from '@deck.gl/react';
import {MapViewState} from '@deck.gl/core';
import {LineLayer} from '@deck.gl/layers';

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13
};

type DataType = {
  from: [longitude: number, latitude: number];
  to: [longitude: number, latitude: number];
};

function App() {
  const layers = [
    new LineLayer<DataType>({
      id: 'line-layer',
      data: '/path/to/data.json',
      getSourcePosition: (d: DataType) => d.from,
      getTargetPosition: (d: DataType) => d.to,
    })
  ];

  return <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller
      layers={layers} />;
}

```

## Adding a Base Map

The vis.gl community maintains two React libraries that seamlessly work with deck.gl.

- `react-map-gl` - a React wrapper for [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides) and [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/). Several integration options are discussed in [using with Mapbox](../developer-guide/base-maps/using-with-mapbox.md).
- `@vis.gl/react-google-maps` - a React wrapper for [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript). See [using with Google Maps](../developer-guide/base-maps/using-with-google-maps.md).

## Using JSX Layers, Views, and Widgets

It is possible to use JSX syntax to create deck.gl layers, views, and widgets as React children of the `DeckGL` React components, instead of providing them as ES6 class instances to the `layers`, `views`, or `widgets` prop, respectively. There are no performance advantages to this syntax but it can allow for a more consistent, React-like coding style.

```jsx
import React from 'react';
import {DeckGL} from '@deck.gl/react';
import {MapViewState} from '@deck.gl/core';
import {LineLayer} from '@deck.gl/layers';
import {ZoomWidget} from '@deck.gl/react';
import {Map} from 'react-map-gl/mapbox';

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13
};

function App() {
  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller
    >
      <LineLayer
        id="line-layer"
        data="/path/to/data.json"
        getSourcePosition={d => d.from}
        getTargetPosition={d => d.to} />

      <MapView id="map" width="50%" controller >
        <Map mapStyle="mapbox://styles/mapbox/light-v9" />
      </MapView>

      <FirstPersonView width="50%" x="50%" fovy={50} />

      <ZoomWidget/>
    </DeckGL>
  );
}
```

For more information on this syntax and its limitations, see [DeckGL API](../api-reference/react/deckgl.md).


## Performance Remarks

- Comparing to the `Deck` class in vanilla JavaScript, the `DeckGL` React component is a thin wrapper and in itself does not add any significant performance overhead. However, applications should be mindful that callbacks such as `onHover`, `onViewStateChange` etc. could potentially be invoked on every animation frame, and updating app states within these callbacks will trigger React to rerender (at least part of) the component tree. Therefore, apps should be diligent in following React best practices in general, such as avoiding expensive recalculation with `useMemo` hooks.

- When the component containing `DeckGL` indeed needs to rerender, there is no performance concern in recreating the deck.gl layer instances, even if their props are not changed. When deck.gl receives new layer instances, it compares them with the existing layers, and only updates GPU resources when needed, just like React does for DOM components. Learn more about how it works in this [FAQ](../developer-guide/using-layers.md#should-i-be-creating-new-layers-on-every-render).


## Using deck.gl with SSR

Frameworks such as `Next.js` and `Gatsby` leverage Server Side Rendering to improve page loading performance. As of v9.0, deck.gl is fully [ES module](https://nodejs.org/api/packages.html) compliant with support for both ESM-style `import` and CommonJS-style `require()`. Depending on your project settings and the server-side bundler, everything likely would just work.

For some projects, SSR may fail with an error message `Error: require() of ES Module 'xxx'`. This is because some of deck.gl's upstream dependencies, such as `d3`, have opted to become ESM-only and no longer support `require()`. Possible mitigations are:

- Add `type: "module"` to the project's package.json. This will require other CommonJS-style scripts in the project be updated, as detailed in [Node.js documentation](https://nodejs.org/api/esm.html#enabling). Or,
- Isolate the deck.gl imports and exclude them from SSR. Since deck.gl renders into a WebGL2/WebGPU context, it wouldn't benefit from SSR to begin with. Below is a minimal sample for `Next.js`:

```jsx title="/src/components/map.js"
import {DeckGL} from '@deck.gl/react';
import {TextLayer} from '@deck.gl/layers';

export default function Map() {
  const layers = [
    new TextLayer({...})
  ];

  return <DeckGL layers={layers} />
}
```

```jsx title="/src/pages/app.js"
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('../components/map'), {ssr: false});

export default function App() {
  return <Map />;
}
```

More examples are discussed in [this issue](https://github.com/visgl/deck.gl/issues/7735).

# Tile3DLayer

The `Tile3DLayer` renders 3d tiles data formatted according to the [3D Tiles Specification](https://www.opengeospatial.org/standards/3DTiles) and [ESRI I3S](https://github.com/Esri/i3s-spec), supported by the [Tiles3DLoader](https://loaders.gl/modules/3d-tiles/docs/api-reference/tiles-3d-loader).

Tile3DLayer is a [CompositeLayer](../core/composite-layer.md). Base on each tile type, it uses a [PointCloudLayer](../layers/point-cloud-layer.md), a [ScenegraphLayer](../mesh-layers/scenegraph-layer.md) or [SimpleMeshLayer](../mesh-layers/simple-mesh-layer.md) to render the geometries.

References
- [3D Tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification)
- [ESRI I3S](https://github.com/Esri/i3s-spec)

## Example

### Load 3D Tiles from Cesium ION


import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="language">
  <TabItem value="js" label="JavaScript">

```js
import {Deck} from '@deck.gl/core';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';

const layer = new Tile3DLayer({
  id: 'tile-3d-layer',
  // Tileset json file url
  data: 'https://assets.cesium.com/43978/tileset.json',
  loader: CesiumIonLoader,
  loadOptions: {
    // Set up Ion account: https://cesium.com/docs/tutorials/getting-started/#your-first-app
    'cesium-ion': {accessToken: '<ion_access_token_for_your_asset>'}
  },
  onTilesetLoad: tileset => {
    // Recenter to cover the tileset
    const {cartographicCenter, zoom} = tileset;
    deckInstance.setProps({
      initialViewState: {
        longitude: cartographicCenter[0],
        latitude: cartographicCenter[1],
        zoom
      }
    });
  },
  pointSize: 2
});

const deckInstance = new Deck({
  initialViewState: {
    longitude: 10,
    latitude: 50,
    zoom: 2
  },
  controller: true,
  layers: [layer]
});
```

  </TabItem>
  <TabItem value="ts" label="TypeScript">

```ts
import {Deck} from '@deck.gl/core';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import type {Tileset3D} from '@loaders.gl/tiles';

const layer = new Tile3DLayer({
  id: 'tile-3d-layer',
  // Tileset json file url
  data: 'https://assets.cesium.com/43978/tileset.json',
  loader: CesiumIonLoader,
  loadOptions: {
    // Set up Ion account: https://cesium.com/docs/tutorials/getting-started/#your-first-app
    'cesium-ion': {accessToken: '<ion_access_token_for_your_asset>'}
  },
  onTilesetLoad: (tileset: Tileset3D) => {
    // Recenter to cover the tileset
    const {cartographicCenter, zoom} = tileset;
    deckInstance.setProps({
      initialViewState: {
        longitude: cartographicCenter[0],
        latitude: cartographicCenter[1],
        zoom
      }
    });
  },
  pointSize: 2
});

const deckInstance = new Deck({
  initialViewState: {
    longitude: 10,
    latitude: 50,
    zoom: 2
  },
  controller: true,
  layers: [layer]
});
```

  </TabItem>
  <TabItem value="react" label="React">

```tsx
import React, {useState} from 'react';
import {DeckGL} from '@deck.gl/react';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import type {MapViewState} from '@deck.gl/core';
import type {Tileset3D} from '@loaders.gl/tiles';

function App() {
  const [initialViewState, setInitialViewState] = useState<MapViewState>({
    longitude: 10,
    latitude: 50,
    zoom: 2
  });

  const layer = new Tile3DLayer({
    id: 'tile-3d-layer',
    // Tileset json file url
    data: 'https://assets.cesium.com/43978/tileset.json',
    loader: CesiumIonLoader,
    loadOptions: {
      // Set up Ion account: https://cesium.com/docs/tutorials/getting-started/#your-first-app
      'cesium-ion': {accessToken: '<ion_access_token_for_your_asset>'}
    },
    onTilesetLoad: (tileset: Tileset3D) => {
      // Recenter to cover the tileset
      const {cartographicCenter, zoom} = tileset;
      setInitialViewState({
        longitude: cartographicCenter[0],
        latitude: cartographicCenter[1],
        zoom
      });
    },
    pointSize: 2
  });

  return <DeckGL
    initialViewState={initialViewState}
    controller
    layers={[layer]}
  />;
}
```

  </TabItem>
</Tabs>


### Load I3S Tiles from ArcGIS

```ts
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {I3SLoader} from '@loaders.gl/i3s';

const layer = new Tile3DLayer({
  id: 'tile-3d-layer',
  // Tileset entry point: Indexed 3D layer file url
  data: 'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_Bldgs/SceneServer/layers/0',
  loader: I3SLoader
});
```

### Load 3D Tiles from Google Maps

```ts
import {Tile3DLayer} from '@deck.gl/geo-layers';

const layer = new Tile3DLayer({
  id: 'tile-3d-layer',
  data: 'https://tile.googleapis.com/v1/3dtiles/root.json',
  loadOptions: {
    // https://developers.google.com/maps/documentation/tile/3d-tiles
    fetch: {headers: {'X-GOOG-API-KEY': '<google_maps_api_key>'}}
  }
});
```


## Installation

To install the dependencies:

```bash
npm install deck.gl
# or
npm install @deck.gl/core @deck.gl/layers @deck.gl/mesh-layers @deck.gl/geo-layers
```

```ts
import {Tile3DLayer} from '@deck.gl/geo-layers';
import type {Tile3DLayerProps} from '@deck.gl/geo-layers';

new Tile3DLayer<TileDataT>(...props: Tile3DLayerProps<TileDataT>[]);
```

To use pre-bundled scripts:

```html
<script src="https://unpkg.com/deck.gl@^9.0.0/dist.min.js"></script>
<!-- or -->
<script src="https://unpkg.com/@deck.gl/core@^9.0.0/dist.min.js"></script>
<script src="https://unpkg.com/@deck.gl/layers@^9.0.0/dist.min.js"></script>
<script src="https://unpkg.com/@deck.gl/mesh-layers@^9.0.0/dist.min.js"></script>
<script src="https://unpkg.com/@deck.gl/geo-layers@^9.0.0/dist.min.js"></script>
```

```js
new deck.Tile3DLayer({});
```

## Properties

Inherits from all [Base Layer](../core/layer.md) and [CompositeLayer](../core/composite-layer.md) properties.

Along with other options as below,

### Render Options

#### `opacity` (number, Optional) {#opacity}

- Default `1.0`

The opacity of the layer. The same as defined in [layer](../core/layer.md).

#### `pointSize` (number, Optional) {#pointsize}

- Default `1.0`

Global radius of all points in pixels.
This value is only applied when [tile format](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#introduction) is `pnts`.

### Data Properties

#### `data` (string) {#data}

- A URL to fetch tiles entry point of `3D Tiles` [Tileset JSON](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#tileset-json) file or `Indexed 3D Scene Layer` file [I3S](https://github.com/Esri/i3s-spec).

#### `loader` (object) {#loader}

Default [`Tiles3DLoader`](https://loaders.gl/modules/3d-tiles/docs/api-reference/tiles-3d-loader)

A loader which is used to decode the fetched tiles. Available options are [`CesiumIonLoader`](https://loaders.gl/docs/modules/3d-tiles/api-reference/cesium-ion-loader), [`Tiles3DLoader`](https://loaders.gl/modules/3d-tiles/docs/api-reference/tiles-3d-loader), [`I3SLoader`](https://loaders.gl/modules/i3s/docs/api-reference/i3s-loader).

#### `loadOptions` (object, Optional) {#loadoptions}

On top of the [default options](../core/layer.md#loadoptions), also support the following keys:

- `cesium-ion`: options for the `CesiumIonLoader`
- `3d-tiles`: options for the `Tiles3DLoader`
- `i3s`: options for the `I3SLoader`.
- `tileset`: Forward parameters to the [`Tileset3D`](https://loaders.gl/modules/tiles/docs/api-reference/tileset-3d#constructor-1) instance after fetching the tileset metadata.

```ts
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
import {Tile3DLayer} from '@deck.gl/geo-layers';

const layer = new Tile3DLayer({
  id: 'tile-3d-layer',
  data: 'https://assets.cesium.com/43978/tileset.json',
  loader: CesiumIonLoader,
  loadOptions: {
    tileset: {
      throttleRequests: false,
    },
    'cesium-ion': {accessToken: '<ion_access_token_for_your_asset>'}
  }
})
```

#### `pickable` (boolean, Optional) {#pickable}

- Default: false

When [`picking`](../../developer-guide/custom-layers/picking.md) is enabled, `info.object` will be a [Tile3DHeader](https://loaders.gl/docs/specifications/category-3d-tiles#tileheader-fields) object.

### Data Accessors

#### `getPointColor` ([Accessor&lt;Color&gt;](../../developer-guide/using-layers.md#accessors), Optional) {#getpointcolor}

- Default `[0, 0, 0, 255]`

The rgba color at the target, in `r, g, b, [a]`. Each component is in the 0-255 range.
This value is only applied when [tile format](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#introduction) is `pnts` and no [color properties](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/TileFormats/PointCloud/README.md#point-colors) are defined in point cloud tile file.

### Callbacks

#### `onTilesetLoad` (Function, optional) {#ontilesetload}
`onTilesetLoad` is a function that is called when Tileset JSON file is loaded. [Tileset](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#tileset-json) object is passed in the callback.

- Default: `onTilesetLoad: (tileset) => {}`

#### `onTileLoad` (Function, optional) {#ontileload}

`onTileLoad` is a function that is called when a tile in the tileset hierarchy is loaded. [Tile3D](https://loaders.gl/modules/3d-tiles/modules/3d-tiles/docs/api-reference/tile-3d) object is passed in the callback.

- Default: `onTileLoad: (tileHeader) => {}`

#### `onTileUnload` (Function, optional) {#ontileunload}

`onTileUnload` is a function that is called when a tile is unloaded. [Tile3D](https://loaders.gl/modules/3d-tiles/modules/3d-tiles/docs/api-reference/tile-3d) object is passed in the callback.

- Default: `onTileUnload: (tileHeader) => {}`

#### `onTileError` (Function, optional) {#ontileerror}

`onTileError` is a function that is called when a tile failed to load.

- Default: `onTileError: (tileHeader, url, message) => {}`
  - `url`: the url of the failed tile.
  - `message`: the error message.

#### `_getMeshColor` (Function, optional) {#_getmeshcolor}
`_getMeshColor` is a function which allows to change color of mesh based on properties of [tileHeader](https://loaders.gl/docs/specifications/category-3d-tiles#tileheader-fields) object.
It recieves `tileHeader` object as argument and return type is array of [r, g, b] values in the 0-255 range.
This value is only applied when tile format is `mesh`.
Can be used only for I3S debugging purposes.

- Default: `_getMeshColor: (tileHeader) => [255, 255, 255]`

## Sub Layers

The Tile3DLayer renders the following sublayers based on tile [format](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#introduction):

* `scenegraph` - a [ScenegraphLayer](../mesh-layers/scenegraph-layer.md) rendering all the tiles with Batched 3D Model format (`b3dm`) or Instanced 3D Model format (`i3dm`).
  - `_lighting` is default to `pbr`.
* `pointcloud` - a [PointCloudLayer](../layers/point-cloud-layer.md) rendering all the tiles with Point Cloud format (`pnts`).
* `mesh` - a [SimpleMeshLayer](../mesh-layers/simple-mesh-layer.md) rendering all the tiles ESRI `MeshPyramids` data.

Follow [CompositeLayer](../core/composite-layer.md#_sublayerprops) and example in this layer doc to see how to override sub layer props.

## Remarks

- The `Tile3DLayer` can be rendered in multiple views. A tile is loaded if it is required by any of the viewports, and shared across all views via a single cache system.

## Source

[modules/geo-layers/src/tile-3d-layer](https://github.com/visgl/deck.gl/tree/master/modules/geo-layers/src/tile-3d-layer)

# Using with Mapbox

| Pure JS | React | Overlaid | Interleaved |
| ----- | ----- | ----- | ----- |
|  ✓ | ✓ | [example](https://github.com/visgl/deck.gl/tree/master/examples/get-started/pure-js/mapbox) | [example](https://deck.gl/gallery/mapbox-overlay) |

![deck.gl interleaved with Mapbox layers](https://raw.github.com/visgl/deck.gl-data/master/images/whats-new/mapbox-layers.jpg)

[Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js) is a popular JavaScript library from [Mapbox](https://mapbox.com) for building web map applications. deck.gl's `MapView` can sync perfectly with the camera of Mapbox, at every zoom level and rotation angle.

## Integration Modes

When using deck.gl and Mapbox, there are three options you can choose from: interleaved, overlaid, and reverse-controlled.

### Interleaved

The [interleaved](../../get-started/using-with-map.md#interleaved) mode renders deck.gl layers into the WebGL2 context created by Mapbox. If you need to mix deck.gl layers with Mapbox layers, e.g. having deck.gl surfaces below text labels, or objects occluding each other correctly in 3D, then you have to use this option.

Interleaving is supported by using [MapboxOverlay](../../api-reference/mapbox/mapbox-overlay.md) with `interleaved: true`. It requires WebGL2 and therefore only works with `mapbox-gl@>2.13`. See [compatibility](../../api-reference/mapbox/overview#interleaved-renderer-compatibility) and [limitations](../../api-reference/mapbox/overview.md#limitations).


### Overlaid

The [overlaid](../../get-started/using-with-map.md#overlaid) mode renders deck.gl in a separate canvas inside the Mapbox's controls container. If your use case does not require interleaving, but you still want to use certain features of mapbox-gl, such as mapbox-gl controls (e.g. `NavigationControl`, `Popup`) or plugins (e.g. [navigation directions](https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-directions/), [mapbox-gl-draw](https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-draw/)), then you should use this option.

This is supported by using [MapboxOverlay](../../api-reference/mapbox/mapbox-overlay.md) with `interleaved: false`.


### Reverse Controlled

The reverse-controlled mode renders deck.gl above the Mapbox container and blocks any interaction to the base map. If your use case does not require interleaving, but you need to implement your own [pointer input handling](../../api-reference/core/controller.md), have multiple maps or a map that does not fill the whole canvas (with Deck's [multi-view feature](../views.md#using-multiple-views)), you need this to allow deck.gl manage the map's size and camera.

You cannot use mapbox-gl controls and plugins with this option. Instead, use the components from `@deck.gl/widgets`.


## Examples

### Example: interleaved or overlaid

Both the interleaved and the overlaid options are supported in by the [@deck.gl/mapbox](../../api-reference/mapbox/overview.md) module. This is recommended approach for developers coming from the Mapbox ecosystem, as it can easily switch between interleaved and overlaid rendering, as well as being compatible with other Mapbox controls and plugins.


import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="language">
  <TabItem value="ts" label="TypeScript">

```ts
import {MapboxOverlay} from '@deck.gl/mapbox';
import {ScatterplotLayer} from '@deck.gl/layers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  accessToken: '<mapbox_access_token>',
  center: [0.45, 51.47],
  zoom: 11
});

map.once('load', () => {
  const deckOverlay = new MapboxOverlay({
    interleaved: true,
    layers: [
      new ScatterplotLayer({
        id: 'deckgl-circle',
        data: [
          {position: [0.45, 51.47]}
        ],
        getPosition: d => d.position,
        getFillColor: [255, 0, 0, 100],
        getRadius: 1000,
        beforeId: 'waterway-label' // In interleaved mode render the layer under map labels
      })
    ]
  });

  map.addControl(deckOverlay);
});
```

  </TabItem>
  <TabItem value="react" label="React">

```tsx
import React from 'react';
import {Map, useControl} from 'react-map-gl/mapbox';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {DeckProps} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

function DeckGLOverlay(props: DeckProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

function App() {
  const layers: [
    new ScatterplotLayer({
      id: 'deckgl-circle',
      data: [
        {position: [0.45, 51.47]}
      ],
      getPosition: d => d.position,
      getFillColor: [255, 0, 0, 100],
      getRadius: 1000,
      beforeId: 'waterway-label' // In interleaved mode render the layer under map labels
    })
  ];

  return (
    <Map
      initialViewState={{
        longitude: 0.45,
        latitude: 51.47,
        zoom: 11
      }}
      mapStyle="mapbox://styles/mapbox/light-v9"
      mapboxAccessToken="<mapbox_access_token>"
    >
      <DeckGLOverlay layers={layers} interleaved />
    </Map>
  );
}
```

  </TabItem>
</Tabs>


You can find full project setups in the [react get-started example](https://github.com/visgl/deck.gl/tree/master/examples/get-started/react/mapbox/) and [pure js get-started example](https://github.com/visgl/deck.gl/tree/master/examples/get-started/pure-js/mapbox/).


### Example: reverse controlled

The reverse-controlled option is supported by the pre-built scripting bundle, and in React when used with the `react-map-gl` library. There is currently no easy way to do it under Vanilla JS.

<Tabs groupId="language">
  <TabItem value="scripting" label="Scripting">

```js
<script src="https://unpkg.com/deck.gl@^9.0.0/dist.min.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css" rel="stylesheet" />
<script type="text/javascript">
  const {DeckGL, ScatterplotLayer} = deck;

  mapboxgl.accessToken = '<mapbox_access_token>';

  new DeckGL({
    mapStyle: 'mapbox://styles/mapbox/light-v9',
    initialViewState: {
      longitude: 0.45,
      latitude: 51.47,
      zoom: 11
    },
    controller: true,
    layers: [
      new ScatterplotLayer({
        id: 'deckgl-circle',
        data: [
          {position: [0.45, 51.47]}
        ],
        getPosition: d => d.position,
        getFillColor: [255, 0, 0, 100],
        getRadius: 1000
      })
    ]
  });
</script>
```

  </TabItem>

  <TabItem value="react" label="React">

```tsx
import React from 'react';
import {Map} from 'react-map-gl/mapbox';
import {DeckGL} from '@deck.gl/react';
import {ScatterplotLayer} from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

function App() {
  const layers: [
    new ScatterplotLayer({
      id: 'deckgl-circle',
      data: [
        {position: [0.45, 51.47]}
      ],
      getPosition: d => d.position,
      getFillColor: [255, 0, 0, 100],
      getRadius: 1000,
    })
  ];

  return (
    <DeckGL
      initialViewState={{
        longitude: 0.45,
        latitude: 51.47,
        zoom: 11
      }}
      controller
      layers={layers}
    >
      <Map
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken="<mapbox_access_token>"
      />
    </DeckGL>
  );
}
```

  </TabItem>
</Tabs>


## Additional Information

### react-map-gl

[react-map-gl](https://github.com/visgl/react-map-gl) is a React wrapper around mapbox-gl maintained by the vis.gl community. If you'd like to use deck.gl together with mapbox-gl and React, this library is the recommended companion.

All the [examples on this website](https://github.com/visgl/deck.gl/tree/master/examples/website) are implemented using the React integration.

When you choose the interleaved or overlaid option, the react-map-gl [Map](https://visgl.github.io/react-map-gl/docs/api-reference/map) React component acts as the root component, and [MapboxOverlay](../../api-reference/mapbox/mapbox-overlay#example) is used with react-map-gl's `useControl` hook. 

When you choose the reverse-controlled option, the `DeckGL` React component acts as the root component, and the react-map-gl [Map](https://visgl.github.io/react-map-gl/docs/api-reference/map) is a child. In this case, `Map` will automatically interpret the deck.gl view state (i.e. latitude, longitude, zoom etc), so that deck.gl layers will render as a synchronized geospatial overlay over the underlying map.


### Mapbox Token

To use Mapbox, you will need to register on their website in order to retrieve an [access token](https://docs.mapbox.com/help/how-mapbox-works/access-tokens/) required by the map component, which will be used to identify you and start serving up map tiles. The service will be free until a [certain level](https://www.mapbox.com/pricing/) of traffic is exceeded.

If you are using mapbox-gl without React, check out [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/#accesstoken) for how to apply the token.

If you are using react-map-gl, there are several ways to provide a token to your app:

* Set the `MapboxAccessToken` environment variable. You may need to add additional set up to the bundler ([example](https://webpack.js.org/plugins/environment-plugin/)) so that `process.env.MapboxAccessToken` is accessible at runtime.
* Provide it in the URL, e.g `?access_token=TOKEN`
* Pass it as a prop to the react-map-gl `Map` component `<Map mapboxAccessToken={TOKEN} />`

### Alternatives to Mapbox basemap sevice

As of v2.0, Mapbox GL JS [went proprietary](https://github.com/mapbox/mapbox-gl-js/blob/main/CHANGELOG.md#200) and requires a Mapbox account to use even if you don't load tiles from the Mapbox server. If you do not wish to use the Mapbox service, you may also consider:

- mapbox-gl v1.13, the last release before the license change. Interleaving is not supported by this version.
- [MapLibre GL JS](https://maplibre.org), a community-supported WebGL map library. maplibre-gl can generally be used as a drop-in replacement of mapbox-gl, with some of its own features and APIs. More information can be found in [using with MapLibre](./using-with-maplibre.md).