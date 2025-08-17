import { useState, useEffect, useMemo } from 'react';
import { PDCAData } from '@/lib/firestore';
import { formatDateToJST, getMonthNameJST } from '@/utils/dateUtils';

export interface DateStatus {
  date: string;
  hasEntries: boolean;
  entryCount: number;
  lastUpdated?: Date;
}

export const useCalendar = (allEntries: PDCAData[]) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());



  // 日付文字列をDateオブジェクトに変換
  const parseDate = (dateString: string): Date => {
    return new Date(dateString + 'T00:00:00');
  };

  // エントリデータから日付ごとの状態を計算
  const entriesByDate = useMemo(() => {
    const entriesMap = new Map<string, DateStatus>();
    
    allEntries.forEach(entry => {
      const date = entry.date;
      const existing = entriesMap.get(date);
      
      if (existing) {
        existing.entryCount += 1;
        if (entry.updatedAt) {
          const updatedAt = entry.updatedAt.toDate();
          if (!existing.lastUpdated || updatedAt > existing.lastUpdated) {
            existing.lastUpdated = updatedAt;
          }
        }
      } else {
        entriesMap.set(date, {
          date,
          hasEntries: true,
          entryCount: 1,
          lastUpdated: entry.updatedAt?.toDate(),
        });
      }
    });
    
    return entriesMap;
  }, [allEntries]);

  // 指定日の状態を取得
  const getDateStatus = (date: Date): DateStatus => {
    const dateString = formatDateToJST(date);
    return entriesByDate.get(dateString) || {
      date: dateString,
      hasEntries: false,
      entryCount: 0,
    };
  };

  // 月間ナビゲーション
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // 今日に移動
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // 日付選択
  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // 月間カレンダーの日付配列を生成
  const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    // 前月の日付を追加（週の開始を月曜日に）
    const firstDayOfWeek = firstDay.getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = startOffset; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }
    
    // 当月の日付を追加
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // 次月の日付を追加（6週分のグリッドを埋める）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  // 月間カレンダーの日付配列
  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  // 月名を取得
  const getMonthName = (date: Date): string => {
    return getMonthNameJST(date);
  };

  // 曜日名を取得
  const getWeekdayNames = (): string[] => {
    return ['月', '火', '水', '木', '金', '土', '日'];
  };

  return {
    currentMonth,
    selectedDate,
    monthDays,
    entriesByDate,
    getDateStatus,
    navigateMonth,
    goToToday,
    selectDate,
    getMonthName,
    getWeekdayNames,
    formatDate: formatDateToJST,
    parseDate,
  };
};
