'use client';

import { useId } from 'react';
import type { SaveStatus } from '@/hooks/useSaveStatusMock';
import {
  ACCESS_SCENARIOS,
  START_PROGRAM_FREE_DAYS,
  START_PROGRAM_NOTICE_DAYS,
  START_PROGRAM_RETENTION_DAYS,
  formatJstDate,
  type AccessScenario,
  type StartProgramAccess,
} from '@/lib/startProgram/accessMock';

const timeFmt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
});

/** 保存の状態（14 §2.2） */
export function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status.kind === 'idle') return null;
  const text =
    status.kind === 'saving'
      ? '保存中…'
      : status.kind === 'offline'
        ? '未送信（通信が戻ったら送ります）'
        : `保存しました ${timeFmt.format(status.at)}`;
  return (
    <span className={`sp-save-status sp-save-status--${status.kind}`} role="status" aria-live="polite">
      <span className="material-symbols-outlined" aria-hidden>
        {status.kind === 'offline' ? 'cloud_off' : status.kind === 'saving' ? 'cloud_sync' : 'cloud_done'}
      </span>
      {text}
    </span>
  );
}

/** Step5 に初めて入ったときの案内・残り日数・期限後の申込パネル（14 §3.2） */
export function AccessNotice({
  access,
  noticeSeen,
  onNoticeSeen,
  onSubscribe,
  includeIntro = true,
}: {
  access: StartProgramAccess;
  noticeSeen: boolean;
  onNoticeSeen: () => void;
  onSubscribe: () => void;
  /** false なら初回案内は出さず、残り日数・期限後だけ（本画面用） */
  includeIntro?: boolean;
}) {
  const endLabel = formatJstDate(access.freeEndsAt);

  if (access.status === 'paid') return null;

  if (access.status === 'expired') {
    return (
      <section className="sp-access-panel sp-access-panel--expired" aria-label="無料期間の終了">
        <p className="sp-access-panel-title">Step5 からの無料期間は {endLabel} で終わりました</p>
        <p>
          これまでに入力した内容は、このまま見ることができます。続きを入力するには、スタンダードコースへお申し込みください。
          <strong>入力した内容はそのまま引き継がれます。</strong>
        </p>
        <div className="sp-access-panel-actions">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onSubscribe}>
            スタンダードコースを申し込む
          </button>
        </div>
        <p className="sp-access-panel-note">
          お申し込みがない場合、最後にログインした日から {START_PROGRAM_RETENTION_DAYS}{' '}
          日で入力内容は削除されます（削除の前にメールでお知らせします）。
        </p>
      </section>
    );
  }

  if (includeIntro && !noticeSeen) {
    return (
      <section className="sp-access-panel" aria-label="Step5 からのご利用について">
        <p className="sp-access-panel-title">Step5 からのご利用について</p>
        <p>
          Step5 から Step7 までは、スタートプログラムを始めた日から {START_PROGRAM_FREE_DAYS} 日間（{endLabel}
          まで・残り {access.remainingDays}{' '}
          日）無料でお使いいただけます。そのあとはスタンダードコースでご利用いただけます。
        </p>
        <p className="sp-access-panel-note">
          入力した内容は自動で保存され、パソコンとスマホのどちらからでも続きを入力できます。
        </p>
        <div className="sp-access-panel-actions">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--secondary" onClick={onNoticeSeen}>
            わかりました
          </button>
        </div>
      </section>
    );
  }

  if (access.remainingDays > START_PROGRAM_NOTICE_DAYS) return null;

  return (
    <p className="sp-access-remaining" role="status">
      <span className="material-symbols-outlined" aria-hidden>
        schedule
      </span>
      <span>
        無料期間は残り <strong>{access.remainingDays} 日</strong>（{endLabel}
        まで）
      </span>
      <button type="button" className="sp-access-remaining-link" onClick={onSubscribe}>
        スタンダードコースを見る
      </button>
    </p>
  );
}

/** 申込内容の確認（モック。本番は Stripe Checkout へ） */
export function SubscribeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const titleId = useId();
  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            スタンダードコースのお申し込み
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="mandala-modal-input-wrap sp-subscribe-body">
          <ul className="sp-subscribe-list">
            <li>スタートプログラムの Step5〜7 を続けて使えます（AI を含む）。</li>
            <li>気づきノートと AI コーチが使えます。</li>
            <li>入力した内容はそのまま引き継がれます。</li>
            <li>
              お支払いはクレジットカードです。スタートプログラムの無料期間をお試し期間としているため、
              <strong>お申し込みの日からご請求</strong>となります（28 日お試しはありません）。
            </li>
          </ul>
          <p className="sp-access-panel-note">料金・規約は次の申込画面で確認できます。</p>
        </div>
        <footer className="mandala-modal-footer">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--ghost" onClick={onClose}>
            あとで
          </button>
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onConfirm}>
            申し込む（モック）
          </button>
        </footer>
      </div>
    </div>
  );
}

/** 利用状態の切り替え（モック用） */
export function AccessMockToolbar({
  access,
  onScenario,
}: {
  access: StartProgramAccess;
  onScenario: (s: AccessScenario) => void;
}) {
  const current =
    access.status === 'paid'
      ? 'スタンダード'
      : access.status === 'expired'
        ? '期限後'
        : `無料・残り${access.remainingDays}日`;
  return (
    <p className="step02-dummy-toolbar sp-access-mock-toolbar">
      <span className="step02-dummy-toolbar-hint">利用状態（モック）: {current}</span>
      {ACCESS_SCENARIOS.map((s) => (
        <button key={s.id} type="button" className="step02-auto-draft-btn" onClick={() => onScenario(s.id)}>
          {s.label}
        </button>
      ))}
    </p>
  );
}
