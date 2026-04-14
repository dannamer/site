import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { readItem } from '@directus/sdk';
import directus from '../lib/directus';
import { extractSharedLinkBackgroundId } from '../lib/extractFileId';
// import CardList from './CardList';
import { CatalogList } from './Catalog';
// import Catalog from './Catalog';

export function SharedCardPage() {
    const { uuid } = useParams();
    if (!uuid) return null;
    const [isValid, setIsValid] = useState<boolean>(false);
    const [backgroundAssetId, setBackgroundAssetId] = useState<string | null>(null);
    const [storeName, setStoreName] = useState<string | null>(null);

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                const linkData = await directus.request(readItem('SharedLinks', uuid));
                setBackgroundAssetId(
                    extractSharedLinkBackgroundId(linkData as Record<string, unknown>)
                );

                const n = (linkData as { name?: string | null }).name;
                setStoreName(typeof n === 'string' && n.trim().length > 0 ? n.trim() : null);

                if (new Date(linkData.expiration).getTime() > Date.now()) {
                    setIsValid(true);
                } else {
                    setIsValid(false);
                }
            } catch (error) {
                console.error('Ошибка при проверке доступа:', error);
                setBackgroundAssetId(null);
                setStoreName(null);
                setIsValid(false);
            }
        };

        void verifyAccess();
    }, [uuid]);

    if (!isValid) {
        return null;
    }

    return <CatalogList backgroundAssetId={backgroundAssetId} storeName={storeName} />;
}