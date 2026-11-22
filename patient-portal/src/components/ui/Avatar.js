import { useState } from 'react';
import { initials } from '../../utils/format';

const SIZES = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-sm', xl: 'w-16 h-16 text-xl' };

/** Photo when available, otherwise initials. */
export default function Avatar({ firstName, lastName, name, photoUrl, size = 'md' }) {
  const [broken, setBroken] = useState(false);
  const parts = name ? String(name).replace(/^dr\.?\s+/i, '').trim().split(/\s+/) : [];
  const text = name ? initials(parts[0], parts.length > 1 ? parts[parts.length - 1] : '') : initials(firstName, lastName);
  const cls = `${SIZES[size] || SIZES.md} rounded-full flex-shrink-0`;
  if (photoUrl && !broken) {
    return <img src={photoUrl} alt="" onError={() => setBroken(true)} className={`${cls} object-cover bg-secondary-100`} />;
  }
  return (
    <div className={`${cls} bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold`} aria-hidden="true">
      {text}
    </div>
  );
}
