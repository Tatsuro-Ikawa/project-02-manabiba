'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const handleTryFree = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/mypage?tab=self-understanding');
  };

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <div className="brand">人生学び場 こころ道場</div>
          <nav className="nav-links">
            <a href="#personal">私の物語</a>
            <a href="#prospect">あなたの物語</a>
            <a href="#problem">問題</a>
            <a href="#product">解決</a>
            <a href="#proof">証拠</a>
            <a href="#features">機能</a>
          </nav>
          {user ? (
            <button 
              className="btn brand" 
              onClick={() => router.push('/mypage?tab=self-understanding')}
            >
              マイページ
            </button>
          ) : (
            <button 
              className="btn brand" 
              onClick={() => router.push('/login')}
            >
              ログイン
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="panel">
            <h1>一度きりの人生。今の自分のままの人生で終わりたいですか？</h1>
            <p>AI×セルフマネジメント×伴走コーチングで、「なりたい自分」へ確実に歩むための場。</p>
            <div className="hero-cta">
              <button 
                className="btn brand" 
                onClick={handleTryFree}
              >
                無料でトライしてみる
              </button>
              <button 
                className="btn ghost" 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                機能を見る
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="personal">
        <div className="container">
          <h2 className="section">対象者の物語</h2>
          <div className="panel personal">
            <h3 className="text-xl font-semibold mb-4">🎯 願望実現型の方</h3>
            <p className="mb-4">
              「やりたいことがあるのになかなか実現できない。でも、大丈夫、まず、やりたいという意欲そのものが達成に向けた一番のこころのエネルギーだからです。」
            </p>
            <p className="mb-6">
              こころ道場では、まず、自分のやりたいことは何かをさらに明確にしていくことから始めます。今、やりたいと思っていること、あるいは実際に取り組んでいるがなかなか実現しないということをリストアップします。
            </p>
            
            <h3 className="text-xl font-semibold mb-4">🔧 課題解決型の方</h3>
            <p className="mb-4">
              「今の現状に不満や悩みがある。現在の問題を解決したい。」
            </p>
            <p className="mb-4">
              初心者ほど「自分の悩みを言語化できない」ため、以下のようなカテゴリを提示します：
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>人間関係（職場、家族、友人など）</li>
              <li>自己評価（劣等感、自己否定、完璧主義など）</li>
              <li>感情（不安、怒り、悲しみ、やる気の低下など）</li>
              <li>行動パターン（やめられない癖、逃げる、先延ばしなど）</li>
              <li>過去の出来事（トラウマ的体験、後悔など）</li>
            </ul>
            
            <p className="text-center text-lg font-medium text-blue-600">
              どちらのタイプでも、まずはテーマを明確にして、具体的な目標設定に進みましょう。
            </p>
          </div>
        </div>
      </section>

      <section id="prospect">
        <div className="container">
          <h2 className="section">対象者の物語（Prospect）</h2>
          <p className="lead">あなたは、どの状態に近いですか？</p>
          <div className="grid">
            <div className="card">
              <span className="badge">目標達成</span>
              <h3>目標はあるのに、続かない／実現しない</h3>
              <p>やる気の波、方法の迷い、障害の克服でつまずきがち。</p>
              <ul className="clean">
                <li>目標のSMART化</li>
                <li>差分の明確化 → 行動化</li>
                <li>週次スプリントで習慣化</li>
              </ul>
            </div>
            {/* 現状変革と自己発見のカードは一時的に非表示
            <div className="card">
              <span className="badge">現状変革</span>
              <h3>現状を変えたいのに、変えられない</h3>
              <p>課題は見えているが、優先順位や道筋が曖昧。</p>
              <ul className="clean">
                <li>緊急度×重要度で整理</li>
                <li>インパクト×実現可能性で選定</li>
                <li>短期/中期/長期へ配置</li>
              </ul>
            </div>
            <div className="card">
              <span className="badge">自己発見</span>
              <h3>モヤモヤが晴れず、方向が定まらない</h3>
              <p>価値観・強みの外在化から、自己理解を再構築。</p>
              <ul className="clean">
                <li>価値観カード／ジャーナリング</li>
                <li>第三者視点・未来からの手紙</li>
                <li>環境とのギャップ可視化</li>
              </ul>
            </div>
            */}
          </div>
          <div className="spacer"></div>
          <div className="center">
            <button 
              className="btn brand" 
              onClick={handleTryFree}
            >
              無料でトライしてみる
            </button>
          </div>
        </div>
      </section>

      <section id="problem" className="problem">
        <div className="container">
          <h2 className="section">問題の物語（Problem）</h2>
          <div className="panel">
            <p>
              私たちは常に、親や組織や社会が示す「あるべき姿」にさらされ、それに従うように教育され、無意識に刷り込まれています。一人一人は皆ちがうのに、同じような生き方を強制され、同調圧力に従わされてしまう。
            </p>
            <p>
              本当は「自分の価値観」を見つけ、それを表現することで、世の中に貢献できるはずなのに……その機会を逃し、気づかぬうちに人生を終えてしまう。<strong>それこそが、最大の損失です。</strong>
            </p>
            <div className="loss">
              アンカーポイント：いま変わらなければ、失われるのは時間・機会・自己肯定感・人とのつながり・健康。<br />
              変わることで得られるのは、自己実現・価値提供・収入の質・関係性の深まり・生きがいです。
            </div>
          </div>
        </div>
      </section>

      <section id="product">
        <div className="container">
          <h2 className="section">解決の物語（Product）</h2>
          <p className="lead">「なりたい自分」へ至るプロセスを、AIと伴走コーチングで確実に。</p>
          <div className="steps">
            <div className="step">
              <div className="num">① 現状把握</div>
              <div>AI診断・価値観/強み可視化・Zoom深掘り。</div>
            </div>
            <div className="step">
              <div className="num">② 目標設定</div>
              <div>SMART化、指標設計、コミットメント。</div>
            </div>
            <div className="step">
              <div className="num">③ 計画策定</div>
              <div>優先順位付け、スプリント計画。</div>
            </div>
            <div className="step">
              <div className="num">④ 実行・習慣化</div>
              <div>デイリーチェックイン、振り返りと改善。</div>
            </div>
          </div>
        </div>
      </section>

      <section id="proof">
        <div className="container">
          <h2 className="section">証拠の物語（Proof）</h2>
          <div className="quotes">
            <div className="qcard">
              <div>「こころのモヤモヤが晴れて、やっと"やりたいこと"に気づけました。」</div>
              <div className="who">— Cコース参加者</div>
            </div>
            <div className="qcard">
              <div>「目標はあったけど続かなかった。3か月で習慣になり、初めて実現できました。」</div>
              <div className="who">— Aコース参加者</div>
            </div>
            <div className="qcard">
              <div>「現状を変える優先順位が見えたことで、迷いが減り、行動が進みました。」</div>
              <div className="who">— Bコース参加者</div>
            </div>
          </div>
          <p className="small center" style={{ marginTop: '10px' }}>
            ※ 実際のLPではモニター様のご承諾の上、実名/年代/職業などを記載。
          </p>
        </div>
      </section>

      <section id="features">
        <div className="container">
          <h2 className="section">機能紹介</h2>
          <p className="lead">自己理解から目標達成まで、あなたの成長をサポートする機能</p>
          <div className="steps">
            <div className="step">
              <div className="num">① 自己理解</div>
              <div>AI診断・価値観/強み可視化・自己分析。</div>
            </div>
            <div className="step">
              <div className="num">② 目標設定</div>
              <div>SMART化、指標設計、コミットメント。</div>
            </div>
            <div className="step">
              <div className="num">③ 計画策定</div>
              <div>優先順位付け、スプリント計画。</div>
            </div>
            <div className="step">
              <div className="num">④ 実行・習慣化</div>
              <div>デイリーチェックイン、振り返りと改善。</div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="container">
          <h2 className="section">決断（今が、その時）— 無料で始めよう</h2>
          <div className="pricing">
            <div className="price" style={{ borderWidth: '2px', borderColor: '#bcd1ff' }}>
              <h3>無料トライ</h3>
              <div className="yen">無料 <small>/ 月</small></div>
              <ul className="clean">
                <li>AI簡易診断・日次チェックイン</li>
                <li>基本的な自己理解機能</li>
                <li>PDCA日記</li>
                <li>目標設定・管理</li>
              </ul>
              <div className="cta">
                <button 
                  className="btn brand" 
                  onClick={handleTryFree}
                >
                  無料で始める
                </button>
              </div>
            </div>
            <div className="price">
              <h3>スタンダード</h3>
              <div className="yen">1,320円 <small>/ 月</small></div>
              <ul className="clean">
                <li>AI診断＋セルフマネジメント</li>
                <li>月1回のZoomグループ面談</li>
                <li>行動プランの自動提案</li>
                <li>Coming Soon</li>
              </ul>
              <div className="cta">
                <button 
                  className="btn ghost" 
                  disabled
                >
                  準備中
                </button>
              </div>
            </div>
            <div className="price">
              <h3>プレミアム</h3>
              <div className="yen">6,600円 <small>/ 月</small></div>
              <ul className="clean">
                <li>個別コーチング伴走（回数設計）</li>
                <li>専用ダッシュボード・進捗レビュー</li>
                <li>優先サポート</li>
                <li>Coming Soon</li>
              </ul>
              <div className="cta">
                <button 
                  className="btn ghost" 
                  disabled
                >
                  準備中
                </button>
              </div>
            </div>
          </div>
          <p className="center small" style={{ marginTop: '10px' }}>
            まずは無料で体験して、あなたの変化を実感してください。
          </p>
        </div>
      </section>

      <footer>
        <div className="container center small">© 2025 人生学び場 こころ道場</div>
      </footer>
    </>
  );
};

export default LandingPage;
