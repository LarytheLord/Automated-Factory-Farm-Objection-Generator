'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

// Dynamically import MapContainer and other Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface Permit {
    project_title: string;
    location: string;
    country: string;
    category?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    activity: string;
}

export default function MapPage() {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [loading, setLoading] = useState(true);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        // Fix Leaflet icon issue
        import('leaflet').then((leaflet) => {
            setL(leaflet);
            // @ts-ignore
            delete leaflet.Icon.Default.prototype._getIconUrl;
            leaflet.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        });

        const fetchPermits = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/permits`);
                if (response.ok) {
                    const data = await response.json();
                    setPermits(data.filter((p: Permit) => p.coordinates)); // Only show permits with coordinates
                }
            } catch (error) {
                console.error('Error fetching permits:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermits();
    }, []);

    if (loading || !L) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Map...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="absolute top-4 left-4 z-[1000] bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-blue-400 hover:text-blue-300">
                        ← Back
                    </Link>
                    <h1 className="text-xl font-bold">Global Permit Map</h1>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                    Showing {permits.length} locations
                </div>
            </div>

            <div className="h-screen w-full">
                <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {permits.map((permit, idx) => (
                        permit.coordinates && (
                            <Marker key={idx} position={[permit.coordinates.lat, permit.coordinates.lng]}>
                                <Popup>
                                    <div className="text-gray-900">
                                        <strong className="block text-lg mb-1">{permit.project_title}</strong>
                                        <p className="text-sm mb-1">📍 {permit.location}, {permit.country}</p>
                                        <p className="text-sm mb-1">🏭 {permit.activity}</p>
                                        {permit.category && (
                                            <span className={`inline-block px-2 py-1 rounded text-xs text-white ${permit.category === 'Red' ? 'bg-red-500' :
                                                    permit.category === 'Orange' ? 'bg-orange-500' : 'bg-green-500'
                                                }`}>
                                                {permit.category} Category
                                            </span>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
