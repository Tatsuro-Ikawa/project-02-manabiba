'use client';

import { useState } from 'react';
import { runEncryptionDemo, runPerformanceTest } from '@/utils/encryption-demo';
import { runKeyManagementDemo, runSessionManagementTest, runErrorHandlingTest } from '@/utils/keyManagement-demo';

export default function EncryptionTestPage() {
  const [demoResult, setDemoResult] = useState<string>('');
  const [performanceResult, setPerformanceResult] = useState<string>('');
  const [keyManagementResult, setKeyManagementResult] = useState<string>('');
  const [sessionManagementResult, setSessionManagementResult] = useState<string>('');
  const [errorHandlingResult, setErrorHandlingResult] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDemo = async () => {
    setIsRunning(true);
    setDemoResult('実行中...');
    
    try {
      const result = await runEncryptionDemo();
      setDemoResult(result ? '✅ デモが正常に完了しました' : '❌ デモでエラーが発生しました');
    } catch (error) {
      setDemoResult(`❌ エラー: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunPerformanceTest = async () => {
    setIsRunning(true);
    setPerformanceResult('実行中...');
    
    try {
      const result = await runPerformanceTest();
      setPerformanceResult(result ? '✅ パフォーマンステストが正常に完了しました' : '❌ パフォーマンステストでエラーが発生しました');
    } catch (error) {
      setPerformanceResult(`❌ エラー: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunKeyManagementDemo = async () => {
    setIsRunning(true);
    setKeyManagementResult('実行中...');
    
    try {
      const result = await runKeyManagementDemo();
      setKeyManagementResult(result ? '✅ キー管理デモが正常に完了しました' : '❌ キー管理デモでエラーが発生しました');
    } catch (error) {
      setKeyManagementResult(`❌ エラー: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSessionManagementTest = async () => {
    setIsRunning(true);
    setSessionManagementResult('実行中...');
    
    try {
      const result = await runSessionManagementTest();
      setSessionManagementResult(result ? '✅ セッション管理テストが正常に完了しました' : '❌ セッション管理テストでエラーが発生しました');
    } catch (error) {
      setSessionManagementResult(`❌ エラー: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunErrorHandlingTest = async () => {
    setIsRunning(true);
    setErrorHandlingResult('実行中...');
    
    try {
      const result = await runErrorHandlingTest();
      setErrorHandlingResult(result ? '✅ エラーハンドリングテストが正常に完了しました' : '❌ エラーハンドリングテストでエラーが発生しました');
    } catch (error) {
      setErrorHandlingResult(`❌ エラー: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold mb-8 text-gray-900">暗号化機能テスト</h1>
      
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">基本機能テスト</h2>
          <p className="text-gray-700 mb-4">
            暗号化・復号化の基本機能をテストします。ブラウザのコンソールで詳細な結果を確認できます。
          </p>
          <button
            onClick={handleRunDemo}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRunning ? '実行中...' : 'デモを実行'}
          </button>
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <strong className="text-gray-900">結果:</strong> <span className="text-gray-800">{demoResult}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">パフォーマンステスト</h2>
          <p className="text-gray-700 mb-4">
            100回の暗号化・復号化を実行してパフォーマンスを測定します。
          </p>
          <button
            onClick={handleRunPerformanceTest}
            disabled={isRunning}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isRunning ? '実行中...' : 'パフォーマンステストを実行'}
          </button>
          <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
            <strong className="text-gray-900">結果:</strong> <span className="text-gray-800">{performanceResult}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">キー管理システムテスト</h2>
          <p className="text-gray-700 mb-4">
            ユーザーキーの生成、セッション管理、キー復旧機能をテストします。
          </p>
          <button
            onClick={handleRunKeyManagementDemo}
            disabled={isRunning}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors mr-2"
          >
            {isRunning ? '実行中...' : 'キー管理デモ実行'}
          </button>
          <button
            onClick={handleRunSessionManagementTest}
            disabled={isRunning}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors mr-2"
          >
            {isRunning ? '実行中...' : 'セッション管理テスト'}
          </button>
          <button
            onClick={handleRunErrorHandlingTest}
            disabled={isRunning}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isRunning ? '実行中...' : 'エラーハンドリングテスト'}
          </button>
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <strong className="text-gray-900">キー管理結果:</strong> <span className="text-gray-800">{keyManagementResult}</span>
            </div>
            <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
              <strong className="text-gray-900">セッション管理結果:</strong> <span className="text-gray-800">{sessionManagementResult}</span>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <strong className="text-gray-900">エラーハンドリング結果:</strong> <span className="text-gray-800">{errorHandlingResult}</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-300 shadow-sm">
          <h3 className="text-lg font-semibold mb-2 text-yellow-900">確認方法</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            <li>ブラウザの開発者ツールを開く（F12）</li>
            <li>コンソールタブを選択</li>
            <li>上記のボタンをクリックしてテストを実行</li>
            <li>コンソールに詳細なログが表示されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
