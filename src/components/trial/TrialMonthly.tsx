'use client';

export default function TrialMonthly() {
  return (
    <div className="trial-tab-content">
      <div className="trial-monthly-container">
        <h2>月</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          月次の振り返り・計画（モック表示）
        </p>
        <div className="action-sub-section">
          <h3>今月の振り返り</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>月次質問への回答エリア</p>
        </div>
        <div className="action-sub-section">
          <h3>来月の目標</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>来月の目標設定エリア</p>
        </div>
      </div>
    </div>
  );
}
