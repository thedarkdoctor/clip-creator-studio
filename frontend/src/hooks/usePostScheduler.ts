// src/hooks/usePostScheduler.ts
import { useState } from 'react';
import { scheduleVideos, enableAutoMode, getScheduleInfo, deleteSchedule } from '@/services/postSchedulerService';

export function usePostScheduler(userId: string) {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<any>(null);

  async function schedulePost(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly', videoIds: string[], enableAuto?: boolean) {
    setLoading(true);
    try {
      const result = await scheduleVideos(userId, frequency, videoIds);
      if (enableAuto) {
        await enableAutoMode(userId, true);
      }
      const updated = await getScheduleInfo(userId);
      setSchedule(updated);
      return result;
    } catch (error) {
      console.error('Schedule failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedule() {
    const info = await getScheduleInfo(userId);
    setSchedule(info);
    return info;
  }

  async function clearSchedule() {
    await deleteSchedule(userId);
    setSchedule(null);
  }

  return { schedule, loading, schedulePost, fetchSchedule, clearSchedule };
}
