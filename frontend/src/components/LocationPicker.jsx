import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [19.076, 72.8777];

const markerIcon = L.divIcon({
  html: `
    <div style="
      position:relative;
      width:34px;
      height:34px;
    ">
      <div style="
        position:absolute;
        width:54px;
        height:54px;
        border:2px solid #f97316;
        border-radius:50%;
        top:-10px;
        left:-10px;
        opacity:0.55;
        animation: pulse 1.4s infinite;
      "></div>
      <div style="
        width:34px;
        height:34px;
        background:#f97316;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 0 18px rgba(249,115,22,0.75);
      "></div>
    </div>
  `,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });

  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect
}) {
  const lat = latitude ? parseFloat(latitude) : DEFAULT_CENTER[0];
  const lng = longitude ? parseFloat(longitude) : DEFAULT_CENTER[1];

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        70% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(0.8); opacity: 0; }
      }

      .leaflet-container {
        background:#0d1117 !important;
        filter: invert(1) hue-rotate(180deg) brightness(0.82);
      }
    `;
    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  return (
    <div
      style={{
        border: "1px solid #30363d",
        borderRadius: "4px",
        overflow: "hidden",
        background: "#161b22"
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        style={{
          height: "300px",
          width: "100%"
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onLocationSelect={onLocationSelect} />

        <Marker
          position={[lat, lng]}
          icon={markerIcon}
        />
      </MapContainer>

      <div
        style={{
          padding: "10px",
          borderTop: "1px solid #30363d",
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#f97316"
        }}
      >
        Selected: {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
}