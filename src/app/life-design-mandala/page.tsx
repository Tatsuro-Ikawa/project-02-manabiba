"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import {
  Work,
  FavoriteBorder,
  School,
  AttachMoney,
  SportsBasketball,
  People,
  Spa,
  VolunteerActivism,
  Edit,
  Add,
  CheckCircle,
} from '@mui/icons-material';

// 人生の8つの領域
interface LifeArea {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  goals: string[];
  description: string;
}

const initialLifeAreas: LifeArea[] = [
  {
    id: 'career',
    name: 'キャリア・仕事',
    icon: <Work />,
    color: '#3f51b5',
    goals: ['プロジェクトリーダーになる', 'スキル認定を取得する'],
    description: '仕事での成長と貢献',
  },
  {
    id: 'health',
    name: '健康・ウェルネス',
    icon: <FavoriteBorder />,
    color: '#f44336',
    goals: ['週3回の運動習慣', '理想体重の達成'],
    description: '心身の健康維持',
  },
  {
    id: 'learning',
    name: '学習・成長',
    icon: <School />,
    color: '#ff9800',
    goals: ['新しい言語を学ぶ', '月2冊の読書'],
    description: '継続的な学びと成長',
  },
  {
    id: 'finance',
    name: '財務・経済',
    icon: <AttachMoney />,
    color: '#4caf50',
    goals: ['貯蓄目標の達成', '投資知識の習得'],
    description: '経済的な安定と成長',
  },
  {
    id: 'hobby',
    name: '趣味・娯楽',
    icon: <SportsBasketball />,
    color: '#9c27b0',
    goals: ['新しい趣味を始める', '週末の余暇を充実'],
    description: '人生を楽しむ時間',
  },
  {
    id: 'relationships',
    name: '人間関係・家族',
    icon: <People />,
    color: '#00bcd4',
    goals: ['家族との時間を増やす', '友人との定期的な交流'],
    description: '大切な人との絆',
  },
  {
    id: 'spiritual',
    name: '精神性・内面',
    icon: <Spa />,
    color: '#607d8b',
    goals: ['瞑想の習慣化', '自己理解を深める'],
    description: '心の平安と成長',
  },
  {
    id: 'contribution',
    name: '社会貢献',
    icon: <VolunteerActivism />,
    color: '#795548',
    goals: ['ボランティア活動参加', '地域活動への貢献'],
    description: '社会への貢献と還元',
  },
];

