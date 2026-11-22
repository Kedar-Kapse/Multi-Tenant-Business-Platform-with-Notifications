import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiX } from 'react-icons/fi';
import cn from '../../utils/cn';

/**
 * Design-system date / date-time / time picker. Drop-in replacement for
 * <input type="date" | "datetime-local" | "time">: same value strings
 * ("2026-11-22", "2026-11-22T14:30", "14:30") and onChange receives
 * { target: { name, value } } like a native input.
 *
 *   <DatePicker name="dob" value={form.dob} onChange={handleChange} max={today} />
 *   <DatePicker type="datetime-local" name="startTime" ... />
 */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const TIMES = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`);
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function DatePicker({
  type = 'date',
  name,
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
  required,
  clearable = true,
  error,
  touched,
  size = 'md',
  className,
}) {
  const withDate = type !== 'time';
  const withTime = type !== 'date';
  const datePart = withDate ? (value || '').slice(0, 10) : '';
  const timePart = type === 'time' ? (value || '').slice(0, 5) : (value || '').slice(11, 16);
  const selectedDate = parseYmd(datePart);
  const minDate = parseYmd(min);
  const maxDate = parseYmd(max);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selectedDate || new Date());
  const [mode, setMode] = useState('days'); // 'days' | 'years'
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const timeListRef = useRef(null);

  const emit = (v) => onChange?.({ target: { name, value: v }, currentTarget: { name, value: v } });

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = withDate && withTime ? 400 : withDate ? 288 : 180;
    const height = withDate ? 340 : 260;
    const up = window.innerHeight - r.bottom < height + 8 && r.top > window.innerHeight - r.bottom;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.min(width, window.innerWidth - 16) - 8)),
      width: Math.min(width, window.innerWidth - 16),
      top: up ? undefined : r.bottom + 4,
      bottom: up ? window.innerHeight - r.top + 4 : undefined,
    });
  }, [withDate, withTime]);

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
    setView(selectedDate || minDate || new Date());
    setMode('days');
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      timeListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
    });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i - offset + 1));
  }, [view]);

  const outOfRange = (d) => (minDate && d < minDate) || (maxDate && d > maxDate);
  const today = toYmd(new Date());

  const pickDate = (d) => {
    if (outOfRange(d)) return;
    const ymd = toYmd(d);
    if (withTime) {
      emit(`${ymd}T${timePart || '09:00'}`);
    } else {
      emit(ymd);
      setOpen(false);
    }
  };
  const pickTime = (t) => {
    if (type === 'time') { emit(t); setOpen(false); return; }
    emit(`${datePart || today}T${t}`);
    setOpen(false);
  };

  const display = (() => {
    if (!value) return '';
    const d = selectedDate;
    const dateTxt = d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    if (type === 'date') return dateTxt;
    if (type === 'time') return fmtTime(timePart);
    return `${dateTxt}${timePart ? `, ${fmtTime(timePart)}` : ''}`;
  })();

  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const Icon = type === 'time' ? FiClock : FiCalendar;
  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <>
      <div className={cn('relative w-full', className)}>
        <button
          ref={triggerRef}
          id={id || name}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg border text-left outline-none transition',
            sizes,
            'bg-white dark:bg-secondary-800 focus:ring-2 focus:ring-primary-500',
            touched && error
              ? 'border-urgent-300 dark:border-urgent-700'
              : open
                ? 'border-primary-400 dark:border-primary-600'
                : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600',
            disabled && 'opacity-50 cursor-not-allowed',
            clearable && value && !disabled && 'pr-8',
          )}
        >
          <Icon size={14} className="flex-shrink-0 text-secondary-400" />
          <span className={cn('truncate', value ? 'text-secondary-900 dark:text-white' : 'text-secondary-400')}>
            {display || placeholder || (type === 'time' ? 'Select time' : type === 'date' ? 'Select date' : 'Select date & time')}
          </span>
        </button>
        {clearable && value && !disabled && !required && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => emit('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <FiX size={12} />
          </button>
        )}
      </div>

      {open && pos && createPortal(
        <div
          ref={popRef}
          role="dialog"
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 1000 }}
          className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-xl shadow-secondary-900/10 dark:shadow-black/40 animate-[fadeIn_.12s_ease-out] flex overflow-hidden"
        >
          {withDate && (
            <div className="p-3 flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <button type="button" aria-label={mode === 'years' ? 'Earlier years' : 'Previous month'}
                  onClick={() => setView(mode === 'years'
                    ? new Date(view.getFullYear() - 12, view.getMonth(), 1)
                    : new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700"><FiChevronLeft size={14} /></button>
                <button type="button" onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-secondary-900 dark:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700">
                  {mode === 'years' ? `${view.getFullYear() - 7} – ${view.getFullYear() + 4}` : monthLabel}
                </button>
                <button type="button" aria-label={mode === 'years' ? 'Later years' : 'Next month'}
                  onClick={() => setView(mode === 'years'
                    ? new Date(view.getFullYear() + 12, view.getMonth(), 1)
                    : new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700"><FiChevronRight size={14} /></button>
              </div>
              {mode === 'years' ? (
                <div className="grid grid-cols-3 gap-1 py-1">
                  {Array.from({ length: 12 }, (_, i) => view.getFullYear() - 7 + i).map((y) => (
                    <button key={y} type="button"
                      onClick={() => { setView(new Date(y, view.getMonth(), 1)); setMode('days'); }}
                      className={cn('h-9 rounded-lg text-xs transition',
                        y === selectedDate?.getFullYear()
                          ? 'bg-primary-600 text-white font-semibold'
                          : 'text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                        y === new Date().getFullYear() && y !== selectedDate?.getFullYear() && 'ring-1 ring-primary-400')}>
                      {y}
                    </button>
                  ))}
                </div>
              ) : (
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="text-[10px] font-semibold uppercase text-secondary-400 py-1">{w}</span>
                ))}
                {days.map((d) => {
                  const ymd = toYmd(d);
                  const inMonth = d.getMonth() === view.getMonth();
                  const isSel = ymd === datePart;
                  const isToday = ymd === today;
                  const off = outOfRange(d);
                  return (
                    <button
                      key={ymd}
                      type="button"
                      disabled={off}
                      onClick={() => pickDate(d)}
                      className={cn(
                        'h-8 rounded-lg text-xs transition',
                        off && 'opacity-30 cursor-not-allowed',
                        isSel
                          ? 'bg-primary-600 text-white font-semibold shadow-sm shadow-primary-600/30'
                          : cn(
                            inMonth ? 'text-secondary-700 dark:text-secondary-200' : 'text-secondary-300 dark:text-secondary-600',
                            !off && 'hover:bg-secondary-100 dark:hover:bg-secondary-700',
                            isToday && 'ring-1 ring-primary-400 text-primary-700 dark:text-primary-300 font-semibold',
                          ),
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              )}
              <div className="flex justify-between mt-2 pt-2 border-t border-secondary-100 dark:border-secondary-700">
                <button type="button" onClick={() => { emit(''); setOpen(false); }}
                  className="text-xs font-medium text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300">Clear</button>
                {!outOfRange(new Date(new Date().toDateString())) && (
                  <button type="button" onClick={() => pickDate(new Date())}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">Today</button>
                )}
              </div>
            </div>
          )}
          {withTime && (
            <div className={cn('flex flex-col', withDate ? 'w-28 border-l border-secondary-100 dark:border-secondary-700' : 'w-full')}>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase text-secondary-400">Time</p>
              <ul ref={timeListRef} className="flex-1 overflow-y-auto px-1.5 pb-2 max-h-[300px] scrollbar-thin">
                {TIMES.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      data-selected={t === timePart}
                      onClick={() => pickTime(t)}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition',
                        t === timePart
                          ? 'bg-primary-600 text-white font-semibold'
                          : 'text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                      )}
                    >
                      {fmtTime(t)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
