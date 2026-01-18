import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';

export default function CoordsEditor() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const [coords, setCoords] = useState({});
  const [originalCoords, setOriginalCoords] = useState({});
  const [libraries, setLibraries] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load coordinates on mount
  useEffect(() => {
    fetch('/library-coords.json')
      .then(res => res.json())
      .then(data => {
        setCoords(data);
        setOriginalCoords(JSON.parse(JSON.stringify(data)));
      })
      .catch(err => console.error('Failed to load coords:', err));
  }, []);

  // Load library names from CSV
  useEffect(() => {
    fetch('/libraries.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const libMap = {};
        for (let i = 1; i < lines.length; i++) {
          const match = lines[i].match(/^"([^"]+)","([^"]+)"/);
          if (match) {
            libMap[match[1]] = match[2];
          }
        }
        setLibraries(libMap);
      })
      .catch(err => console.error('Failed to load libraries:', err));
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          lightPreset: "dusk"
        }
      },
      center: [-71.116, 42.374],
      zoom: 14,
      pitch: 0,
      bearing: 0
    });
  }, []);

  // Add/update markers when coords or libraries change
  useEffect(() => {
    if (!map.current || Object.keys(coords).length === 0) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Add markers for each library
    Object.entries(coords).forEach(([id, { lat, lng }]) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 12px;
        height: 12px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: grab;
      `;

      const libraryName = libraries[id] || id;
      const popup = new mapboxgl.Popup({ offset: 10, closeButton: false })
        .setText(libraryName);

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', () => {
        marker.togglePopup();
      });

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setCoords(prev => ({
          ...prev,
          [id]: { lat: lngLat.lat, lng: lngLat.lng }
        }));
      });

      markersRef.current[id] = marker;
    });
  }, [coords, libraries]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/save-coords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords)
      });
      if (response.ok) {
        setOriginalCoords(JSON.parse(JSON.stringify(coords)));
        setMessage('Saved!');
      } else {
        setMessage('Save failed - check console');
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage('Save failed - copy from console');
      console.log('Updated coords JSON:');
      console.log(JSON.stringify(coords, null, 2));
    }
    setSaving(false);
  };

  const handleReset = () => {
    setCoords(JSON.parse(JSON.stringify(originalCoords)));
    setMessage('Reset to original positions');
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(coords, null, 2));
    setMessage('Copied to clipboard!');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px 20px',
        background: '#1a1a1a',
        color: 'white',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        fontFamily: 'monospace'
      }}>
        <span>Coords Editor</span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '5px 15px', cursor: 'pointer' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleReset}
          style={{ padding: '5px 15px', cursor: 'pointer' }}
        >
          Reset
        </button>
        <button
          onClick={handleCopyJSON}
          style={{ padding: '5px 15px', cursor: 'pointer' }}
        >
          Copy JSON
        </button>
        {message && <span style={{ color: '#4ade80' }}>{message}</span>}
        <span style={{ marginLeft: 'auto', color: '#888', fontSize: '12px' }}>
          Drag markers to adjust positions
        </span>
      </div>
      <div ref={mapContainer} style={{ flex: 1 }} />
    </div>
  );
}