const LifeDesignMandala: React.FC = () => {
  const [centerGoal, setCenterGoal] = useState('充実した人生を送り、自分らしく輝く');
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(initialLifeAreas);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [newGoal, setNewGoal] = useState('');

  const handleEditArea = (area: LifeArea) => {
    setSelectedArea(area);
    setEditDialogOpen(true);
    setNewGoal('');
  };

  const handleAddGoal = () => {
    if (selectedArea && newGoal.trim()) {
      const updatedAreas = lifeAreas.map(area =>
        area.id === selectedArea.id
          ? { ...area, goals: [...area.goals, newGoal.trim()] }
          : area
      );
      setLifeAreas(updatedAreas);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (areaId: string, goalIndex: number) => {
    const updatedAreas = lifeAreas.map(area =>
      area.id === areaId
        ? { ...area, goals: area.goals.filter((_, i) => i !== goalIndex) }
        : area
    );
    setLifeAreas(updatedAreas);
  };

  // 円形配置の計算
  const getPosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const radius = 35; // パーセント単位
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x, y };
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', p: 4 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            🌸 Life Design Mandala
          </Typography>
          <Typography variant="body1" color="text.secondary">
            人生の8つの領域をバランスよく育て、理想の人生をデザインしよう
          </Typography>
        </Box>

        {/* 曼荼羅ビュー */}
        <Card sx={{ mb: 4, bgcolor: 'white', overflow: 'visible' }}>
          <CardContent>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                paddingTop: '100%', // 正方形を作る
                minHeight: 600,
              }}
            >
              {/* 中央の目標 */}
              <Paper
                elevation={8}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '20%',
                  minWidth: 200,
                  aspectRatio: '1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'white',
                  p: 3,
                  zIndex: 10,
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translate(-50%, -50%) scale(1.05)',
                    transition: 'transform 0.3s ease',
                  },
                }}
                onClick={() => {
                  const newGoal = prompt('中心の目標を編集', centerGoal);
                  if (newGoal) setCenterGoal(newGoal);
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    人生の中心目標
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                    {centerGoal}
                  </Typography>
                  <Edit sx={{ mt: 1, fontSize: 16 }} />
                </Box>
              </Paper>

              {/* 8つの人生領域 */}
              {lifeAreas.map((area, index) => {
                const pos = getPosition(index, lifeAreas.length);
                return (
                  <Paper
                    key={area.id}
                    elevation={4}
                    sx={{
                      position: 'absolute',
                      top: `${pos.y}%`,
                      left: `${pos.x}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '22%',
                      minWidth: 180,
                      minHeight: 200,
                      borderRadius: 3,
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: 'white',
                      border: `3px solid ${area.color}`,
                      '&:hover': {
                        transform: 'translate(-50%, -50%) scale(1.05)',
                        transition: 'transform 0.3s ease',
                        boxShadow: 8,
                      },
                    }}
                    onClick={() => handleEditArea(area)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: area.color,
                          color: 'white',
                          mr: 1,
                        }}
                      >
                        {area.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {area.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {area.description}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {area.goals.slice(0, 2).map((goal, idx) => (
                        <Chip
                          key={idx}
                          label={goal}
                          size="small"
                          sx={{
                            mb: 0.5,
                            mr: 0.5,
                            fontSize: '0.7rem',
                            maxWidth: '100%',
                            height: 'auto',
                            '& .MuiChip-label': {
                              whiteSpace: 'normal',
                              padding: '4px 8px',
                            },
                          }}
                        />
                      ))}
                      {area.goals.length > 2 && (
                        <Chip
                          label={`+${area.goals.length - 2}more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* 詳細リスト */}
        <Grid container spacing={3}>
          {lifeAreas.map((area) => (
            <Grid item xs={12} sm={6} md={3} key={area.id}>
              <Card sx={{ height: '100%', border: `2px solid ${area.color}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: area.color,
                        color: 'white',
                        mr: 1,
                      }}
                    >
                      {area.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {area.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    {area.description}
                  </Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      目標リスト:
                    </Typography>
                    {area.goals.map((goal, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: area.color, mr: 1 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {goal}
                        </Typography>
                      </Box>
                    ))}
                    {area.goals.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        目標を追加してください
                      </Typography>
                    )}
                  </Box>
                  <Button
                    startIcon={<Edit />}
                    size="small"
                    onClick={() => handleEditArea(area)}
                    sx={{ mt: 2 }}
                    variant="outlined"
                    fullWidth
                  >
                    編集
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 使い方ガイド */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <School sx={{ mr: 1 }} />
              Life Design Mandalaの使い方
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    1. 中心目標の設定
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    中央の円をクリックして、あなたの人生の最も大きな目標や理想の状態を設定します。
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    2. 8つの領域に目標設定
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    各領域のカードをクリックして、具体的な目標を追加します。バランスを意識しましょう。
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    3. 定期的な振り返り
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    月に一度、進捗を確認し、必要に応じて目標を調整します。バランスが取れているか確認しましょう。
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {selectedArea && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: selectedArea.color,
                    color: 'white',
                    mr: 2,
                  }}
                >
                  {selectedArea.icon}
                </Box>
                {selectedArea.name}
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedArea && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedArea.description}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                現在の目標:
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedArea.goals.map((goal, idx) => (
                  <Chip
                    key={idx}
                    label={goal}
                    onDelete={() => handleRemoveGoal(selectedArea.id, idx)}
                    sx={{ m: 0.5 }}
                  />
                ))}
                {selectedArea.goals.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    まだ目標が設定されていません
                  </Typography>
                )}
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                新しい目標を追加:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="例: 週3回の運動習慣"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddGoal();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddGoal}
                  disabled={!newGoal.trim()}
                >
                  追加
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LifeDesignMandala;


