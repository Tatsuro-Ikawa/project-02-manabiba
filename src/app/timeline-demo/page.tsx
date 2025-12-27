"use client";

import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Assignment,
  Event,
  TrendingUp,
  School,
  Star,
  Flag,
  Lightbulb,
} from '@mui/icons-material';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import ProgressIndicator from '@/components/GoalSettingSMART/ProgressIndicator';
import { SMARTStep } from '@/types/goals';

const TimelineDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState<SMARTStep>('measurable');

  // 成長の軌跡データ
  const journeyData = [
    {
      date: '2024年1月',
      title: '自己理解フェーズ完了',
      description: '価値観と強みの分析を完了し、自分の核となる価値を明確化しました。',
      status: 'completed',
      icon: <Lightbulb />,
      color: 'success',
    },
    {
      date: '2024年2月',
      title: 'SMART目標設定',
      description: '具体的、測定可能、達成可能、関連性、期限設定の5つの観点から目標を設定しました。',
      status: 'completed',
      icon: <Assignment />,
      color: 'success',
    },
    {
      date: '2024年3月',
      title: 'PDCAサイクル開始',
      description: '計画→実行→確認→改善のサイクルを開始。週次での振り返りを実施中。',
      status: 'in-progress',
      icon: <TrendingUp />,
      color: 'primary',
    },
    {
      date: '2024年4月',
      title: '中間評価・軌道修正',
      description: '進捗を評価し、必要に応じて目標や計画を調整します。',
      status: 'upcoming',
      icon: <Event />,
      color: 'grey',
    },
    {
      date: '2024年6月',
      title: '最終目標達成',
      description: '設定した目標の達成を目指します。達成後は次のステップへ。',
      status: 'upcoming',
      icon: <Flag />,
      color: 'grey',
    },
  ];

  // 学習ステップデータ
  const learningSteps = [
    {
      time: '第1週',
      title: '基礎理解',
      description: 'コーチングの基本概念と自己理解ワークの実施',
      status: 'completed',
    },
    {
      time: '第2週',
      title: '目標設定',
      description: 'SMARTフレームワークを使った目標の明確化',
      status: 'completed',
    },
    {
      time: '第3週',
      title: '行動計画',
      description: '具体的なアクションプランの作成と実行開始',
      status: 'in-progress',
    },
    {
      time: '第4週',
      title: '振り返り',
      description: '進捗の確認と改善点の洗い出し',
      status: 'upcoming',
    },
  ];

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', p: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            📅 タイムライン表示デモ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            進捗状況とステップを時系列で可視化
          </Typography>
        </Box>

        {/* SMART目標のプログレスインジケーター */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              🎯 SMART目標設定プログレス
            </Typography>
            <ProgressIndicator currentStep={currentStep} />
            <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(['specific', 'measurable', 'relevant', 'timebound'] as SMARTStep[]).map((step) => (
                <Chip
                  key={step}
                  label={step.toUpperCase()}
                  color={currentStep === step ? 'primary' : 'default'}
                  onClick={() => setCurrentStep(step)}
                  variant={currentStep === step ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* メインタイムライン：成長の軌跡 */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              🌱 成長の軌跡タイムライン
            </Typography>
            <Timeline position="alternate">
              {journeyData.map((item, index) => (
                <TimelineItem key={index}>
                  <TimelineOppositeContent color="text.secondary">
                    <Typography variant="body2">{item.date}</Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color={item.color as any} variant={item.status === 'completed' ? 'filled' : 'outlined'}>
                      {item.icon}
                    </TimelineDot>
                    {index < journeyData.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Card 
                      sx={{ 
                        bgcolor: item.status === 'completed' ? 'success.50' : 
                               item.status === 'in-progress' ? 'primary.50' : 'grey.50',
                        border: '1px solid',
                        borderColor: item.status === 'completed' ? 'success.200' :
                                   item.status === 'in-progress' ? 'primary.200' : 'grey.200'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" component="h3">
                            {item.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              item.status === 'completed' ? '完了' :
                              item.status === 'in-progress' ? '進行中' : '予定'
                            }
                            color={
                              item.status === 'completed' ? 'success' :
                              item.status === 'in-progress' ? 'primary' : 'default'
                            }
                            sx={{ ml: 2 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>

        {/* 学習ステップタイムライン */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              📚 学習ステップタイムライン
            </Typography>
            <Timeline position="right">
              {learningSteps.map((step, index) => (
                <TimelineItem key={index}>
                  <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2 }}>
                    <Typography variant="body2" fontWeight="bold">{step.time}</Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot 
                      color={
                        step.status === 'completed' ? 'success' :
                        step.status === 'in-progress' ? 'primary' : 'grey'
                      }
                    >
                      {step.status === 'completed' ? <CheckCircle /> : 
                       step.status === 'in-progress' ? <Schedule /> : 
                       <RadioButtonUnchecked />}
                    </TimelineDot>
                    {index < learningSteps.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" component="h3">
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>

        {/* シンプルなステッパー風タイムライン */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              📊 シンプルステッパー
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              {['自己理解', '目標設定', '計画策定', '実行', '評価'].map((step, index) => (
                <React.Fragment key={step}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: index < 3 ? 'success.main' : index === 3 ? 'primary.main' : 'grey.300',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 18,
                      }}
                    >
                      {index < 3 ? <CheckCircle /> : index + 1}
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', maxWidth: 80 }}>
                      {step}
                    </Typography>
                    <Chip
                      size="small"
                      label={index < 3 ? '完了' : index === 3 ? '進行中' : '未着手'}
                      color={index < 3 ? 'success' : index === 3 ? 'primary' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  {index < 4 && (
                    <Box
                      sx={{
                        flex: 1,
                        height: 4,
                        bgcolor: index < 3 ? 'success.main' : 'grey.300',
                        minWidth: 40,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'white', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            💡 タイムライン機能について
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            このページでは以下のタイムライン表示パターンを実装しています：
          </Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>SMART目標プログレスインジケーター</strong>: 現在のステップを視覚的に表示
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>成長の軌跡タイムライン</strong>: 時系列で成果を表示（交互配置）
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>学習ステップタイムライン</strong>: シンプルな縦型タイムライン
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>シンプルステッパー</strong>: 横並びのステップ表示
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineDemo;


