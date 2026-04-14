/** Directus M2O к файлу: uuid строкой или объект { id } при expand */
export function extractDirectusFileId(raw: unknown): string | null {
    if (raw == null) return null;
    if (typeof raw === 'string') {
        const t = raw.trim();
        return t.length > 0 ? t : null;
    }
    if (typeof raw === 'object' && 'id' in raw) {
        const id = (raw as { id: unknown }).id;
        if (typeof id === 'string' && id.trim().length > 0) return id.trim();
    }
    return null;
}

/** Поле фона ссылки: в OpenAPI — backround, в некоторых инстансах встречается backroud */
export function extractSharedLinkBackgroundId(link: Record<string, unknown>): string | null {
    const raw = link['backround'] ?? link['backroud'];
    return extractDirectusFileId(raw);
}

export function extractCatalogBackgroundId(catalog: Record<string, unknown>): string | null {
    const raw = catalog['backround'] ?? catalog['backroud'];
    return extractDirectusFileId(raw);
}
