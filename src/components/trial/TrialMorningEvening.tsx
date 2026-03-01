'use client';

export default function TrialMorningEvening() {
  return (
    <div className="trial-tab-content">
      <div className="morning-evening-container">
        <h2>朝・晩</h2>
        <div className="date-nav">
          <button type="button" className="date-nav-btn" aria-label="前の日">‹</button>
          <span className="date-nav-label">YYYY年MM月DD日</span>
          <button type="button" className="date-nav-btn" aria-label="次の日">›</button>
        </div>
        <div className="action-sub-section">
          <h3>朝のアクション</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>朝のチェック項目・記録（モック）</p>
        </div>
        <div className="action-sub-section">
          <h3>晩のアクション</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>晩の振り返り・記録（モック）</p>
        </div>
      </div>
    </div>
  );
}
