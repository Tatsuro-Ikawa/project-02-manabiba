'use client';

import React, { useState } from 'react';
import {
  User,
  Settings,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Heart,
  Share2,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Home,
  BarChart3,
  FileText,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Unlock,
  Key,
  Shield,
  Zap,
  Battery,
  Wifi,
  Bluetooth,
  Camera,
  Video,
  Mic,
  Headphones,
  Speaker,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Grid,
  Columns,
  Rows,
  Layout,
  Sidebar,
  SidebarClose,
  SidebarOpen,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Split,
  Merge,
  Copy,
  Scissors,
  Paperclip,
  Link,
  Link2,
  ExternalLink,
  Bookmark,
  BookmarkPlus,
  Tag,
  Hash,
  AtSign,
  DollarSign,
  Percent,
  Minus,
  Divide,
  Equal,
  PlusCircle,
  MinusCircle,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  MessageCircle2,
  MessageSquare2,
  Send,
  Reply,
  Forward,
  Archive,
  Inbox,
  Outbox,
  Trash,
  Folder,
  FolderOpen,
  FolderPlus,
  File,
  FileText2,
  FilePlus,
  FileMinus,
  FileX,
  FileCheck,
  FileSearch,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FilePdf,
  FileWord,
  FileExcel,
  FilePowerpoint,
  Database,
  HardDrive,
  Server,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Printer,
  Scanner,
  Keyboard,
  Mouse,
  Gamepad2,
  Controller,
  Headset,
  Tv,
  Radio,
  Speaker2,
  Microphone,
  MicrophoneOff,
  VideoOff,
  Video2,
  CameraOff,
  Image,
  ImageOff,
  Music,
  Music2,
  Music3,
  Music4,
  Disc,
  Disc2,
  Disc3,
  Vinyl,
  Guitar,
  Piano,
  Drum,
  Saxophone,
  Trumpet,
  Violin,
  Cello,
  Flute,
  Clarinet,
  Trombone,
  Tuba,
  Accordion,
  Harmonica,
  Ukulele,
  Banjo,
  Mandolin,
  Harp,
  Triangle,
  Tambourine,
  Maracas,
  Bongos,
  Conga,
  Djembe,
  Tabla,
  Sitar,
  Koto,
  Shamisen,
  Erhu,
  Pipa,
  Guzheng,
  Dizi,
  Suona,
  Sheng,
  Pipa2,
  Guzheng2,
  Dizi2,
  Suona2,
  Sheng2,
  Pipa3,
  Guzheng3,
  Dizi3,
  Suona3,
  Sheng3,
  Pipa4,
  Guzheng4,
  Dizi4,
  Suona4,
  Sheng4,
  Pipa5,
  Guzheng5,
  Dizi5,
  Suona5,
  Sheng5,
  Pipa6,
  Guzheng6,
  Dizi6,
  Suona6,
  Sheng6,
  Pipa7,
  Guzheng7,
  Dizi7,
  Suona7,
  Sheng7,
  Pipa8,
  Guzheng8,
  Dizi8,
  Suona8,
  Sheng8,
  Pipa9,
  Guzheng9,
  Dizi9,
  Suona9,
  Sheng9,
  Pipa10,
  Guzheng10,
  Dizi10,
  Suona10,
  Sheng10,
} from 'lucide-react';

// サンプルデータ
const tableData = [
  { id: 1, name: '田中太郎', email: 'tanaka@example.com', role: '管理者', status: 'アクティブ', lastLogin: '2024-01-15' },
  { id: 2, name: '佐藤花子', email: 'sato@example.com', role: 'ユーザー', status: 'アクティブ', lastLogin: '2024-01-14' },
  { id: 3, name: '鈴木一郎', email: 'suzuki@example.com', role: '編集者', status: '非アクティブ', lastLogin: '2024-01-10' },
  { id: 4, name: '高橋美咲', email: 'takahashi@example.com', role: 'ユーザー', status: 'アクティブ', lastLogin: '2024-01-13' },
  { id: 5, name: '伊藤健太', email: 'ito@example.com', role: '管理者', status: 'アクティブ', lastLogin: '2024-01-12' },
];

const listData = [
  { id: 1, title: '自己理解ワークの完了', description: '価値観と強みの分析が完了しました', status: '完了', priority: '高', date: '2024-01-15' },
  { id: 2, title: '目標設定セッション', description: 'SMART目標の設定を行います', status: '進行中', priority: '中', date: '2024-01-16' },
  { id: 3, title: 'PDCAサイクルの実行', description: '計画→実行→確認→改善のサイクル', status: '予定', priority: '高', date: '2024-01-17' },
  { id: 4, title: '週次振り返り', description: '今週の進捗と改善点の確認', status: '予定', priority: '中', date: '2024-01-18' },
  { id: 5, title: '月次目標レビュー', description: '月間目標の達成度評価', status: '予定', priority: '低', date: '2024-01-20' },
];

const TailwindUIExamples: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredTableData = tableData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredListData = listData.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedStatus === 'all' || item.status === selectedStatus)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'アクティブ':
      case '完了':
        return 'bg-green-100 text-green-800 border-green-200';
      case '進行中':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '予定':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '非アクティブ':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高':
        return 'text-red-600';
      case '中':
        return 'text-yellow-600';
      case '低':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tailwind CSS UI 事例</h1>
                <p className="text-gray-600">アイコン、テーブル、リストの実装例</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">すべてのステータス</option>
                <option value="完了">完了</option>
                <option value="進行中">進行中</option>
                <option value="予定">予定</option>
              </select>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>新規追加</span>
            </button>
          </div>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>ユーザー一覧</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <span>ユーザー</span>
                      <SortAsc className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終ログイン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTableData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status === 'アクティブ' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {item.status === '非アクティブ' && <X className="w-3 h-3 mr-1" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{item.lastLogin}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900 p-1 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* リスト */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <List className="w-5 h-5" />
              <span>タスク一覧</span>
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredListData.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status === '完了' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {item.status === '進行中' && <Clock className="w-3 h-3 mr-1" />}
                        {item.status === '予定' && <Calendar className="w-3 h-3 mr-1" />}
                        {item.status}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                        <Target className="w-3 h-3 inline mr-1" />
                        {item.priority}優先度
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>予定時間: 2時間</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* アイコンギャラリー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>アイコンギャラリー</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {[
              User, Settings, Bell, Search, Plus, Edit, Trash2, Eye,
              Download, Upload, Calendar, Clock, Target, TrendingUp,
              CheckCircle, AlertCircle, Info, Star, Heart, Share2,
              Filter, SortAsc, SortDesc, ChevronDown, ChevronRight,
              Menu, X, Home, BarChart3, FileText, Users, Mail, Phone
            ].map((Icon, index) => (
              <div
                key={index}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
              >
                <Icon className="w-6 h-6 text-gray-600 mb-2" />
                <span className="text-xs text-gray-500 text-center">{Icon.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12%</span>
              <span className="text-gray-500 ml-1">先月比</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">完了タスク</p>
                <p className="text-2xl font-bold text-gray-900">89</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8%</span>
              <span className="text-gray-500 ml-1">先週比</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">進行中</p>
                <p className="text-2xl font-bold text-gray-900">23</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-blue-600">+5%</span>
              <span className="text-gray-500 ml-1">昨日比</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">達成率</p>
                <p className="text-2xl font-bold text-gray-900">94%</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+2%</span>
              <span className="text-gray-500 ml-1">目標比</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindUIExamples;
