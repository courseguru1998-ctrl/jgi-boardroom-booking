import { Link } from 'react-router-dom';
import { Users, MapPin, Building, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import type { Room } from '@/types';

interface RoomCardProps {
  room: Room;
}

const amenityLabels: Record<string, string> = {
  projector: 'Projector',
  whiteboard: 'Whiteboard',
  'video-conferencing': 'Video Conferencing',
  'tv-screen': 'TV Screen',
  'audio-system': 'Audio System',
};

const amenityIcons: Record<string, string> = {
  projector: '📽️',
  whiteboard: '📋',
  'video-conferencing': '📹',
  'tv-screen': '📺',
  'audio-system': '🔊',
};

export function RoomCard({ room }: RoomCardProps) {
  return (
    <Card className="group overflow-hidden">
      {/* Room image */}
      <div className="h-32 relative overflow-hidden">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Fallback to gradient on image load error
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 bg-gradient-to-br from-jgi-blue/15 via-jgi-gold/10 to-jgi-blue/5 flex items-center justify-center ${room.imageUrl ? 'hidden' : ''}`}>
          <Building className="h-12 w-12 text-jgi-blue/30" />
        </div>
        {/* Capacity badge */}
        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-jgi-gold/30">
          <Users className="h-3.5 w-3.5 text-jgi-gold" />
          <span className="text-xs font-semibold text-foreground">{room.capacity}</span>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
          {room.name}
        </CardTitle>
        <div className="flex flex-wrap gap-3 text-sm text-foreground-secondary mt-2">
          {room.building && (
            <div className="flex items-center gap-1.5">
              <Building className="h-4 w-4 text-jgi-blue" />
              <span>{room.building}</span>
            </div>
          )}
          {room.floor && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-jgi-blue" />
              <span>Floor {room.floor}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {room.amenities.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-jgi-gold" />
              <span className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Amenities</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent-subtle px-2.5 py-1 text-xs font-medium text-foreground-secondary"
                >
                  <span>{amenityIcons[amenity] || '✓'}</span>
                  {amenityLabels[amenity] || amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link to={`/rooms/${room.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Details
            </Button>
          </Link>
          <Link to={`/calendar?roomId=${room.id}`} className="flex-1">
            <Button variant="accent" className="w-full">
              Book Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
