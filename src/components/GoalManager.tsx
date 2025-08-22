'use client';

import { useState } from 'react';
import { useCoaching } from '@/hooks/useCoaching';
import { Goal } from '@/lib/firestore';

interface GoalManagerProps {
  onGoalUpdate?: () => void;
}

export const GoalManager: React.FC<GoalManagerProps> = ({ onGoalUpdate }) => {
  const { goals, createNewGoal, updateGoalProgress, removeGoal, loading } = useCoaching();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal' as const,
    priority: 'medium' as const,
    deadline: '',
  });

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('目標のタイトルを入力してください');
      return;
    }

    try {
      await createNewGoal({
        userId: '', // useCoachingフック内で設定
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        dueDate: formData.deadline ? new Date(formData.deadline) : undefined,
        status: 'notStarted',
      });

      setFormData({
        title: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        deadline: '',
      });
      setShowCreateModal(false);
      onGoalUpdate?.();
    } catch (error) {
      console.error('目標作成エラー:', error);
      alert('目標の作成に失敗しました');
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      await updateGoalProgress(goalId, updates);
      setEditingGoal(null);
      onGoalUpdate?.();
    } catch (error) {
      console.error('目標更新エラー:', error);
      alert('目標の更新に失敗しました');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('この目標を削除しますか？')) return;

    try {
      await removeGoal(goalId);
      onGoalUpdate?.();
    } catch (error) {
      console.error('目標削除エラー:', error);
      alert('目標の削除に失敗しました');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'text-blue-600 bg-blue-100';
      case 'professional': return 'text-purple-600 bg-purple-100';
      case 'health': return 'text-green-600 bg-green-100';
      case 'learning': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'inProgress': return 'text-blue-600 bg-blue-100';
      case 'notStarted': return 'text-gray-600 bg-gray-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">目標管理</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          新しい目標を作成
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">読み込み中...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">まだ目標が設定されていません</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            最初の目標を作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-gray-600 text-sm mb-2">{goal.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                      {goal.category === 'personal' ? '個人' : 
                       goal.category === 'professional' ? '仕事' :
                       goal.category === 'health' ? '健康' : '学習'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                      {goal.priority === 'high' ? '高' : 
                       goal.priority === 'medium' ? '中' : '低'}優先度
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                      {goal.status === 'completed' ? '完了' :
                       goal.status === 'inProgress' ? '進行中' :
                       goal.status === 'paused' ? '一時停止' : '未開始'}
                    </span>
                  </div>
                  {goal.dueDate && (
                    <p className="text-sm text-gray-500">
                      期限: {new Date(goal.dueDate).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingGoal(goal)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id!)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>

              {/* 進捗更新 */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">進捗:</span>
                <select
                  value={goal.status}
                  onChange={(e) => handleUpdateGoal(goal.id!, { status: e.target.value as any })}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="notStarted">未開始</option>
                  <option value="inProgress">進行中</option>
                  <option value="paused">一時停止</option>
                  <option value="completed">完了</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 目標作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">新しい目標を作成</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目標タイトル *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="目標を入力してください"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="目標の詳細を入力してください"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="personal">個人</option>
                    <option value="professional">仕事</option>
                    <option value="health">健康</option>
                    <option value="learning">学習</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    優先度
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期限
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
