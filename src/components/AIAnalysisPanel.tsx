'use client';

import { useState, useEffect } from 'react';
import { useCoaching } from '@/hooks/useCoaching';
import { usePDCA } from '@/hooks/usePDCA';
import { AIAnalysis } from '@/lib/firestore';

interface AIAnalysisPanelProps {
  onAnalysisComplete?: () => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ onAnalysisComplete }) => {
  const { aiAnalyses, createAnalysis, loading } = useCoaching();
  const { currentPDCA, allEntries } = usePDCA();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysis | null>(null);

  // 簡易的なAI分析ロジック（実際のAI APIを使用する場合はここを置き換え）
  const generateAIAnalysis = async (type: 'daily' | 'weekly' | 'monthly'): Promise<AIAnalysis> => {
    // 実際のAI分析では、ここでAI APIを呼び出して分析を実行
    // 現在は簡易的な分析ロジックを実装
    
    const now = new Date();
    const analysisDate = new Date();
    
    let summary = '';
    let keyPoints: string[] = [];
    let challenges: string[] = [];
    let recommendations: string[] = [];

    if (type === 'daily') {
      if (currentPDCA) {
        summary = '今日のPDCAサイクルを分析しました。';
        
        if (currentPDCA.plan) {
          keyPoints.push('明確な目標設定ができています');
        } else {
          challenges.push('目標設定が不完全です');
          recommendations.push('明日は具体的な目標を設定しましょう');
        }
        
        if (currentPDCA.do) {
          keyPoints.push('行動計画が立てられています');
        } else {
          challenges.push('行動計画が不足しています');
          recommendations.push('具体的な行動ステップを考えてみましょう');
        }
        
        if (currentPDCA.check) {
          keyPoints.push('振り返りができています');
        } else {
          challenges.push('振り返りが不足しています');
          recommendations.push('今日の行動を振り返ってみましょう');
        }
        
        if (currentPDCA.action) {
          keyPoints.push('改善点が明確になっています');
        } else {
          challenges.push('改善点が不明確です');
          recommendations.push('明日への改善点を考えてみましょう');
        }
      } else {
        summary = '今日のPDCAデータがまだ入力されていません。';
        recommendations.push('PDCAサイクルを開始してみましょう');
      }
    } else if (type === 'weekly') {
      const weeklyEntries = allEntries.slice(0, 7); // 最新7日分
      const completedEntries = weeklyEntries.filter(entry => 
        entry.plan && entry.do && entry.check && entry.action
      );
      
      summary = `今週は${weeklyEntries.length}日分のPDCAデータがあります。`;
      keyPoints.push(`${completedEntries.length}日分が完全に記録されています`);
      
      if (completedEntries.length < weeklyEntries.length) {
        challenges.push('一部の日でPDCAが不完全です');
        recommendations.push('毎日PDCAサイクルを完了させる習慣をつけましょう');
      }
      
      if (weeklyEntries.length > 0) {
        recommendations.push('来週はより具体的な目標設定を心がけましょう');
      }
    } else if (type === 'monthly') {
      const monthlyEntries = allEntries.slice(0, 30); // 最新30日分
      const completedEntries = monthlyEntries.filter(entry => 
        entry.plan && entry.do && entry.check && entry.action
      );
      
      summary = `今月は${monthlyEntries.length}日分のPDCAデータがあります。`;
      keyPoints.push(`${completedEntries.length}日分が完全に記録されています`);
      
      const completionRate = monthlyEntries.length > 0 ? (completedEntries.length / monthlyEntries.length) * 100 : 0;
      
      if (completionRate >= 80) {
        keyPoints.push('高い継続率を維持できています');
      } else if (completionRate >= 50) {
        challenges.push('継続率に改善の余地があります');
        recommendations.push('PDCA記録の習慣化を強化しましょう');
      } else {
        challenges.push('継続率が低いです');
        recommendations.push('小さな目標から始めて習慣化を目指しましょう');
      }
    }

    return {
      id: '',
      userId: '', // useCoachingフック内で設定
      analysisType: type,
      analysisDate,
      summary,
      keyPoints,
      challenges,
      recommendations,
      createdAt: now,
    };
  };

  const handleGenerateAnalysis = async () => {
    if (!currentPDCA && selectedAnalysisType === 'daily') {
      alert('日次分析には今日のPDCAデータが必要です');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // AI分析を実行
      const analysis = await generateAIAnalysis(selectedAnalysisType);
      
      // Firestoreに保存
      const analysisId = await createAnalysis(analysis);
      analysis.id = analysisId;
      
      setAnalysisResult(analysis);
      onAnalysisComplete?.();
      
    } catch (error) {
      console.error('AI分析エラー:', error);
      alert('AI分析の実行に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return '日次分析';
      case 'weekly': return '週次分析';
      case 'monthly': return '月次分析';
      default: return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">AI分析</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedAnalysisType}
            onChange={(e) => setSelectedAnalysisType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="daily">日次分析</option>
            <option value="weekly">週次分析</option>
            <option value="monthly">月次分析</option>
          </select>
          <button
            onClick={handleGenerateAnalysis}
            disabled={isAnalyzing || loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isAnalyzing ? '分析中...' : '分析実行'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">読み込み中...</p>
        </div>
      ) : analysisResult ? (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">
              {getAnalysisTypeLabel(analysisResult.analysisType)}結果
            </h3>
            <p className="text-purple-700">{analysisResult.summary}</p>
          </div>

          {analysisResult.keyPoints.length > 0 && (
            <div>
              <h4 className="font-semibold text-green-700 mb-2">良い点</h4>
              <ul className="space-y-1">
                {analysisResult.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.challenges.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2">課題</h4>
              <ul className="space-y-1">
                {analysisResult.challenges.map((challenge, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2">⚠</span>
                    <span className="text-gray-700">{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">推奨事項</h4>
              <ul className="space-y-1">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">💡</span>
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm text-gray-500">
            分析日時: {analysisResult.createdAt.toLocaleString('ja-JP')}
          </div>
        </div>
      ) : aiAnalyses.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 mb-4">過去の分析結果</h3>
          {aiAnalyses.slice(0, 3).map((analysis) => (
            <div key={analysis.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-800">
                  {getAnalysisTypeLabel(analysis.analysisType)}
                </h4>
                <span className="text-sm text-gray-500">
                  {analysis.createdAt?.toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{analysis.summary}</p>
              {analysis.keyPoints.length > 0 && (
                <p className="text-green-600 text-sm mt-1">
                  良い点: {analysis.keyPoints.length}件
                </p>
              )}
              {analysis.recommendations.length > 0 && (
                <p className="text-blue-600 text-sm">
                  推奨事項: {analysis.recommendations.length}件
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">まだAI分析が実行されていません</p>
          <p className="text-sm text-gray-400">
            PDCAデータを入力してから分析を実行してください
          </p>
        </div>
      )}
    </div>
  );
};
