import { createDirectus, rest } from '@directus/sdk';

// Описываем структуру вашей базы для типизации
interface Card {
    id: string;
    name: string;
    price: number;
    price_end?: number | null;
    image: string;
    description: string;
    video: string;
    status: string;
}

export interface SharedLink {
    id: string;
    name: string | null;
    expiration: string;
    /** UUID файла фона (в схеме API: backround) */
    backround?: string | null;
}

interface SharedLinksCatalog {
    id: number;
    SharedLinks_id: string | SharedLink;
    Catalog_id: string | Catalog;
}

export interface Catalog {
    id: string;
    name: string | null;
    image: string | null;
    /** UUID файла фона каталога (не карточки) */
    backround: string | null;
}
interface CatalogCard {
    id: number;
    Catalog_id: string | Catalog;
    Card_id: string | Partial<Card> | Card;
}
// 2. Общая схема базы
interface Schema {
    Card: Card[];
    Catalog_Card: CatalogCard[];
    Catalog: Catalog[];
    SharedLinks_Catalog: SharedLinksCatalog[];
    SharedLinks: SharedLink[]; 
}

// export const DIRECTUS_URL = 'http://192.168.88.96:8055';
export const DIRECTUS_URL = 'http://192.168.88.67:8055';

// Создаем клиент
const directus = createDirectus<Schema>(DIRECTUS_URL).with(rest());

export default directus;
