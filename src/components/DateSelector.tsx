'use client';

import { useState } from 'react';
import { formatDateToJapanese, isTodayJST } from '@/utils/dateUtils';

interface DateSelectorProps {
  selectedDate: string;
  onDateSelect: (date: Date) => void;
  onTodayClick: () => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateSelect,
  onTodayClick,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const date = new Date(dateValue + 'T00:00:00');
      onDateSelect(date);
    }
    setShowDatePicker(false);
  };

  const formatDisplayDate = (dateString: string): string => {
    return formatDateToJapanese(dateString);
  };

  const isToday = (dateString: string): boolean => {
    return isTodayJST(dateString);
  };

  return (
    <div className="flex items-center space-x-4 mb-6">
      {/* 日付表示 */}
      <div className="flex-1">
        <div className="text-lg font-semibold text-gray-800">
          {formatDisplayDate(selectedDate)}
          {isToday(selectedDate) && (
            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              今日
            </span>
          )}
        </div>
      </div>

      {/* 日付選択ボタン */}
      <div className="relative">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
        >
          <svg
            className="w-5 h-5 inline-block mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          日付選択
        </button>

        {/* 日付ピッカー */}
        {showDatePicker && (
          <div className="absolute top-full left-0 mt-1 z-10">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              max={new Date().toISOString().split('T')[0]} // 今日まで選択可能
            />
          </div>
        )}
      </div>

      {/* 今日ボタン */}
      <button
        onClick={onTodayClick}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
      >
        今日
      </button>
    </div>
  );
};
