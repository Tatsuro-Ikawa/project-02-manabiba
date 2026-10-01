'use client';

import { MOTIVATION_OPTIONS, type WishMotivation } from '@/lib/startProgram/wishMotivation';

type WishMotivationPickerProps = {
  name: string;
  value: WishMotivation | undefined;
  onChange: (value: WishMotivation) => void;
  compact?: boolean;
  legend?: string;
};

/** A/B/C/D 動機選択（Step1 願望入力・Step2 共通） */
export default function WishMotivationPicker({
  name,
  value,
  onChange,
  compact = false,
  legend = 'なぜ、その願望があるのか',
}: WishMotivationPickerProps) {
  return (
    <fieldset className={`wish-motivation-picker${compact ? ' wish-motivation-picker--compact' : ''}`}>
      <legend className="wish-motivation-picker-legend">{legend}</legend>
      <div className="wish-motivation-picker-options" role="radiogroup" aria-label={legend}>
        {MOTIVATION_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`wish-motivation-option${value === opt.id ? ' is-selected' : ''}`}
            title={opt.description}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
            />
            <span className="wish-motivation-option-short">{opt.shortLabel}</span>
            <span className="wish-motivation-option-label">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
