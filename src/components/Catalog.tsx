import directus, { DIRECTUS_URL, type Catalog } from '../lib/directus';
import { extractCatalogBackgroundId } from '../lib/extractFileId';
import { useParams } from 'react-router-dom';
import { readItems } from '@directus/sdk';
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { CardList } from './CardList';

export type CatalogListProps = {
    /** Фон списка каталогов — из SharedLinks */
    backgroundAssetId?: string | null;
    /** Название магазина — SharedLinks.name */
    storeName?: string | null;
};

type SharedLinksCatalogRow = {
    id: number;
    Catalog_id: Catalog | string | null;
};

function isCatalogExpanded(v: Catalog | string | null): v is Catalog {
    return v !== null && typeof v === 'object' && 'id' in v;
}

function catalogShellStyle(assetId: string | null | undefined): CSSProperties {
    const base: CSSProperties = {
        minHeight: '100svh',
        boxSizing: 'border-box',
        backgroundColor: 'var(--color-bg)',
        backgroundImage: 'none',
    };
    if (!assetId) return base;
    const url = `${DIRECTUS_URL}/assets/${encodeURIComponent(assetId)}`;
    return {
        ...base,
        backgroundImage: `linear-gradient(var(--catalog-bg-scrim), var(--catalog-bg-scrim)), url("${url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };
}

function CatalogShell({ assetId, children }: { assetId: string | null | undefined; children: ReactNode }) {
    return <div style={catalogShellStyle(assetId)}>{children}</div>;
}

function StoreHeader({ title }: { title: string | null | undefined }) {
    const t = title?.trim();
    if (!t) return null;
    return (
        <header style={storeHeaderStyle}>
            <h1 style={storeTitleStyle}>
                <span style={storeNameBadgeStyle}>{t}</span>
            </h1>
        </header>
    );
}

export const CatalogList = ({ backgroundAssetId, storeName }: CatalogListProps = {}) => {
    const { uuid } = useParams();
    if (!uuid) return null;

    const [catalogs, setCatalogs] = useState<Catalog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchLinks = async () => {
            setLoading(true);
            setError(null);
            try {
                const rows = await directus.request(
                    readItems('SharedLinks_Catalog', {
                        fields: ['id', { Catalog_id: ['id', 'name', 'image', 'backround'] }],
                        filter: {
                            SharedLinks_id: { _eq: uuid },
                        },
                    })
                );
                const list: Catalog[] = [];
                const seen = new Set<string>();
                for (const row of rows as SharedLinksCatalogRow[]) {
                    const c = row.Catalog_id;
                    if (!isCatalogExpanded(c)) continue;
                    if (seen.has(c.id)) continue;
                    seen.add(c.id);
                    list.push({
                        id: c.id,
                        name: c.name ?? '',
                        image: c.image ?? '',
                        backround: extractCatalogBackgroundId(c as unknown as Record<string, unknown>),
                    });
                }
                if (!cancelled) setCatalogs(list);
            } catch (err) {
                console.error('Ошибка загрузки каталогов:', err);
                if (!cancelled) {
                    setError('Не удалось загрузить каталоги. Попробуйте обновить страницу.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchLinks();
        return () => {
            cancelled = true;
        };
    }, [uuid]);

    const backToList = useCallback(() => setSelectedCatalogId(null), []);

    const linkBackgroundAssetId =
        typeof backgroundAssetId === 'string' && backgroundAssetId.trim().length > 0
            ? backgroundAssetId.trim()
            : null;

    /** Сетка каталогов — только фон ссылки (если задан). Экран карточек — только фон каталога; без фона — ничего, без подстановки фона ссылки */
    const shellBackgroundAssetId =
        selectedCatalogId === null
            ? linkBackgroundAssetId
            : (() => {
                  const cat = catalogs.find((c) => c.id === selectedCatalogId);
                  const own = cat?.backround?.trim();
                  return own && own.length > 0 ? own : null;
              })();

    if (selectedCatalogId) {
        const selectedCatalog = catalogs.find((c) => c.id === selectedCatalogId);
        const rawCatalogName = selectedCatalog?.name?.trim() ?? '';
        const catalogDisplayName = rawCatalogName.length > 0 ? rawCatalogName : 'Каталог';

        return (
            <CatalogShell assetId={shellBackgroundAssetId}>
                <StoreHeader title={storeName} />
                <div style={pageWrapStyle}>
                    <button
                        type="button"
                        className="app-icon-btn"
                        onClick={backToList}
                        style={{ ...backButtonStyle, marginBottom: 0 }}
                    >
                        Назад к каталогам
                    </button>
                    <div style={catalogViewTitleWrapStyle}>
                        <h2 style={catalogViewHeadingStyle}>
                            <span style={catalogNameBadgeStyle}>{catalogDisplayName}</span>
                        </h2>
                    </div>
                    <CardList catalogId={selectedCatalogId} />
                </div>
            </CatalogShell>
        );
    }

    if (loading) {
        return (
            <CatalogShell assetId={shellBackgroundAssetId}>
                <StoreHeader title={storeName} />
                <div style={messageStyle} role="status" aria-live="polite">
                    Загрузка каталогов…
                </div>
            </CatalogShell>
        );
    }

    if (error) {
        return (
            <CatalogShell assetId={shellBackgroundAssetId}>
                <StoreHeader title={storeName} />
                <div style={errorStyle} role="alert">
                    {error}
                </div>
            </CatalogShell>
        );
    }

    if (catalogs.length === 0) {
        return (
            <CatalogShell assetId={shellBackgroundAssetId}>
                <StoreHeader title={storeName} />
                <div style={messageStyle} role="status">
                    Нет каталогов для этой ссылки.
                </div>
            </CatalogShell>
        );
    }

    return (
        <CatalogShell assetId={shellBackgroundAssetId}>
            <StoreHeader title={storeName} />
            <div style={containerStyle}>
                {catalogs.map((cat) => (
                    <CatalogTile key={cat.id} catalog={cat} onOpen={() => setSelectedCatalogId(cat.id)} />
                ))}
            </div>
        </CatalogShell>
    );
};

function CatalogTile({ catalog, onOpen }: { catalog: Catalog; onOpen: () => void }) {
    const imageSrc = catalog.image ? `${DIRECTUS_URL}/assets/${catalog.image}` : null;

    return (
        <article className="app-card-interactive" style={cardStyle}>
            <button
                type="button"
                className="app-tile-btn"
                onClick={onOpen}
                style={tileButtonStyle}
                aria-label={`Открыть каталог ${catalog.name}`}
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
                    <h3 style={titleStyle}>{catalog.name || 'Без названия'}</h3>
                    <span style={linkHintStyle}>Открыть</span>
                </div>
            </button>
        </article>
    );
}

const storeHeaderStyle: CSSProperties = {
    padding: '16px 56px 12px',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderBottom: 'none',
};

const storeTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    textAlign: 'center',
};

/** Полупрозрачная «таблетка» + blur: читаемо на шумном фото и на однотонном фоне */
const storeNameBadgeStyle: CSSProperties = {
    display: 'inline-block',
    padding: '8px 20px',
    maxWidth: 'min(100%, 520px)',
    wordBreak: 'break-word',
    borderRadius: '999px',
    color: '#f4f4f8',
    backgroundColor: 'rgba(8, 10, 16, 0.55)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    boxShadow: '0 2px 16px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'saturate(1.05) blur(10px)',
    WebkitBackdropFilter: 'saturate(1.05) blur(10px)',
};

const catalogViewTitleWrapStyle: CSSProperties = {
    textAlign: 'center',
    padding: '12px 16px 18px',
};

const catalogViewHeadingStyle: CSSProperties = {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.35,
};

const catalogNameBadgeStyle: CSSProperties = {
    ...storeNameBadgeStyle,
    fontSize: '1.05rem',
    padding: '7px 18px',
    maxWidth: 'min(100%, 480px)',
};

const pageWrapStyle: CSSProperties = { padding: '12px 20px 20px' };

const backButtonStyle: CSSProperties = {
    marginBottom: '16px',
    padding: '8px 14px',
    backgroundColor: 'var(--color-surface-muted)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '15px',
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

const tileButtonStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    font: 'inherit',
    color: 'var(--color-text)',
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
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text)',
};
const linkHintStyle: CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-accent)',
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
