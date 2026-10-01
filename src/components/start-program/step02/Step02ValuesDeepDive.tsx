'use client';

import { getMandalaDomain } from '@/lib/startProgram/mandalaConstants';
import type { MandalaWishRef } from '@/lib/startProgram/step02Constants';
import {
  VALUES_EPISODE_MAX_ROWS,
  countCompleteEpisodes,
  isEpisodeComplete,
  truncateValuePill,
  type MovingEpisode,
  type ValueOption,
  type ValuesOptionsByWish,
} from '@/lib/startProgram/step02ValuesConstants';

type Props = {
  wishes: MandalaWishRef[];
  optionsByWish: ValuesOptionsByWish;
  episodes: MovingEpisode[];
  onOpenWish: (id: string) => void;
  onOpenEpisode: (id: string) => void;
  onAddEpisode: () => void;
  onRemoveEpisode: (id: string) => void;
};

export default function Step02ValuesDeepDive({
  wishes,
  optionsByWish,
  episodes,
  onOpenWish,
  onOpenEpisode,
  onAddEpisode,
  onRemoveEpisode,
}: Props) {
  const episodeDone = countCompleteEpisodes(episodes);

  return (
    <div className="step02-values-dig">
      <h3 className="seven-steps-worksheet-subheading">価値観を掘り下げてみよう</h3>
      <p className="seven-steps-worksheet-body">
        Step1 で「価値観」に分類した願望と、<strong>必須</strong>の「感動した出来事」から、大切にしていることを見つけます。
      </p>

      <section className="step02-values-section" aria-label="願望ベース">
        <h4 className="step02-values-section-title">A. 願望から</h4>
        {wishes.length === 0 ? (
          <p className="step02-empty-hint">
            価値観に分類された願望がありません。B の感動エピソードは必須です。願望は Step1 で追加できます。
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
                        {selected.map((o: ValueOption) => (
                          <span key={o.id} className="step02-interest-mini-pill" title={o.label}>
                            {truncateValuePill(o.label)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="step02-interest-selected-empty">タップして価値観を選ぶ</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="step02-values-section" aria-label="感動エピソード">
        <h4 className="step02-values-section-title">
          B. 感動した出来事（必須・{episodeDone}/{Math.max(1, episodes.length)} 完了）
        </h4>
        <p className="seven-steps-worksheet-body">
          出来事と、そのときの感情・気持ち・感覚を書き、Ai で価値観をリストアップします。最低 1 件完了が必要です。
        </p>
        <ul className="step02-values-episode-list">
          {episodes.map((ep, i) => {
            const selected = ep.options.filter((o) => o.selected);
            const complete = isEpisodeComplete(ep);
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
                        {ep.episode.trim() || '（出来事未入力）'}
                      </span>
                      <span className="step02-values-episode-emotion">
                        感情: {ep.emotion.trim() || '（未入力）'}
                      </span>
                      {selected.length > 0 ? (
                        <span className="step02-interest-selected-pills">
                          {selected.map((o) => (
                            <span key={o.id} className="step02-interest-mini-pill" title={o.label}>
                              {truncateValuePill(o.label)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="step02-interest-selected-empty">
                          タップして出来事・感情・価値観を入力
                        </span>
                      )}
                    </span>
                    {complete ? (
                      <span className="step02-values-episode-badge">完了</span>
                    ) : null}
                  </button>
                  {episodes.length > 1 ? (
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
        {episodes.length < VALUES_EPISODE_MAX_ROWS ? (
          <p className="step02-section-footer">
            <button type="button" className="step02-auto-draft-btn" onClick={onAddEpisode}>
              出来事を追加
            </button>
          </p>
        ) : null}
      </section>
    </div>
  );
}
