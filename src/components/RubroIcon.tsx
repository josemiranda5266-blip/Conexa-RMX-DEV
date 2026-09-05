import React from 'react';
import {
  Zap,
  Wrench,
  Flame,
  Snowflake,
  Sun,
  Key,
  Paintbrush,
  Hammer,
  Layers,
  Home,
  Building2,
  Package,
  Grid,
  Shield,
  Cpu,
  Sprout,
  Waves,
  Bug,
  Sparkles,
  Tv,
  Laptop,
  Car,
  Compass,
  Truck,
  Camera,
  Briefcase
} from 'lucide-react';
import { ALL_RUBROS_CATALOG } from '../data/rubrosData';

export const RUBRO_ICONS: Record<string, React.ElementType> = {
  Zap,
  Wrench,
  Flame,
  Snowflake,
  Sun,
  Key,
  Paintbrush,
  Hammer,
  Layers,
  Home,
  Building2,
  Package,
  Grid,
  Shield,
  Cpu,
  Sprout,
  Waves,
  Bug,
  Sparkles,
  Tv,
  Laptop,
  Car,
  Compass,
  Truck,
  Camera,
  Briefcase
};

export const RubroIcon: React.FC<{
  iconName?: string;
  rubroId?: string;
  className?: string;
}> = ({ iconName, rubroId, className = 'w-5 h-5 text-red-500' }) => {
  let resolvedIconName = iconName;
  if (!resolvedIconName && rubroId) {
    const found = ALL_RUBROS_CATALOG.find(r => r.id === rubroId);
    if (found?.iconName) {
      resolvedIconName = found.iconName;
    }
  }

  const IconComponent = (resolvedIconName && RUBRO_ICONS[resolvedIconName]) || Briefcase;
  return <IconComponent className={className} />;
};

