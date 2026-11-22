import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import cn from '../../utils/cn';

/**
 * Design-system dropdown. Drop-in replacement for a native <select>:
 *
 *   <Select name="role" value={form.role} onChange={handleChange}>
 *     <option value="">Select role</option>
 *     <option value="ADMIN">Admin</option>
 *   </Select>
 *
 * or with data:  <Select options={[{ value, label }]} placeholder="..." />
 *
 * onChange receives an event-like object ({ target: { name, value } }) exactly like
 * a native select, so existing handlers keep working. The menu is rendered in a
 * portal with fixed positioning, so it is never clipped by modals or tables, and
 * flips above the field when there is no room below.
 */
export default function Select({
  name,
  id,
  value,
  onChange,
  options,
  children,
  placeholder,
  disabled = false,
  searchable,
  error,
  touched,
  size = 'md',
  className,
  menuClassName,
  'aria-label': ariaLabel,
}) {
  const items = useMemo(() => normalizeOptions(options, children), [options, children]);
  const placeholderItem = items.find((o) => o.value === '');
  const realItems = items.filter((o) => o.value !== '' || !placeholderItem);
  const selected = items.find((o) => String(o.value) === String(value ?? ''));
  const showSearch = searchable ?? realItems.length > 8;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((o) => o.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxMenu = 288;
    const below = window.innerHeight - r.bottom;
    const up = below < Math.min(maxMenu, 200) && r.top > below;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8)),
      width: Math.max(r.width, 180),
      top: up ? undefined : r.bottom + 4,
      bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.max(160, Math.min(maxMenu, (up ? r.top : below) - 12)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(Math.max(0, items.findIndex((o) => String(o.value) === String(value ?? ''))));
      if (showSearch) requestAnimationFrame(() => searchRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (opt) => {
    if (opt.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (String(opt.value) !== String(value ?? '')) {
      onChange?.({ target: { name, value: opt.value }, currentTarget: { name, value: opt.value } });
    }
  };

  const move = (delta) => {
    if (!visible.length) return;
    let i = active;
    for (let n = 0; n < visible.length; n += 1) {
      i = (i + delta + visible.length) % visible.length;
      if (!visible[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (visible[active]) choose(visible[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); }
  };

  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <>
      <button
        ref={triggerRef}
        id={id || name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          // Like a native <select>: the page decides the width; full width only by default.
          !/(^|\s)([a-z]+:)?(w-|flex-1|min-w-|basis-)/.test(className || '') && 'w-full',
          'flex items-center justify-between gap-2 rounded-lg border text-left outline-none transition',
          sizes,
          'bg-white dark:bg-secondary-800 focus:ring-2 focus:ring-primary-500',
          touched && error
            ? 'border-urgent-300 dark:border-urgent-700'
            : open
              ? 'border-primary-400 dark:border-primary-600'
              : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <span className={cn('truncate', selected && selected.value !== '' ? 'text-secondary-900 dark:text-white' : 'text-secondary-400')}>
          {selected ? selected.label : (placeholder ?? placeholderItem?.label ?? 'Select…')}
        </span>
        <FiChevronDown size={14} className={cn('flex-shrink-0 text-secondary-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          onKeyDown={onKeyDown}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 1000 }}
          className={cn(
            'rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800',
            'shadow-xl shadow-secondary-900/10 dark:shadow-black/40 overflow-hidden animate-[fadeIn_.12s_ease-out]',
            menuClassName,
          )}
        >
          {showSearch && (
            <div className="p-2 border-b border-secondary-100 dark:border-secondary-700">
              <div className="relative">
                <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  placeholder="Search…"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg text-sm bg-secondary-50 dark:bg-secondary-900 text-secondary-900 dark:text-white border border-transparent focus:border-primary-400 outline-none"
                />
              </div>
            </div>
          )}
          <ul id={listId} role="listbox" style={{ maxHeight: pos.maxHeight - (showSearch ? 52 : 0) }} className="overflow-y-auto py-1 scrollbar-thin">
            {visible.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-secondary-400">No matches</li>
            )}
            {visible.map((opt, i) => {
              const isSel = String(opt.value) === String(value ?? '');
              return (
                <li
                  key={`${opt.value}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                  className={cn(
                    'mx-1 px-2.5 py-2 rounded-lg text-sm flex items-center justify-between gap-2 cursor-pointer select-none',
                    opt.disabled && 'opacity-40 cursor-not-allowed',
                    i === active && !opt.disabled && 'bg-secondary-100 dark:bg-secondary-700/60',
                    isSel ? 'text-primary-700 dark:text-primary-300 font-medium' : opt.value === '' ? 'text-secondary-400' : 'text-secondary-700 dark:text-secondary-200',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSel && opt.value !== '' && <FiCheck size={14} className="flex-shrink-0 text-primary-600 dark:text-primary-400" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Accepts options=[{value,label}|string] and/or <option> children (also inside fragments/arrays). */
function normalizeOptions(options, children) {
  if (options) {
    return options.map((o) => (typeof o === 'object'
      ? { value: o.value ?? '', label: String(o.label ?? o.value ?? ''), disabled: !!o.disabled }
      : { value: o, label: String(o) }));
  }
  const out = [];
  const walk = (nodes) => Children.forEach(nodes, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const label = Children.toArray(child.props.children).join('');
      out.push({ value: child.props.value ?? label, label, disabled: !!child.props.disabled });
    } else if (child.props?.children) {
      walk(child.props.children);
    }
  });
  walk(children);
  return out;
}
