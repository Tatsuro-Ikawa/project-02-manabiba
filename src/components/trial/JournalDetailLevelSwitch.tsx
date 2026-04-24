'use client';

import {
  JOURNAL_DETAIL_LEVEL_LABELS,
  type JournalDetailLevel,
} from '@/lib/journalDetailLevel';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';

const LEVELS: JournalDetailLevel[] = ['simple', 'normal', 'detailed'];

export default function JournalDetailLevelSwitch() {
  const { level, setLevel } = useJournalDetailLevel();

  return (
    <div
      className="trial-menu-level-switch"
      role="group"
      aria-label="入力表示レベル"
    >
      {LEVELS.map((key) => (
        <label key={key} className="trial-menu-level-option">
          <input
            type="radio"
            name="journal-detail-level"
            value={key}
            checked={level === key}
            onChange={() => setLevel(key)}
          />
          <span>{JOURNAL_DETAIL_LEVEL_LABELS[key]}</span>
        </label>
      ))}
    </div>
  );
}
