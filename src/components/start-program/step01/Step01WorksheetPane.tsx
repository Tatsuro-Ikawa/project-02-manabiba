'use client';

import { useCallback, useState } from 'react';
import MandalaCard from '@/components/start-program/step01/MandalaCard';
import MandalaEntryModal from '@/components/start-program/step01/MandalaEntryModal';
import { useMandalaLocalStore } from '@/hooks/useMandalaLocalStore';
import {
  MANDALA_CENTER_GOAL_MAX_CHARS,
  type MandalaDomainId,
  type MandalaEntryLocal,
  countUnicodeChars,
  getMandalaDomain,
  mandalaDomainsByGridOrder,
} from '@/lib/startProgram/mandalaConstants';

/** Step1 ワークシート：曼荼羅チャート（localStorage。Firestore は次フェーズ） */
export default function Step01WorksheetPane() {
  const { store, setDomains, setCenterGoal } = useMandalaLocalStore();
  const { domains, centerGoal } = store;
  const [openDomainId, setOpenDomainId] = useState<MandalaDomainId | null>(null);

  const setDomainEntries = useCallback(
    (domainId: MandalaDomainId, next: MandalaEntryLocal[]) => {
      setDomains((prev) => ({ ...prev, [domainId]: next }));
    },
    [setDomains]
  );

  const setCenterGoalClamped = (value: string) => {
    if (countUnicodeChars(value) > MANDALA_CENTER_GOAL_MAX_CHARS) return;
    setCenterGoal(value);
  };

  const openDomain = openDomainId ? getMandalaDomain(openDomainId) : undefined;
  const cells = mandalaDomainsByGridOrder();

  const centerBlock = (
    <div className="mandala-center" aria-label="人生の中心目標">
      <p className="mandala-center-label">人生の中心目標</p>
      <textarea
        className="mandala-center-input"
        rows={3}
        placeholder="どんな自分になりたいかを書いてみましょう"
        value={centerGoal}
        onChange={(e) => setCenterGoalClamped(e.target.value)}
        aria-describedby="mandala-center-count"
      />
      <p id="mandala-center-count" className="seven-steps-char-count" aria-live="polite">
        {countUnicodeChars(centerGoal)}/{MANDALA_CENTER_GOAL_MAX_CHARS}
      </p>
    </div>
  );

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step01">
      <h2 className="seven-steps-worksheet-heading">
        8つの領域のバランスを保ち、理想の人生を描いてみよう
      </h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        各カードをクリックすると入力画面を表示できます。願望を書くときに「なぜその願望があるのか（A/B/C/D）」も一緒に選びます。
      </p>

      <div className="mandala-grid" role="list" aria-label="8つの領域の曼荼羅チャート">
        {cells.map((cell) => {
          if (cell === 'center') {
            return (
              <div
                key="center"
                className="mandala-grid-cell mandala-grid-cell--center"
                data-pos="4"
                role="listitem"
              >
                {centerBlock}
              </div>
            );
          }
          return (
            <div
              key={cell.id}
              className="mandala-grid-cell"
              data-pos={String(cell.gridIndex)}
              role="listitem"
            >
              <MandalaCard
                domain={cell}
                entries={domains[cell.id]}
                onOpen={() => setOpenDomainId(cell.id)}
              />
            </div>
          );
        })}
      </div>

      {openDomain ? (
        <MandalaEntryModal
          domain={openDomain}
          entries={domains[openDomain.id]}
          onChange={(next) => setDomainEntries(openDomain.id, next)}
          onClose={() => setOpenDomainId(null)}
        />
      ) : null}
    </div>
  );
}
