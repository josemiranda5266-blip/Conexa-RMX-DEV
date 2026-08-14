import React, { useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldCheck, Award, Star } from 'lucide-react';

interface MapComponentProps {
  professionals: UserProfile[];
  selectedCity: string;
  onSelectProfessional: (pro: UserProfile) => void;
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  'Santiago del Estero': [-27.7833, -64.2667],
  'La Banda': [-27.7333, -64.2500],
  'Buenos Aires': [-34.6037, -58.3816],
  'Córdoba': [-31.4201, -64.1888],
  'Rosario': [-32.9468, -60.6393],
  'Tucumán': [-26.8241, -65.2226]
};

export const MapComponent: React.FC<MapComponentProps> = ({
  professionals,
  selectedCity,
  onSelectProfessional
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerCoords = CITY_COORDINATES[selectedCity] || [-27.7833, -64.2667];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | CONEXA Privado'
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(centerCoords, 13);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & circles
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add approximate location circles & markers for professionals
    professionals.forEach((pro) => {
      const lat = pro.location.lat;
      const lng = pro.location.lng;

      if (!lat || !lng) return;

      // Draw an approximate privacy circle (radius ~800m) around coordinates to hide exact street address
      const privacyCircle = L.circle([lat, lng], {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        radius: 800
      }).addTo(map);

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: #1e293b;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>📍 ${pro.professionName || 'Pro'}</span>
            <span style="color: #f59e0b;">★${pro.rating}</span>
          </div>
        `,
        iconSize: [120, 30],
        iconAnchor: [60, 15]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.className = 'p-2 space-y-2 min-w-[200px] text-slate-900';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${pro.name}</div>
        <div style="font-size: 12px; color: #2563eb; font-weight: 600;">${pro.professionName || 'Profesional'}</div>
        <div style="font-size: 11px; color: #64748b;">📍 Zona Aprox: ${pro.location.approxZone}</div>
        <div style="font-size: 11px; color: #15803d; font-weight: 600;">⭐ ${pro.rating} / 5 (${pro.reviewCount} opiniones)</div>
        <div style="font-size: 10px; color: #059669; margin-top: 4px;">🔒 Teléfono y dirección exactos protegidos</div>
        <button id="pop-btn-${pro.id}" style="
          width: 100%;
          margin-top: 8px;
          background: #2563eb;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        ">Ver Perfil Completo</button>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`pop-btn-${pro.id}`);
        if (btn) {
          btn.onclick = () => onSelectProfessional(pro);
        }
      });
    });
  }, [professionals, selectedCity, onSelectProfessional]);

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-md">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Privacy Notice Badge */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs shadow-lg flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-semibold">Mapa con Geocercas Aproximadas</span>
        <span className="text-[10px] text-slate-300 hidden sm:inline">(Sin dirección exacta)</span>
      </div>
    </div>
  );
};
