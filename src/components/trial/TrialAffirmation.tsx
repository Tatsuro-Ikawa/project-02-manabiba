'use client';

export default function TrialAffirmation() {
  return (
    <div className="trial-tab-content">
      <div className="affirmation-container">
        <h2>アファメーション</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          毎日唱える宣言文を作成・編集します。（モック表示）
        </p>
        <div style={{ color: 'var(--color-text-primary)', lineHeight: 1.8 }}>
          <div className="action-sub-section">
            <h3>今日のアファメーション</h3>
            <p>ここにアファメーション本文が表示されます。編集は「編集」タブから行えます。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
