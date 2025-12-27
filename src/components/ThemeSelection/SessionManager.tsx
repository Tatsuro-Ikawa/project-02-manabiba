"use client";

import React, { useState } from 'react';
import { useThemeSelection } from '@/hooks/useThemeSelection';
import { UserType } from '@/types/themeSelection';

interface SessionManagerProps {
  onSessionSelect: (sessionId: string) => void;
  onNewSession: (userType: UserType) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  onSessionSelect,
  onNewSession
}) => {
  const { sessions, loading, createNewSession, deleteSession } = useThemeSelection();
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType>('aspiration');

  const handleCreateNewSession = async () => {
    await createNewSession(selectedUserType);
    setShowNewSessionForm(false);
    onNewSession(selectedUserType);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('このセッションを削除しますか？')) {
      await deleteSession(sessionId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">テーマ選択セッション</h3>
        <button
          onClick={() => setShowNewSessionForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          新しいセッション
        </button>
      </div>

      {showNewSessionForm && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3">新しいセッションを作成</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイプを選択してください
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="aspiration"
                    checked={selectedUserType === 'aspiration'}
                    onChange={(e) => setSelectedUserType(e.target.value as UserType)}
                    className="mr-2"
                  />
                  願望型（やりたいこと）
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="problem"
                    checked={selectedUserType === 'problem'}
                    onChange={(e) => setSelectedUserType(e.target.value as UserType)}
                    className="mr-2"
                  />
                  課題型（改善したいこと）
                </label>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateNewSession}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                作成
              </button>
              <button
                onClick={() => setShowNewSessionForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            セッションがありません。新しいセッションを作成してください。
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      session.userType === 'aspiration' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {session.userType === 'aspiration' ? '願望型' : '課題型'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      session.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {session.status === 'published' ? '完了' : '下書き'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>エントリ数: {session.entries.length}</p>
                    <p>最終更新: {session.updatedAt.toLocaleDateString()}</p>
                    {session.selectedTheme && (
                      <p className="text-green-600 font-medium">テーマ選択済み</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
