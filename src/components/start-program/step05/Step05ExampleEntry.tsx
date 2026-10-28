'use client';

import { useEffect, useId, useState } from 'react';
import {
  AccessMockToolbar,
  AccessNotice,
  SubscribeModal,
} from '@/components/start-program/access/StartProgramAccessParts';
import { useStartProgramAccess } from '@/hooks/useStartProgramAccess';
import { STEP05_DUMMY_PERSONAS, loadStep05Dummy } from '@/lib/startProgram/step05Dummy';

/**
 * タイトル行の「具体例を表示」と、ダミー読み込み・利用状態モック・初回案内をまとめたモーダル。
 * 本画面の頭を軽くするため、モック用 UI をここに移す。
 */
export default function Step05ExampleEntry() {
  const titleId = useId();
  const accessHook = useStartProgramAccess();
  const { access, hydrated } = accessHook;
  const [open, setOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [dummyLoading, setDummyLoading] = useState(false);

  // 初回案内は本画面に出さず、このモーダルで見せる（未読なら自動で開く）
  useEffect(() => {
    if (!hydrated || !access) return;
    if (access.status === 'paid' || access.status === 'expired') return;
    if (accessHook.state?.step05NoticeSeenAt != null) return;
    setOpen(true);
  }, [hydrated, access, accessHook.state?.step05NoticeSeenAt]);

  const loadDummy = async (path: string, label: string, withPlan?: boolean) => {
    if (!window.confirm(`${label}想定のダミーデータで Step1〜5 を上書きします。よろしいですか？`)) return;
    setDummyLoading(true);
    try {
      await loadStep05Dummy(path, withPlan);
      window.location.reload();
    } catch {
      setDummyLoading(false);
      window.alert('ダミーデータの読み込みに失敗しました。');
    }
  };

  const close = () => {
    if (access && access.status === 'free' && accessHook.state?.step05NoticeSeenAt == null) {
      accessHook.markNoticeSeen();
    }
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="step05-example-btn" onClick={() => setOpen(true)}>
        具体例を表示
      </button>

      {open ? (
        <div
          className="mandala-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="mandala-modal step05-example-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="mandala-modal-header">
              <h3 id={titleId} className="mandala-modal-title">
                具体例・利用の確認
              </h3>
              <button type="button" className="mandala-modal-close" onClick={close} aria-label="閉じる">
                <span className="material-symbols-outlined" aria-hidden>
                  close
                </span>
              </button>
            </header>

            <div className="mandala-modal-input-wrap step05-example-modal-body">
              <section className="step05-example-section" aria-label="具体例の読み込み">
                <p className="step05-example-section-title">具体例を読み込む</p>
                <p className="step02-dummy-toolbar">
                  {STEP05_DUMMY_PERSONAS.map((persona) => (
                    <button
                      key={persona.id}
                      type="button"
                      className="step02-auto-draft-btn"
                      disabled={dummyLoading}
                      onClick={() => loadDummy(persona.path, persona.label, persona.withPlan)}
                    >
                      {dummyLoading ? '読込中…' : `${persona.label}を読み込む`}
                    </button>
                  ))}
                </p>
                <p className="step02-dummy-toolbar-hint">
                  Step1〜5 用。編集可: <code>public/.../step05/dummy/*.json</code>
                </p>
              </section>

              {access ? (
                <section className="step05-example-section" aria-label="利用状態の確認">
                  <p className="step05-example-section-title">利用状態（モック）</p>
                  <AccessMockToolbar access={access} onScenario={accessHook.setScenario} />
                  {/* 初回案内は常にモーダル内で再表示できる（本画面には出さない） */}
                  <AccessNotice
                    access={access}
                    noticeSeen={false}
                    onNoticeSeen={close}
                    onSubscribe={() => setSubscribeOpen(true)}
                  />
                </section>
              ) : null}
            </div>

            <footer className="mandala-modal-footer">
              <button type="button" className="mandala-modal-btn mandala-modal-btn--secondary" onClick={close}>
                閉じる
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {subscribeOpen ? (
        <SubscribeModal
          onClose={() => setSubscribeOpen(false)}
          onConfirm={() => {
            accessHook.subscribe();
            setSubscribeOpen(false);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
