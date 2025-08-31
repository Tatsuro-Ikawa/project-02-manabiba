'use client';

import React, { useState } from 'react';

interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  milestones: string[];
}

const GoalSetting: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium' as const,
    milestones: ['']
  });

  const handleAddGoal = () => {
    if (formData.title.trim()) {
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        priority: formData.priority,
        status: 'not-started',
        progress: 0,
        milestones: formData.milestones.filter(m => m.trim())
      };
      setGoals([...goals, newGoal]);
      setFormData({
        title: '',
        description: '',
        deadline: '',
        priority: 'medium',
        milestones: ['']
      });
      setShowForm(false);
    }
  };

  const handleUpdateProgress = (goalId: string, progress: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, progress, status: progress >= 100 ? 'completed' : 'in-progress' }
        : goal
    ));
  };

  const handleAddMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, '']
    }));
  };

  const handleMilestoneChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => i === index ? value : m)
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'not-started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">目標設定</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          新しい目標を追加
        </button>
      </div>

      {/* 目標リスト */}
      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{goal.title}</h3>
                <p className="text-gray-600 text-sm">{goal.description}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                  {goal.priority === 'high' ? '高' : goal.priority === 'medium' ? '中' : '低'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status === 'completed' ? '完了' : goal.status === 'in-progress' ? '進行中' : '未開始'}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>進捗</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={goal.progress}
                onChange={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12">{goal.progress}%</span>
            </div>

            {goal.deadline && (
              <p className="text-sm text-gray-500 mt-2">
                期限: {new Date(goal.deadline).toLocaleDateString('ja-JP')}
              </p>
            )}

            {goal.milestones.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">マイルストーン</h4>
                <ul className="space-y-1">
                  {goal.milestones.map((milestone, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      {milestone}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {goals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>まだ目標が設定されていません</p>
            <p className="text-sm">「新しい目標を追加」ボタンから目標を設定しましょう</p>
          </div>
        )}
      </div>

      {/* 目標追加フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新しい目標を追加</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標タイトル</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="目標を簡潔に表現"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="目標の詳細を説明"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">マイルストーン</label>
                {formData.milestones.map((milestone, index) => (
                  <input
                    key={index}
                    type="text"
                    value={milestone}
                    onChange={(e) => handleMilestoneChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                    placeholder={`マイルストーン ${index + 1}`}
                  />
                ))}
                <button
                  onClick={handleAddMilestone}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + マイルストーンを追加
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddGoal}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                追加
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalSetting;
