'use client';

import { useState, useEffect } from 'react';
import { usePDCA } from '@/hooks/usePDCA';

interface PDCAInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // 成功時のコールバックを追加
  type: 'plan' | 'do' | 'check' | 'action';
  currentValue?: string;
}

const PDCA_LABELS = {
  plan: '今日の目標',
  do: '今日の行動計画',
  check: '行動の結果',
  action: '明日への改善',
};

const PDCA_DESCRIPTIONS = {
  plan: '今日達成したい目標を設定してください',
  do: '目標達成のための具体的な行動計画を立ててください',
  check: '実際に行動した結果を振り返ってください',
  action: '明日への改善点を考えてください',
};

export const PDCAInputModal: React.FC<PDCAInputModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  currentValue = '',
}) => {
  const { updatePDCA, loading } = usePDCA();
  const [value, setValue] = useState(currentValue);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モーダルが開くたびに現在値を更新
  useEffect(() => {
    if (isOpen) {
      setValue(currentValue);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value.trim()) {
      setError('内容を入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log('PDCAInputModal: 保存開始', { type, value });
      
      await updatePDCA(type, value.trim());
      
      console.log('PDCAInputModal: 保存完了');
      
      // 成功時のコールバックを実行
      if (onSuccess) {
        console.log('PDCAInputModal: onSuccessコールバック実行');
        onSuccess();
      }
      
      // 少し待ってからモーダルを閉じる
      setTimeout(() => {
        onClose();
      }, 100);
      
    } catch (err) {
      console.error('PDCA更新エラー:', err);
      setError('保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setValue(currentValue);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-2">{PDCA_LABELS[type]}</h2>
        <p className="text-gray-600 mb-6">{PDCA_DESCRIPTIONS[type]}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pdca-input" className="block text-sm font-medium text-gray-700 mb-1">
              {PDCA_LABELS[type]}
            </label>
            <textarea
              id="pdca-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              placeholder={`${PDCA_LABELS[type]}を入力してください`}
              required
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
