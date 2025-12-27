'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// サンプルデータ
const lineData = [
  { name: '1月', 目標: 4000, 実績: 2400 },
  { name: '2月', 目標: 3000, 実績: 1398 },
  { name: '3月', 目標: 2000, 実績: 9800 },
  { name: '4月', 目標: 2780, 実績: 3908 },
  { name: '5月', 目標: 1890, 実績: 4800 },
  { name: '6月', 目標: 2390, 実績: 3800 },
];

const areaData = [
  { name: 'Plan', 完了: 4000, 未完了: 2400 },
  { name: 'Do', 完了: 3000, 未完了: 1398 },
  { name: 'Check', 完了: 2000, 未完了: 9800 },
  { name: 'Act', 完了: 2780, 未完了: 3908 },
];

const barData = [
  { name: '自己理解', 完了率: 85 },
  { name: '目標設定', 完了率: 72 },
  { name: '計画策定', 完了率: 68 },
  { name: '実行・習慣化', 完了率: 45 },
];

const pieData = [
  { name: '完了', value: 400, color: '#0088FE' },
  { name: '進行中', value: 300, color: '#00C49F' },
  { name: '未着手', value: 300, color: '#FFBB28' },
  { name: '保留', value: 200, color: '#FF8042' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ChartExample: React.FC = () => {
  return (
    <div className="p-6">
      <div className="space-y-8">
        <h1 className="text-xl font-bold text-center text-blue-600 mb-8">
          チャート機能デモ
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 折れ線グラフ */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">目標 vs 実績（折れ線グラフ）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="目標" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="実績" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* エリアチャート */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">PDCA進捗（エリアチャート）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="完了" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                />
                <Area 
                  type="monotone" 
                  dataKey="未完了" 
                  stackId="1" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 棒グラフ */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">機能別完了率（棒グラフ）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="完了率" 
                  fill="#8884d8" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 円グラフ */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">タスク状況（円グラフ）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">チャート機能の特徴</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-blue-600 mb-2">✅ 対応チャート種類</p>
                <p>• 折れ線グラフ（LineChart）</p>
                <p>• エリアチャート（AreaChart）</p>
                <p>• 棒グラフ（BarChart）</p>
                <p>• 円グラフ（PieChart）</p>
                <p>• 散布図（ScatterChart）</p>
                <p>• 複合チャート</p>
              </div>
              <div>
                <p className="font-bold text-blue-600 mb-2">✅ 機能</p>
                <p>• レスポンシブ対応</p>
                <p>• インタラクティブ（ホバー、クリック）</p>
                <p>• カスタマイズ可能</p>
                <p>• TypeScript対応</p>
                <p>• アクセシビリティ対応</p>
                <p>• アニメーション</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartExample;
