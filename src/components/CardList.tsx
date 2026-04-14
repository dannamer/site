import { useEffect, useState, useCallback, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import directus, { DIRECTUS_URL } from '../lib/directus.ts';
import { readItems } from '@directus/sdk';

interface Card {
    id: string;
    name: string;
    price: number;
    price_end: number | null;
    image: string | null;
    description: string | null;
    video: string | null;
    status: string;
}

const CARD_FIELDS = [
    'id',
    'name',
    'price',
    'price_end',
    'image',
    'description',
    'video',
    'status',
] as const;

function normalizeCard(raw: Partial<Card> & { id?: string; price_end?: unknown }): Card | null {
    if (!raw?.id) return null;
    const endRaw = raw.price_end;
    const price_end =
        typeof endRaw === 'number' && Number.isFinite(endRaw) && endRaw > 0 ? endRaw : null;
    return {
        id: raw.id,
        name: raw.name ?? '',
        price: typeof raw.price === 'number' ? raw.price : 0,
        price_end,
        image: raw.image ?? null,
        description: raw.description ?? null,
        video: raw.video ?? null,
        status: raw.status ?? '',
    };
}

function formatCardPriceLine(card: Card): string {
    const loNum = card.price;
    const hiCandidate = card.price_end;
    if (hiCandidate == null || !Number.isFinite(hiCandidate) || hiCandidate <= 0) {
        return `от ${loNum.toLocaleString('ru-RU')} ₽`;
    }
    const lo = Math.min(loNum, hiCandidate);
    const hi = Math.max(loNum, hiCandidate);
    if (lo === hi) {
        return `от ${lo.toLocaleString('ru-RU')} ₽`;
    }
    return `от ${lo.toLocaleString('ru-RU')} до ${hi.toLocaleString('ru-RU')} ₽`;
}

export type CardListProps = {
    catalogId?: string;
};

export function CardDetailModal({ card, onClose }: { card: Card; onClose: () => void }) {
    const videoSrc = card.video ? `${DIRECTUS_URL}/assets/${card.video}` : null;

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    return (
        <div style={overlayStyle} role="presentation" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="card-detail-title"
                style={modalStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="app-icon-btn"
                    onClick={onClose}
                    style={closeButtonStyle}
                    aria-label="Закрыть"
                >
                    ×
                </button>
                <h2 id="card-detail-title" style={modalTitleStyle}>
                    {card.name}
                </h2>
                <div style={modalBodyStyle}>
                    <div style={videoColumnStyle}>
                        {videoSrc ? (
                            <video src={videoSrc} controls playsInline style={modalVideoStyle}>
                                Ваш браузер не поддерживает воспроизведение видео.
                            </video>
                        ) : (
                            <div style={noVideoStyle}>Видео для этого товара не загружено.</div>
                        )}
                    </div>
                    <div style={descriptionColumnStyle}>
                        <h3 style={descriptionHeadingStyle}>Описание</h3>
                        <div style={descriptionTextStyle}>
                            {card.description?.trim()
                                ? card.description
                                : 'Описание пока не добавлено.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CardItem({ card, onDetails }: { card: Card; onDetails: (card: Card) => void }) {
    const imageSrc = card.image ? `${DIRECTUS_URL}/assets/${card.image}` : null;

    const open = () => {
        onDetails(card);
    };

    const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        }
    };

    return (
        <article
            role="button"
            tabIndex={0}
            className="app-card-interactive"
            aria-label={`Подробнее: ${card.name}`}
            style={cardInteractiveStyle}
            onClick={open}
            onKeyDown={onKeyDown}
        >
            <div style={imageContainerStyle}>
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        style={imageStyle}
                    />
                ) : (
                    <div style={placeholderStyle}>Нет фото</div>
                )}
            </div>

            <div style={infoStyle}>
                <h3 style={titleStyle}>{card.name}</h3>
                <p style={priceStyle}>{formatCardPriceLine(card)}</p>
                <span style={buttonAsHintStyle} aria-hidden>
                    Подробнее
                </span>
            </div>
        </article>
    );
}
export const CardList = ({ catalogId }: CardListProps = {}) => {
    const [items, setItems] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detailCard, setDetailCard] = useState<Card | null>(null);

    const closeDetail = useCallback(() => setDetailCard(null), []);

    useEffect(() => {
        let cancelled = false;

        const fetchCards = async () => {
            setLoading(true);
            setError(null);
            try {
                if (catalogId) {
                    const junction = await directus.request(
                        readItems('Catalog_Card', {
                            filter: { Catalog_id: { _eq: catalogId } },
                            fields: ['id', { Card_id: [...CARD_FIELDS] }],
                        })
                    );
                    const rows = junction as { Card_id: Card | string | null }[];
                    const cards: Card[] = [];
                    for (const row of rows) {
                        const c = row.Card_id;
                        if (c && typeof c === 'object' && 'id' in c) {
                            const n = normalizeCard(c as Card);
                            if (n) cards.push(n);
                        }
                    }
                    if (!cancelled) setItems(cards);
                } else {
                    const response = await directus.request(
                        readItems('Card', {
                            fields: [...CARD_FIELDS],
                        })
                    );
                    const raw = response as Partial<Card>[];
                    if (!cancelled) {
                        setItems(
                            raw.map((r) => normalizeCard(r)).filter((x): x is Card => x !== null)
                        );
                    }
                }
            } catch (err) {
                console.error('Ошибка загрузки:', err);
                if (!cancelled) {
                    setError('Не удалось загрузить товары. Попробуйте обновить страницу.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void fetchCards();
        return () => {
            cancelled = true;
        };
    }, [catalogId]);

    if (loading) {
        return (
            <div style={messageStyle} role="status" aria-live="polite">
                Загрузка товаров…
            </div>
        );
    }

    if (error) {
        return (
            <div style={errorStyle} role="alert">
                {error}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div style={messageStyle} role="status">
                Пока нет товаров для отображения.
            </div>
        );
    }

    return (
        <>
            <div style={containerStyle}>
                {items.map((card) => (
                    <CardItem key={card.id} card={card} onDetails={setDetailCard} />
                ))}
            </div>
            {detailCard ? <CardDetailModal card={detailCard} onClose={closeDetail} /> : null}
        </>
    );
};

const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    padding: '20px',
};

const cardStyle: CSSProperties = {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-surface)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: 'var(--shadow-card)',
};

const cardInteractiveStyle: CSSProperties = {
    ...cardStyle,
    cursor: 'pointer',
};

const imageContainerStyle: CSSProperties = {
    width: '100%',
    height: '200px',
    backgroundColor: 'var(--color-surface-muted)',
};

const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
};

const placeholderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-subtle)',
};

const infoStyle: CSSProperties = { padding: '15px' };
const titleStyle: CSSProperties = {
    margin: '0 0 10px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text)',
};
const priceStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    fontSize: '17px',
};
const buttonStyle: CSSProperties = {
    width: '100%',
    marginTop: '10px',
    padding: '8px',
    backgroundColor: 'var(--color-accent-dim)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
};

const buttonAsHintStyle: CSSProperties = {
    ...buttonStyle,
    display: 'block',
    textAlign: 'center',
    boxSizing: 'border-box',
    pointerEvents: 'none',
};

const messageStyle: CSSProperties = {
    padding: '24px 20px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
};

const errorStyle: CSSProperties = {
    ...messageStyle,
    color: 'var(--color-danger)',
};

const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'var(--overlay-scrim)',
    boxSizing: 'border-box',
};

const modalStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '960px',
    maxHeight: 'min(90vh, 720px)',
    overflow: 'auto',
    backgroundColor: 'var(--color-surface-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-modal)',
    padding: '20px 24px 24px',
    boxSizing: 'border-box',
};

const closeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    padding: 0,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface-muted)',
    color: 'var(--color-text-muted)',
    fontSize: '22px',
    lineHeight: 1,
    cursor: 'pointer',
};

const modalTitleStyle: CSSProperties = {
    margin: '0 0px 16px 0',
    fontSize: '1.35rem',
    fontWeight: 600,
    color: 'var(--color-text)',
};

const modalBodyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'stretch',
};

const videoColumnStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
};

const modalVideoStyle: CSSProperties = {
    width: '100%',
    maxHeight: '50vh',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-media-bg)',
    verticalAlign: 'middle',
};

const noVideoStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '24px',
    backgroundColor: 'var(--color-surface-muted)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    border: '1px solid var(--color-border)',
};

const descriptionColumnStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
};

const descriptionHeadingStyle: CSSProperties = {
    margin: '0 0 10px 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
};

const descriptionTextStyle: CSSProperties = {
    margin: 0,
    fontSize: '0.95rem',
    lineHeight: 1.55,
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

export default CardList;
