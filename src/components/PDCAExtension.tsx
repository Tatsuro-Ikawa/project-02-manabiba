'use client';

import React, { useState } from 'react';

interface PDCAAnalysis {
  id: string;
  date: string;
  plan: string;
  do: string;
  check: string;
  action: string;
  insights: string[];
  patterns: string[];
  improvements: string[];
}

const PDCAExtension: React.FC = () => {
  const [analyses, setAnalyses] = useState<PDCAAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PDCAAnalysis | null>(null);
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [newInsight, setNewInsight] = useState('');

  const handleAddInsight = () => {
    if (newInsight.trim() && selectedAnalysis) {
      const updatedAnalysis = {
        ...selectedAnalysis,
        insights: [...selectedAnalysis.insights, newInsight.trim()]
      };
      setAnalyses(analyses.map(a => a.id === selectedAnalysis.id ? updatedAnalysis : a));
      setSelectedAnalysis(updatedAnalysis);
      setNewInsight('');
      setShowInsightForm(false);
    }
  };

  const handleAddPattern = (pattern: string) => {
    if (selectedAnalysis) {
      const updatedAnalysis = {
        ...selectedAnalysis,
        patterns: [...selectedAnalysis.patterns, pattern]
      };
      setAnalyses(analyses.map(a => a.id === selectedAnalysis.id ? updatedAnalysis : a));
      setSelectedAnalysis(updatedAnalysis);
    }
  };

  const handleAddImprovement = (improvement: string) => {
    if (selectedAnalysis) {
      const updatedAnalysis = {
        ...selectedAnalysis,
        improvements: [...selectedAnalysis.improvements, improvement]
      };
      setAnalyses(analyses.map(a => a.id === selectedAnalysis.id ? updatedAnalysis : a));
      setSelectedAnalysis(updatedAnalysis);
    }
  };

  const getAnalysisScore = (analysis: PDCAAnalysis) => {
    let score = 0;
    if (analysis.plan) score += 25;
    if (analysis.do) score += 25;
    if (analysis.check) score += 25;
    if (analysis.action) score += 25;
    return score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">PDCA分析・振り返り</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分析リスト */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">分析履歴</h3>
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const score = getAnalysisScore(analysis);
              return (
                <div 
                  key={analysis.id} 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors duration-200 ${
                    selectedAnalysis?.id === analysis.id 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAnalysis(analysis)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-800">
                      {new Date(analysis.date).toLocaleDateString('ja-JP')}
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                      {score}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {analysis.plan ? analysis.plan.substring(0, 50) + '...' : '計画未設定'}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {analysis.insights.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        洞察 {analysis.insights.length}
                      </span>
                    )}
                    {analysis.patterns.length > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        パターン {analysis.patterns.length}
                      </span>
                    )}
                    {analysis.improvements.length > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        改善 {analysis.improvements.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {analyses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>まだ分析データがありません</p>
                <p className="text-sm">PDCA日記を記録すると分析が表示されます</p>
              </div>
            )}
          </div>
        </div>

        {/* 詳細分析 */}
        <div>
          {selectedAnalysis ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {new Date(selectedAnalysis.date).toLocaleDateString('ja-JP')} の分析
              </h3>

              {/* PDCA詳細 */}
              <div className="space-y-3 mb-6">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-blue-600 mb-1">Plan - 計画</h4>
                  <p className="text-sm text-gray-700">{selectedAnalysis.plan || '未設定'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-green-600 mb-1">Do - 実行</h4>
                  <p className="text-sm text-gray-700">{selectedAnalysis.do || '未設定'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-yellow-600 mb-1">Check - 確認</h4>
                  <p className="text-sm text-gray-700">{selectedAnalysis.check || '未設定'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-red-600 mb-1">Action - 改善</h4>
                  <p className="text-sm text-gray-700">{selectedAnalysis.action || '未設定'}</p>
                </div>
              </div>

              {/* 洞察 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-800">洞察・気づき</h4>
                  <button
                    onClick={() => setShowInsightForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + 追加
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedAnalysis.insights.map((insight, index) => (
                    <div key={index} className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                  ))}
                  {selectedAnalysis.insights.length === 0 && (
                    <p className="text-sm text-gray-500">まだ洞察がありません</p>
                  )}
                </div>
              </div>

              {/* パターン */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">繰り返しパターン</h4>
                <div className="space-y-2">
                  {selectedAnalysis.patterns.map((pattern, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-700">{pattern}</p>
                    </div>
                  ))}
                  {selectedAnalysis.patterns.length === 0 && (
                    <p className="text-sm text-gray-500">まだパターンがありません</p>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => handleAddPattern('新しいパターンを発見')}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    + パターンを追加
                  </button>
                </div>
              </div>

              {/* 改善点 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">改善点・次のアクション</h4>
                <div className="space-y-2">
                  {selectedAnalysis.improvements.map((improvement, index) => (
                    <div key={index} className="p-2 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-700">{improvement}</p>
                    </div>
                  ))}
                  {selectedAnalysis.improvements.length === 0 && (
                    <p className="text-sm text-gray-500">まだ改善点がありません</p>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => handleAddImprovement('新しい改善点を追加')}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    + 改善点を追加
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>分析を選択してください</p>
              <p className="text-sm">左側のリストから分析を選ぶと詳細が表示されます</p>
            </div>
          )}
        </div>
      </div>

      {/* 洞察追加フォーム */}
      {showInsightForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">新しい洞察を追加</h3>
            <textarea
              value={newInsight}
              onChange={(e) => setNewInsight(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              rows={4}
              placeholder="気づいたこと、学んだことを記録..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddInsight}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setShowInsightForm(false);
                  setNewInsight('');
                }}
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

export default PDCAExtension;
