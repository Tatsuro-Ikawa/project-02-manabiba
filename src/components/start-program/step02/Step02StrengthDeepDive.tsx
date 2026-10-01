'use client';

import { getMandalaDomain } from '@/lib/startProgram/mandalaConstants';
import type { MandalaWishRef } from '@/lib/startProgram/step02Constants';
import {
  STRENGTH_ADDITIVE_MIN_REQUIRED,
  STRENGTH_EPISODE_MAX_ROWS_PER_KIND,
  countCompleteByKind,
  countCompleteStrengthEpisodes,
  isStrengthEpisodeComplete,
  truncateStrengthPill,
  type StrengthEpisode,
  type StrengthEpisodeKind,
  type StrengthOption,
  type StrengthOptionsByWish,
} from '@/lib/startProgram/step02StrengthConstants';

type Props = {
  wishes: MandalaWishRef[];
  optionsByWish: StrengthOptionsByWish;
  episodes: StrengthEpisode[];
  onOpenWish: (id: string) => void;
  onOpenEpisode: (id: string) => void;
  onAddEpisode: (kind: StrengthEpisodeKind) => void;
  onRemoveEpisode: (id: string) => void;
};

function EpisodeSection({
  kind,
  title,
  lead,
  episodes,
  onOpenEpisode,
  onAddEpisode,
  onRemoveEpisode,
}: {
  kind: StrengthEpisodeKind;
  title: string;
  lead: string;
  episodes: StrengthEpisode[];
  onOpenEpisode: (id: string) => void;
  onAddEpisode: (kind: StrengthEpisodeKind) => void;
  onRemoveEpisode: (id: string) => void;
}) {
  const list = episodes.filter((e) => e.kind === kind);
  const done = countCompleteByKind(episodes, kind);

  return (
    <section className="step02-values-section" aria-label={title}>
      <h4 className="step02-values-section-title">
        {title}（{done}/{Math.max(1, list.length)} 完了）
      </h4>
      <p className="seven-steps-worksheet-body">{lead}</p>
      <ul className="step02-values-episode-list">
        {list.map((ep, i) => {
          const selected = ep.options.filter((o) => o.selected);
          const complete = isStrengthEpisodeComplete(ep);
          return (
            <li key={ep.id}>
              <div className={`step02-values-episode-card${complete ? ' is-complete' : ''}`}>
                <button
                  type="button"
                  className="step02-values-episode-main"
                  onClick={() => onOpenEpisode(ep.id)}
                >
                  <span className="step02-interest-wish-num">{i + 1}.</span>
                  <span className="step02-values-episode-body">
                    <span className="step02-values-episode-text">
                      {ep.episode.trim() || '（未入力）'}
                    </span>
                    <span className="step02-values-episode-emotion">
                      感情: {ep.emotion.trim() || '（未入力）'}
                    </span>
                    {selected.length > 0 ? (
                      <span className="step02-interest-selected-pills">
                        {selected.map((o) => (
                          <span key={o.id} className="step02-interest-mini-pill" title={o.label}>
                            {truncateStrengthPill(o.label)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="step02-interest-selected-empty">
                        タップして入力・強みを選ぶ
                      </span>
                    )}
                  </span>
                  {complete ? (
                    <span className="step02-values-episode-badge">完了</span>
                  ) : null}
                </button>
                {list.length > 1 ? (
                  <button
                    type="button"
                    className="step02-values-episode-remove"
                    onClick={() => onRemoveEpisode(ep.id)}
                  >
                    削除
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {list.length < STRENGTH_EPISODE_MAX_ROWS_PER_KIND ? (
        <p className="step02-section-footer">
          <button
            type="button"
            className="step02-auto-draft-btn"
            onClick={() => onAddEpisode(kind)}
          >
            追加
          </button>
        </p>
      ) : null}
    </section>
  );
}

export default function Step02StrengthDeepDive({
  wishes,
  optionsByWish,
  episodes,
  onOpenWish,
  onOpenEpisode,
  onAddEpisode,
  onRemoveEpisode,
}: Props) {
  const additiveDone = countCompleteStrengthEpisodes(episodes);

  return (
    <div className="step02-strength-dig">
      <h3 className="seven-steps-worksheet-subheading">得意・強みを掘り下げてみよう</h3>
      <p className="seven-steps-worksheet-body">
        Step1 で「得意・強み」に分類した願望と、付加ソース（他者の言葉／自然とできた体験）から見つけます。
        付加は<strong>どちらか最低 {STRENGTH_ADDITIVE_MIN_REQUIRED} 件</strong>の完了が必要です（現在{' '}
        {additiveDone} 件）。
      </p>

      <section className="step02-values-section" aria-label="願望ベース">
        <h4 className="step02-values-section-title">A. 願望から</h4>
        {wishes.length === 0 ? (
          <p className="step02-empty-hint">
            得意・強みに分類された願望がありません。B／C の付加ソースは必須です。願望は Step1
            で追加できます。
          </p>
        ) : (
          <ol className="step02-interest-wish-list">
            {wishes.map((wish, i) => {
              const domain = getMandalaDomain(wish.domainId);
              const selected = (optionsByWish[wish.entryId] ?? []).filter((o) => o.selected);
              return (
                <li key={wish.entryId}>
                  <button
                    type="button"
                    className="step02-interest-wish-card"
                    onClick={() => onOpenWish(wish.entryId)}
                  >
                    <span className="step02-interest-wish-top">
                      <span className="step02-interest-wish-num">{i + 1}.</span>
                      <span className="step02-interest-wish-text">{wish.text}</span>
                      {domain ? (
                        <span className="step02-interest-domain-pill">
                          <span className="material-symbols-outlined" aria-hidden>
                            {domain.icon}
                          </span>
                          {domain.label}
                        </span>
                      ) : null}
                    </span>
                    {selected.length > 0 ? (
                      <span className="step02-interest-selected-pills">
                        {selected.map((o: StrengthOption) => (
                          <span key={o.id} className="step02-interest-mini-pill" title={o.label}>
                            {truncateStrengthPill(o.label)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="step02-interest-selected-empty">
                        タップして得意・強みを選ぶ
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <EpisodeSection
        kind="praise"
        title="B. 他者からの言葉"
        lead="褒められた・頼られた・「あなたらしくていいね」と言われた場面と、そのときの感情から強みを見つけます。"
        episodes={episodes}
        onOpenEpisode={onOpenEpisode}
        onAddEpisode={onAddEpisode}
        onRemoveEpisode={onRemoveEpisode}
      />

      <EpisodeSection
        kind="natural"
        title="C. 自然とできた体験"
        lead="無理なくできた・没頭できた場面と、そのときの感情から強みを見つけます。"
        episodes={episodes}
        onOpenEpisode={onOpenEpisode}
        onAddEpisode={onAddEpisode}
        onRemoveEpisode={onRemoveEpisode}
      />
    </div>
  );
}
