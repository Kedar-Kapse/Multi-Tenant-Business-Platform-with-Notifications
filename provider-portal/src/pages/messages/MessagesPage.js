import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiSend, FiMail, FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Spinner } from '../../components/ui/States';
import PatientPicker from '../../components/PatientPicker';
import { messageApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import useBadgeStore from '../../store/badgeStore';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, fullName, initialsOf, timeAgo } from '../../utils/format';
import { btnGhost, btnPrimary, inputClass } from '../../utils/styles';
import cn from '../../utils/cn';

const emptyCompose = { patient: null, subject: '', body: '' };
const reSubject = (s) => (/^re:/i.test(s || '') ? s : `Re: ${s || ''}`);

export default function MessagesPage() {
  const sub = useAuthStore((s) => s.user?.sub);
  const refreshMessageBadge = useBadgeStore((s) => s.refreshMessages);
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [thread, setThread] = useState(null); // { threadId, subject, other }
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState(emptyCompose);
  const [composeErrors, setComposeErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await messageApi.getAll();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // "Message" from the patient page.
  useEffect(() => {
    const p = location.state?.composeTo;
    if (p) {
      setCompose({ ...emptyCompose, patient: p.keycloakUserId ? p : null });
      setComposeErrors({});
      setComposeOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const otherParty = useCallback((m) => (m.senderId === sub
    ? { id: m.recipientId, name: m.recipientName, role: m.recipientRole }
    : { id: m.senderId, name: m.senderName, role: m.senderRole }), [sub]);

  const threads = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      const t = map[m.threadId] || (map[m.threadId] = { threadId: m.threadId, latest: m, first: m, unread: 0, count: 0 });
      t.count += 1;
      if (new Date(m.sentAt) > new Date(t.latest.sentAt)) t.latest = m;
      if (new Date(m.sentAt) < new Date(t.first.sentAt)) t.first = m;
      if (!m.read && m.recipientId === sub) t.unread += 1;
    });
    return Object.values(map).sort((a, b) => new Date(b.latest.sentAt) - new Date(a.latest.sentAt));
  }, [messages, sub]);

  const unreadThreads = threads.filter((t) => t.unread > 0).length;
  const q = search.trim().toLowerCase();
  const visible = threads.filter((t) => (filter === 'all' || t.unread > 0)
    && (!q || [otherParty(t.latest).name, t.first.subject, t.latest.body].some((f) => f?.toLowerCase().includes(q))));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threadMsgs]);

  const openThread = async (t) => {
    setThread({ threadId: t.threadId, subject: t.first.subject, other: otherParty(t.latest) });
    setThreadMsgs([]);
    setThreadError(null);
    setReply('');
    setThreadLoading(true);
    try {
      const list = await messageApi.getThread(t.threadId);
      setThreadMsgs((Array.isArray(list) ? list : []).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)));
    } catch (err) {
      setThreadError(errorMessage(err, 'Could not load this conversation.'));
    } finally {
      setThreadLoading(false);
    }
    if (t.unread > 0) {
      try {
        await messageApi.markThreadRead(t.threadId);
        setMessages((prev) => prev.map((m) => (m.threadId === t.threadId && m.recipientId === sub ? { ...m, read: true } : m)));
        refreshMessageBadge();
      } catch { /* stays unread; not worth interrupting the user */ }
    }
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !thread || sendingRef.current) return;
    if (!thread.other?.id) { toast.error('This conversation has no recipient.'); return; }
    sendingRef.current = true;
    setSending(true);
    try {
      await messageApi.send({
        recipientId: thread.other.id, recipientName: thread.other.name, recipientRole: thread.other.role,
        subject: reSubject(thread.subject), body, threadId: thread.threadId,
      });
      setReply('');
      const list = await messageApi.getThread(thread.threadId);
      setThreadMsgs((Array.isArray(list) ? list : []).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)));
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Your reply was not sent.'));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const sendCompose = async () => {
    if (sendingRef.current) return;
    const e = {};
    if (!compose.patient) e.patient = 'Choose a patient';
    if (!compose.subject.trim()) e.subject = 'Subject is required';
    if (!compose.body.trim()) e.body = 'Write a message';
    setComposeErrors(e);
    if (Object.keys(e).length) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await messageApi.send({
        recipientId: compose.patient.keycloakUserId,
        recipientName: fullName(compose.patient),
        recipientRole: 'PATIENT',
        subject: compose.subject.trim(),
        body: compose.body.trim(),
      });
      setComposeOpen(false);
      toast.success(`Message sent to ${fullName(compose.patient)}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Your message was not sent.'));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const setC = (k, v) => {
    setCompose((p) => ({ ...p, [k]: v }));
    setComposeErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        subtitle="Secure conversations with your patients."
        actions={(
          <>
            <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400"><FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            <button type="button" onClick={() => { setCompose(emptyCompose); setComposeErrors({}); setComposeOpen(true); }} className={`${btnPrimary} flex-1 sm:flex-none`}>
              <FiMail size={16} /> New message
            </button>
          </>
        )}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Tabs tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread', count: unreadThreads || undefined }]} activeKey={filter} onChange={setFilter} />
        <div className="relative flex-1 sm:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" aria-label="Search conversations" className={`${inputClass} pl-9 pr-8`} />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary-400 hover:text-secondary-600"><FiX size={13} /></button>}
        </div>
      </div>

      <Card>
        {loadError ? <ErrorState title="Could not load messages" message={loadError} onRetry={load} />
          : loading && messages.length === 0 ? <LoadingState />
            : visible.length === 0 ? (
              <EmptyState icon={FiMessageSquare}
                title={threads.length ? 'No conversations match' : 'No messages yet'}
                description={threads.length ? 'Try another search or tab.' : 'Messages from your patients will appear here.'} />
            ) : (
              <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
                {visible.map((t) => {
                  const other = otherParty(t.latest);
                  const isUnread = t.unread > 0;
                  return (
                    <li key={t.threadId}>
                      <button type="button" onClick={() => openThread(t)}
                        className={cn('w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50', isUnread && 'bg-primary-50/40 dark:bg-primary-900/10')}>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {initialsOf(other.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={cn('text-sm truncate', isUnread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-200')}>{other.name || 'Unknown'}</p>
                              {isUnread && <span className="px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex-shrink-0">{t.unread}</span>}
                            </div>
                            <span className="text-[10px] text-secondary-400 flex-shrink-0 whitespace-nowrap">{timeAgo(t.latest.sentAt)}</span>
                          </div>
                          <p className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mt-0.5 truncate">{t.first.subject}</p>
                          <p className="text-xs text-secondary-400 mt-0.5 truncate">{t.latest.senderId === sub ? 'You: ' : ''}{t.latest.body}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
      </Card>

      {/* Conversation */}
      <Modal
        open={!!thread}
        onClose={() => setThread(null)}
        title={thread?.subject || 'Conversation'}
        size="lg"
        footer={thread && (
          <div className="flex gap-2 w-full">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder={`Reply to ${thread.other?.name || ''}…`}
              rows={1}
              aria-label="Reply"
              className={`${inputClass} flex-1 resize-none min-h-[40px] max-h-32`}
            />
            <button type="button" onClick={sendReply} disabled={!reply.trim() || sending || threadLoading} aria-label="Send reply"
              className="px-3 sm:px-4 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex-shrink-0 flex items-center">
              {sending ? <Spinner size="sm" className="border-white border-t-transparent" /> : <FiSend size={16} />}
            </button>
          </div>
        )}
      >
        <p className="text-xs text-secondary-400 mb-3">With {thread?.other?.name}</p>
        <div ref={scrollRef} className="flex flex-col gap-3 min-h-[30vh] max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
          {threadLoading ? <LoadingState className="py-10" label="Loading conversation…" />
            : threadError ? <ErrorState className="py-8" title="Could not load the conversation" message={threadError} />
              : threadMsgs.map((m) => {
                const mine = m.senderId === sub;
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3', mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-900 dark:text-white rounded-bl-md')}>
                      <p className={cn('text-[10px] font-medium', mine ? 'text-primary-100' : 'text-secondary-500')}>{mine ? 'You' : m.senderName}</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                      <p className={cn('text-[10px] mt-1.5', mine ? 'text-primary-200' : 'text-secondary-400')} title={formatDateTime(m.sentAt)}>{timeAgo(m.sentAt)}</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </Modal>

      {/* Compose */}
      <Modal
        open={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        title="New message"
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setComposeOpen(false)} disabled={sending} className={btnGhost}>Cancel</button>
            <button type="button" onClick={sendCompose} disabled={sending} className={btnPrimary}>
              {sending ? <><Spinner size="sm" className="border-white border-t-transparent" /> Sending…</> : <><FiSend size={14} /> Send</>}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="To (patient)" required error={composeErrors.patient} hint="Only patients who have finished registration can receive messages.">
            <PatientPicker value={compose.patient} onChange={(p) => setC('patient', p)} requireAccount error={composeErrors.patient} />
          </Field>
          <Field label="Subject" required error={composeErrors.subject}>
            <input value={compose.subject} onChange={(e) => setC('subject', e.target.value)} maxLength={200} className={inputClass} placeholder="e.g. Your lab results" />
          </Field>
          <Field label="Message" required error={composeErrors.body}>
            <textarea value={compose.body} onChange={(e) => setC('body', e.target.value)} className={`${inputClass} h-32 resize-none leading-relaxed`} placeholder="Type your message…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
