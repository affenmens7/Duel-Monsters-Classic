/**
 * Returns localized card fields based on current i18n language.
 * DE = German API fields (name, desc, type, race)
 * EN = English fallback fields (name_en, desc_en, type_en, race_en)
 */

import { useTranslation } from 'react-i18next';
import type { Card } from '../types/card';

interface LocalizedCard {
  name: string;
  desc: string;
  type: string;
  race: string;
  secondaryName: string | null;
}

export function useCardLocale() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  function localize(card: Card): LocalizedCard {
    if (isEn) {
      return {
        name: card.name_en ?? card.name,
        desc: card.desc_en ?? card.desc,
        type: card.type_en ?? card.type,
        race: card.race_en ?? card.race,
        secondaryName: card.name !== card.name_en ? card.name : null,
      };
    }

    return {
      name: card.name,
      desc: card.desc,
      type: card.type,
      race: card.race,
      secondaryName: card.name_en && card.name_en !== card.name ? card.name_en : null,
    };
  }

  return { localize };
}
