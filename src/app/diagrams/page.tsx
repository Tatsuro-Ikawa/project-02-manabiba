"use client";

import React, { useState } from 'react';
import { 
  Tabs, 
  Tab, 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Button,
  ButtonGroup
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimelineIcon from '@mui/icons-material/Timeline';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`diagram-tabpanel-${index}`}
      aria-labelledby={`diagram-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// PlantUMLコードをPlantUML Serverで表示可能なURLに変換
function encodePlantUML(plantUmlCode: string): string {
  // UTF-8文字列を正しくBase64エンコード（日本語対応）
  // 1. UTF-8文字列をバイト配列に変換
  // 2. Base64エンコード
  try {
    // TextEncoderを使用してUTF-8バイト列に変換
    const utf8Bytes = new TextEncoder().encode(plantUmlCode);
    
    // バイト配列を文字列に変換してからBase64エンコード
    let binaryString = '';
    utf8Bytes.forEach(byte => {
      binaryString += String.fromCharCode(byte);
    });
    
    const base64 = btoa(binaryString);
    
    // Kroki.ioサービスを使用してSVG画像を生成
    return `https://kroki.io/plantuml/svg/${base64}`;
  } catch (error) {
    console.error('PlantUMLエンコードエラー:', error);
    return '';
  }
}

const DiagramsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showCode, setShowCode] = useState<{[key: string]: boolean}>({});

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleCode = (diagramId: string) => {
    setShowCode(prev => ({
      ...prev,
      [diagramId]: !prev[diagramId]
    }));
  };

  // コンポーネント図
  const componentDiagrams = [
    {
      title: 'PDCAデータ入力処理のコンポーネント図',
      path: 'documents/diagrams/component/01_pdca_input_components.puml',
      code: `@startuml
title PDCAデータ入力処理のコンポーネント図

package "Frontend Components" {
  
  component "MyPage" as MP {
    [handlePDCAInput]
    [getCurrentValue]
    [showPDCAModal state]
    [pdcaType state]
    [handlePDCASuccess]
    [forceUpdate state]
  }
  
  component "PDCAInputModal" as PIM {
    [handleSubmit]
    [handleClose]
    [value state]
    [error state]
    [isSubmitting state]
    [onSuccess callback]
  }
  
  component "AuthGuard" as AG {
    [認証チェック]
    [リダイレクト処理]
  }
  
  component "CreatePageModal" as CPM {
    [プロフィール作成]
  }
}

package "Custom Hooks" {
  
  component "usePDCA" as UPH {
    [updatePDCA]
    [currentPDCA state]
    [selectedDate state]
    [loading state]
    [error state]
    [getInputStatus]
    [fetchPDCA]
    [強制再描画ロジック]
  }
  
  component "useAuth" as UA {
    [user state]
    [signOut]
  }
  
  component "useUserProfile" as UUP {
    [profile state]
    [createProfile]
  }
}

package "Firebase Services" {
  
  component "Firestore" as FS {
    [updatePDCAItem]
    [getPDCAEntry]
    [getUserPDCAEntries]
    [createPDCAEntry]
    [updatePDCAEntry]
  }
  
  component "Authentication" as AUTH {
    [Google Sign-In]
    [Sign Out]
  }
}

MP --> PIM : モーダル表示/非表示
MP --> UPH : PDCAデータ取得/更新
MP --> UA : 認証状態取得
MP --> UUP : プロフィール情報取得

PIM --> UPH : updatePDCA呼び出し
PIM --> MP : onClose/onSuccessコールバック

UPH --> FS : Firestore操作
UA --> AUTH : 認証操作
UUP --> FS : プロフィール操作

@enduml`
    },
    {
      title: 'PDCAデータフロー図',
      path: 'documents/diagrams/component/02_pdca_data_flow.puml',
      description: 'PDCAデータの流れを示す図'
    },
    {
      title: '日付選択コンポーネント図',
      path: 'documents/diagrams/component/03_date_selection_components.puml',
      description: '日付選択に関連するコンポーネント'
    }
  ];

  // シーケンス図
  const sequenceDiagrams = [
    {
      title: 'マイページ初期化シーケンス図',
      path: 'documents/diagrams/sequence/01_my_page_initialization.puml',
      code: `@startuml
title マイページ初期化からマイページ作成までのシーケンス図

actor User as U
participant "MyPage" as MP
participant "AuthGuard" as AG
participant "useUserProfile" as UP
participant "useAuth" as UA
participant "Firestore" as FS
participant "CreatePageModal" as CPM
participant "usePDCA" as PDCA

== 初期化フェーズ ==
U -> MP: マイページアクセス
MP -> AG: 認証チェック
AG -> UA: ユーザー情報取得
UA -> AG: ユーザー情報返却

alt 未認証の場合
    AG -> MP: ホームページにリダイレクト
    MP -> U: ホームページ表示
else 認証済みの場合
    AG -> MP: 認証OK
    MP -> UP: プロフィール情報取得
    UP -> FS: getUserProfile(uid)
    FS -> UP: プロフィール情報返却
    
    alt プロフィールが存在しない場合
        UP -> MP: プロフィールなし
        MP -> U: マイページ作成画面表示
        U -> MP: 「マイページを作成」ボタン押下
        MP -> CPM: モーダル表示
        U -> CPM: プロフィール情報入力
        U -> CPM: 「作成する」ボタン押下
        
        == プロフィール作成フェーズ ==
        CPM -> UP: createProfile(profileData)
        UP -> FS: createUserProfile(profileData)
        FS -> UP: 作成完了
        UP -> CPM: 作成完了通知
        CPM -> MP: onSuccess()呼び出し
        MP -> U: ローディング画面表示
        
        == 完了フェーズ ==
        MP -> U: 完了画面表示
        U -> MP: 「マイページを表示」ボタン押下
        MP -> U: ページ再読み込み
        MP -> UP: プロフィール情報再取得
        UP -> FS: getUserProfile(uid)
        FS -> UP: プロフィール情報返却
        UP -> MP: プロフィール存在確認
        MP -> PDCA: PDCA情報初期化
        PDCA -> FS: getPDCAEntry(uid, date)
        FS -> PDCA: PDCA情報返却
        MP -> U: マイページ表示
        
    else プロフィールが存在する場合
        UP -> MP: プロフィール存在
        MP -> PDCA: PDCA情報初期化
        PDCA -> FS: getPDCAEntry(uid, date)
        FS -> PDCA: PDCA情報返却
        MP -> U: マイページ表示
    end
end

@enduml`
    },
    {
      title: 'PDCAデータ入力フロー',
      path: 'documents/diagrams/sequence/03_pdca_input_flow.puml',
      description: 'PDCAデータ入力のシーケンス'
    },
    {
      title: '日付選択フロー',
      path: 'documents/diagrams/sequence/05_date_selection_flow.puml',
      description: '日付選択のシーケンス'
    }
  ];

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'grey.50', p: 4 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            📊 システムダイアグラム集
          </Typography>
          <Typography variant="body1" color="text.secondary">
            プロジェクトのアーキテクチャとデータフローを可視化
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>表示について：</strong> 
          ダイアグラムはPlantUML形式で作成されています。
          画像が表示されない場合は、ブラウザのセキュリティ設定を確認してください。
        </Alert>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="diagram tabs">
              <Tab 
                label="コンポーネント図" 
                icon={<AccountTreeIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="シーケンス図" 
                icon={<TimelineIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              🔷 コンポーネント図
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              システムを構成するコンポーネントとその関係性を示します
            </Typography>
            
            {componentDiagrams.map((diagram, index) => {
              const diagramId = `component-${index}`;
              return (
                <Accordion key={index} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{diagram.title}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        📁 {diagram.path}
                      </Typography>
                      {diagram.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {diagram.description}
                        </Typography>
                      )}
                      {diagram.code ? (
                        <Box>
                          <ButtonGroup sx={{ mb: 2 }} size="small">
                            <Button 
                              variant={!showCode[diagramId] ? "contained" : "outlined"}
                              onClick={() => setShowCode(prev => ({ ...prev, [diagramId]: false }))}
                              startIcon={<ImageIcon />}
                            >
                              ダイアグラム
                            </Button>
                            <Button 
                              variant={showCode[diagramId] ? "contained" : "outlined"}
                              onClick={() => setShowCode(prev => ({ ...prev, [diagramId]: true }))}
                              startIcon={<CodeIcon />}
                            >
                              PlantUMLコード
                            </Button>
                          </ButtonGroup>

                          {!showCode[diagramId] ? (
                            <Box sx={{ 
                              bgcolor: 'white', 
                              p: 2, 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.300'
                            }}>
                              <img 
                                src={encodePlantUML(diagram.code)}
                                alt={diagram.title}
                                style={{ maxWidth: '100%', height: 'auto' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const errorMsg = document.createElement('div');
                                  errorMsg.innerHTML = '⚠️ ダイアグラムの読み込みに失敗しました。PlantUMLコードタブでコードを確認できます。';
                                  errorMsg.style.padding = '20px';
                                  errorMsg.style.color = '#d32f2f';
                                  target.parentNode?.appendChild(errorMsg);
                                }}
                              />
                            </Box>
                          ) : (
                            <Box sx={{ 
                              bgcolor: '#1e1e1e', 
                              color: '#d4d4d4',
                              p: 3, 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.700',
                              overflowX: 'auto',
                              fontFamily: 'Consolas, Monaco, monospace',
                              fontSize: '14px',
                              lineHeight: 1.6
                            }}>
                              <pre style={{ margin: 0 }}>{diagram.code}</pre>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Alert severity="warning">
                          このダイアグラムのコードはまだ実装されていません
                        </Alert>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              ⏱️ シーケンス図
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              処理の流れと各コンポーネント間のやり取りを時系列で示します
            </Typography>
            
            {sequenceDiagrams.map((diagram, index) => {
              const diagramId = `sequence-${index}`;
              return (
                <Accordion key={index} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{diagram.title}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        📁 {diagram.path}
                      </Typography>
                      {diagram.description && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {diagram.description}
                        </Typography>
                      )}
                      {diagram.code ? (
                        <Box>
                          <ButtonGroup sx={{ mb: 2 }} size="small">
                            <Button 
                              variant={!showCode[diagramId] ? "contained" : "outlined"}
                              onClick={() => setShowCode(prev => ({ ...prev, [diagramId]: false }))}
                              startIcon={<ImageIcon />}
                            >
                              ダイアグラム
                            </Button>
                            <Button 
                              variant={showCode[diagramId] ? "contained" : "outlined"}
                              onClick={() => setShowCode(prev => ({ ...prev, [diagramId]: true }))}
                              startIcon={<CodeIcon />}
                            >
                              PlantUMLコード
                            </Button>
                          </ButtonGroup>

                          {!showCode[diagramId] ? (
                            <Box sx={{ 
                              bgcolor: 'white', 
                              p: 2, 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.300',
                              overflowX: 'auto'
                            }}>
                              <img 
                                src={encodePlantUML(diagram.code)}
                                alt={diagram.title}
                                style={{ maxWidth: '100%', height: 'auto' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const errorMsg = document.createElement('div');
                                  errorMsg.innerHTML = '⚠️ ダイアグラムの読み込みに失敗しました。PlantUMLコードタブでコードを確認できます。';
                                  errorMsg.style.padding = '20px';
                                  errorMsg.style.color = '#d32f2f';
                                  target.parentNode?.appendChild(errorMsg);
                                }}
                              />
                            </Box>
                          ) : (
                            <Box sx={{ 
                              bgcolor: '#1e1e1e', 
                              color: '#d4d4d4',
                              p: 3, 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.700',
                              overflowX: 'auto',
                              fontFamily: 'Consolas, Monaco, monospace',
                              fontSize: '14px',
                              lineHeight: 1.6
                            }}>
                              <pre style={{ margin: 0 }}>{diagram.code}</pre>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Alert severity="warning">
                          このダイアグラムのコードはまだ実装されていません
                        </Alert>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </TabPanel>
        </Card>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'white', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            📝 ダイアグラムについて
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            これらのダイアグラムは、システムの設計と実装を理解するための重要なドキュメントです。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>ファイル場所：</strong> <code>documents/diagrams/</code>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>フォーマット：</strong> PlantUML (.puml)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DiagramsPage;

