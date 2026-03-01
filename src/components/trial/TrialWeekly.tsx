'use client';

export default function TrialWeekly() {
  return (
    <div className="trial-tab-content">
      <div className="trial-weekly-container">
        <h2>週</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          週次の振り返り・計画（モック表示）
        </p>
        <div className="action-sub-section">
          <h3>今週の振り返り</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>週次質問への回答エリア</p>
        </div>
        <div className="action-sub-section">
          <h3>来週の目標</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>来週の目標設定エリア</p>
        </div>
      </div>
    </div>
  );
}
