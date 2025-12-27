"use client";

import React from 'react';

interface HomeProps {
  onCourseSelect: (course: string) => void;
}

const Home: React.FC<HomeProps> = ({ onCourseSelect }) => {
  const courses = [
    {
      id: 'self-understanding',
      title: '自分を深く知りたい',
      description: '自分の価値観や強みを理解し、自己理解を深めます',
      color: 'green',
      icon: '🧠'
    },
    {
      id: 'aspiration',
      title: '願いを実現したい',
      description: 'やりたいことや夢を明確にし、実現に向けた計画を立てます',
      color: 'blue',
      icon: '🌟'
    },
    {
      id: 'problem-solving',
      title: '課題を解決したい',
      description: '現在の問題や悩みを整理し、解決策を見つけます',
      color: 'orange',
      icon: '🔧'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300';
      case 'blue':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300';
      case 'orange':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          一度きりの人生、何から始めますか？
        </h1>
        <p className="text-lg text-gray-600">
          あなたの目標達成をサポートする3つのコースから選択してください
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => onCourseSelect(course.id)}
            className={`p-6 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${getColorClasses(course.color)}`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{course.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
              <p className="text-sm opacity-80">{course.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
