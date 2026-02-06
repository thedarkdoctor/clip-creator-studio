/**
 * Trend Filters Bar Component
 */

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { TrendFilters } from '@/hooks/useTrendIntelligence';

interface TrendFiltersBarProps {
  filters: TrendFilters;
  onFiltersChange: (filters: TrendFilters) => void;
}

export function TrendFiltersBar({ filters, onFiltersChange }: TrendFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof TrendFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      {/* Main Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search trends..."
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Platform Filter */}
        <Select
          value={filters.platform || 'all'}
          onValueChange={(value) => updateFilter('platform', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
          </SelectContent>
        </Select>

        {/* Format Filter */}
        <Select
          value={filters.format_type || 'all'}
          onValueChange={(value) => updateFilter('format_type', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="pov">POV</SelectItem>
            <SelectItem value="transformation">Transformation</SelectItem>
            <SelectItem value="tutorial">Tutorial</SelectItem>
            <SelectItem value="meme">Meme</SelectItem>
            <SelectItem value="storytime">Storytime</SelectItem>
            <SelectItem value="relatable">Relatable</SelectItem>
            <SelectItem value="aesthetic">Aesthetic</SelectItem>
            <SelectItem value="challenge">Challenge</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={18} />
        </Button>

        {/* Clear Filters */}
        {(filters.platform || filters.format_type || filters.minScore !== undefined || filters.searchQuery) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="glass-card rounded-lg p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Minimum Viral Score: {filters.minScore || 0}
              </label>
            </div>
            <Slider
              value={[filters.minScore || 0]}
              onValueChange={([value]) => updateFilter('minScore', value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
