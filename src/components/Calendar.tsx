'use client';

import { useCalendar, DateStatus } from '@/hooks/useCalendar';
import { PDCAData } from '@/lib/firestore';

interface CalendarProps {
  allEntries: PDCAData[];
  selectedDate: string;
  onDateSelect: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  allEntries,
  selectedDate,
  onDateSelect,
}) => {
  const {
    currentMonth,
    monthDays,
    getDateStatus,
    navigateMonth,
    goToToday,
    getMonthName,
    getWeekdayNames,
    formatDate,
  } = useCalendar(allEntries);

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isSelectedDate = (date: Date): boolean => {
    return formatDate(date) === selectedDate;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const getDateClassName = (date: Date): string => {
    let className = 'w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg cursor-pointer transition-colors duration-200';
    
    if (!isCurrentMonth(date)) {
      className += ' text-gray-400';
    } else if (isSelectedDate(date)) {
      className += ' bg-indigo-600 text-white';
    } else if (isToday(date)) {
      className += ' bg-blue-100 text-blue-800 border-2 border-blue-300';
    } else {
      className += ' text-gray-700 hover:bg-gray-100';
    }
    
    return className;
  };

  const getEntryIndicator = (dateStatus: DateStatus): JSX.Element | null => {
    if (!dateStatus.hasEntries) return null;
    
    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">カレンダー</h3>
        <button
          onClick={goToToday}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          今日
        </button>
      </div>

      {/* 月間ナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h4 className="text-lg font-semibold text-gray-800">
          {getMonthName(currentMonth)}
        </h4>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {getWeekdayNames().map((day, index) => (
          <div
            key={day}
            className={`w-10 h-10 flex items-center justify-center text-sm font-medium ${
              index === 6 ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, index) => {
          const dateStatus = getDateStatus(date);
          
          return (
            <div
              key={index}
              className="relative"
              onClick={() => handleDateClick(date)}
            >
              <div className={getDateClassName(date)}>
                {date.getDate()}
              </div>
              {getEntryIndicator(dateStatus)}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>エントリあり</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded-lg"></div>
            <span>今日</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-indigo-600 rounded-lg"></div>
            <span>選択中</span>
          </div>
        </div>
      </div>
    </div>
  );
};
