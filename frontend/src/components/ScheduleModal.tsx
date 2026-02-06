import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { scheduleVideos, enableAutoMode, getScheduleInfo } from '@/services/postSchedulerService';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  videoIds: string[];
}

export function ScheduleModal({ isOpen, onClose, userId, videoIds }: ScheduleModalProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [autoMode, setAutoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadScheduleInfo();
    }
  }, [isOpen, userId]);

  async function loadScheduleInfo() {
    const info = await getScheduleInfo(userId);
    if (info) {
      setScheduleInfo(info);
      setFrequency(info.frequency);
      setAutoMode(info.auto_mode);
    }
  }

  async function handleSchedule() {
    setLoading(true);
    try {
      await scheduleVideos(userId, frequency, videoIds);
      if (autoMode) {
        await enableAutoMode(userId, true);
      }
      onClose();
    } catch (error) {
      console.error('Schedule failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Posts to Buffer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="frequency">Posting Frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-mode">Enable Auto-Schedule</Label>
            <Switch
              id="auto-mode"
              checked={autoMode}
              onCheckedChange={setAutoMode}
            />
          </div>

          {scheduleInfo && (
            <div className="text-sm text-muted-foreground">
              <p>Next post: {new Date(scheduleInfo.next_post_at).toLocaleDateString()}</p>
            </div>
          )}

          <Button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Scheduling...' : 'Schedule Posts'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
