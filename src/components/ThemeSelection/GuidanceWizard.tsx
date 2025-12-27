"use client";

import React, { useState } from 'react';

interface GuidanceWizardProps {
  onComplete: (answers: string[]) => void;
  onBack: () => void;
}

const guidanceQuestions = [
  "最近、心の中で何度も繰り返している悩みはありますか？",
  "どの悩みが一番気持ちを重たくさせますか？",
  "よく出くわす場面・人・状況はありますか？",
  "それは週に何回くらい起きていますか？",
  "「これさえ解決できたら…」と思うことはどれですか？"
];

export const GuidanceWizard: React.FC<GuidanceWizardProps> = ({
  onComplete,
  onBack
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const handleNext = () => {
    if (currentAnswer.trim()) {
      const newAnswers = [...answers, currentAnswer.trim()];
      setAnswers(newAnswers);
      
      if (currentQuestion < guidanceQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setCurrentAnswer('');
      } else {
        onComplete(newAnswers);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setCurrentAnswer(answers[currentQuestion - 1] || '');
      setAnswers(answers.slice(0, -1));
    } else {
      onBack();
    }
  };

  const handleSkip = () => {
    if (currentQuestion < guidanceQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer('');
    } else {
      onComplete(answers);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">絞り込み支援ウィザード</h2>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={onBack}
        >
          戻る
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-gray-700">
          <strong>質問 {currentQuestion + 1}/{guidanceQuestions.length}:</strong>
          以下の質問に答えることで、あなたのテーマを絞り込むお手伝いをします。
        </p>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestion + 1) / guidanceQuestions.length) * 100}%`
          }}
        ></div>
      </div>

      {/* 質問 */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {guidanceQuestions[currentQuestion]}
          </h3>
          
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="あなたの答えを入力してください..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </div>

        {/* ボタン */}
        <div className="flex space-x-3">
          <button
            onClick={handleNext}
            disabled={!currentAnswer.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {currentQuestion < guidanceQuestions.length - 1 ? '次へ' : '完了'}
          </button>
          
          <button
            onClick={handleSkip}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            スキップ
          </button>
        </div>
      </div>

      {/* これまでの回答 */}
      {answers.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">これまでの回答</h4>
          <div className="space-y-2">
            {answers.map((answer, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">Q{index + 1}:</span> {answer}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ヒント */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-2">ヒント</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 完璧な答えを求めなくて大丈夫です</li>
          <li>• 思いつくことを自由に書いてみてください</li>
          <li>• 分からない場合は「スキップ」を押してください</li>
        </ul>
      </div>
    </div>
  );
};
