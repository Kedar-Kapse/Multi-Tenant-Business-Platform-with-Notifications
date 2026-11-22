import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiSend, FiEdit3 } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, LoadingState, SkeletonList, Spinner } from '../../components/ui/States';
import { Field, inputClass, primaryBtn, secondaryBtn } from '../../components/ui/form';
import { toast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import useBadgeStore from '../../store/badgeStore';
import { messageApi, providerApi, providerName } from '../../services/patientService';
import { errorMessage, humanize, parseServerDateTime, relativeTime } from '../../utils/format';

const EMPTY_COMPOSE = { recipientId: '', subject: '', body: '' };
const SUBJECT_MAX = 200;
const replySubject = (s) => {
  const base = String(s || '').replace(/^(re:\s*)+/i, '').trim() || '(no subject)';
  return `Re: ${base}`.slice(0, SUBJECT_MAX);
};
const ts = (m) => parseServerDateTime(m.sentAt)?.getTime() || 0;

export default function MessagesPage() {
  const me = useAuthStore((s) => s.user?.sub);
  const refreshBadge = useBadgeStore((s) => s.refreshMessages);
  const refreshNotifBadge = useBadgeStore((s) => s.refreshNotifications);
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [thread, setThread] = useState(null); // { threadId, subject, other }
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [threadState, setThreadState] = useState({ loading: false, error: null });
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState(EMPTY_COMPOSE);
  const [sendingCompose, setSendingCompose] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsState, setRecipientsState] = useState({ loading: false, error: null });

  const inFlight = useRef(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await messageApi.mine();
      setMessages(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // One row per conversation: latest message + how many are unread for me.
  const threads = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => {
      const key = m.threadId || m.id;
      const t = map.get(key) || { threadId: key, latest: m, unread: 0, first: m };
      if (ts(m) > ts(t.latest)) t.latest = m;
      if (ts(m) < ts(t.first)) t.first = m;
      if (!m.read && m.recipientId === me) t.unread += 1;
      map.set(key, t);
    });
    return [...map.values()].sort((a, b) => ts(b.latest) - ts(a.latest));
  }, [messages, me]);

  const otherParty = useCallback((m) => (m.senderId === me
    ? { id: m.recipientId, name: m.recipientName, role: m.recipientRole }
    : { id: m.senderId, name: m.senderName, role: m.senderRole }), [me]);

  const loadThread = useCallback(async (threadId) => {
    setThreadState({ loading: true, error: null });
    try {
      const list = await messageApi.thread(threadId);
      setThreadMsgs(Array.isArray(list) ? list : []);
      setThreadState({ loading: false, error: null });
    } catch (err) {
      setThreadState({ loading: false, error: errorMessage(err, 'Could not open this conversation.') });
    }
  }, []);

  const openThread = async (t) => {
    setThread({ threadId: t.threadId, subject: t.first.subject || t.latest.subject, other: otherParty(t.latest) });
    setThreadMsgs([]);
    setReply('');
    loadThread(t.threadId);
    if (t.unread > 0) {
      try {
        await messageApi.markThreadRead(t.threadId);
        setMessages((prev) => prev.map((m) => ((m.threadId || m.id) === t.threadId && m.recipientId === me ? { ...m, read: true } : m)));
        refreshBadge();
        refreshNotifBadge();
      } catch { /* not critical: it stays unread */ }
    }
  };

  useEffect(() => {
    if (threadMsgs.length) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [threadMsgs]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !thread || inFlight.current) return;
    inFlight.current = true;
    setSendingReply(true);
    try {
      await messageApi.send({
        recipientId: thread.other.id,
        recipientName: thread.other.name,
        recipientRole: thread.other.role,
        subject: replySubject(thread.subject),
        body,
        threadId: thread.threadId,
      });
      setReply('');
      toast.success('Reply sent.');
      loadThread(thread.threadId);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Your reply was not sent. Please try again.'));
    } finally {
      inFlight.current = false;
      setSendingReply(false);
    }
  };

  const loadRecipients = useCallback(async (preselect) => {
    setRecipientsState({ loading: true, error: null });
    try {
      const page = await providerApi.directory({ size: 100 });
      const list = page?.content || [];
      if (preselect && !list.some((p) => p.id === preselect.id)) list.unshift(preselect);
      setRecipients(list);
      setRecipientsState({ loading: false, error: null });
    } catch (err) {
      setRecipients(preselect ? [preselect] : []);
      setRecipientsState({ loading: false, error: errorMessage(err, 'Could not load your care team.') });
    }
  }, []);

  const openCompose = useCallback((provider) => {
    setCompose({ ...EMPTY_COMPOSE, recipientId: provider?.id || '' });
    setComposeOpen(true);
    loadRecipients(provider);
  }, [loadRecipients]);

  // Opened from Find Providers ("Message") or the dashboard.
  useEffect(() => {
    if (location.state?.compose) {
      openCompose(location.state.provider || null);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate, openCompose]);

  const recipient = recipients.find((p) => p.id === compose.recipientId);
  const canSendCompose = !!(recipient && compose.subject.trim() && compose.body.trim()) && !sendingCompose;

  const sendCompose = async () => {
    if (!canSendCompose || inFlight.current) return;
    inFlight.current = true;
    setSendingCompose(true);
    try {
      await messageApi.send({
        recipientId: recipient.id,
        recipientName: providerName(recipient),
        recipientRole: recipient.role,
        subject: compose.subject.trim().slice(0, SUBJECT_MAX),
        body: compose.body.trim(),
      });
      setComposeOpen(false);
      toast.success(`Message sent to ${providerName(recipient)}.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Your message was not sent. Please try again.'));
    } finally {
      inFlight.current = false;
      setSendingCompose(false);
    }
  };

  const replyBox = (
    <div className="flex items-end gap-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReply(); } }}
        placeholder="Write a reply…"
        rows={2}
        disabled={sendingReply || !!threadState.error}
        aria-label="Reply"
        className={`${inputClass} flex-1 resize-none max-h-40 leading-relaxed`}
      />
      <button type="button" onClick={sendReply} disabled={!reply.trim() || sendingReply || !!threadState.error} aria-label="Send reply"
        className="h-10 px-3 sm:px-4 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex-shrink-0 flex items-center gap-2 text-sm font-medium">
        {sendingReply ? <Spinner size="sm" /> : <FiSend size={16} />}<span className="hidden sm:inline">Send</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        subtitle="Secure messages with your care team."
        actions={<button type="button" onClick={() => openCompose(null)} className={primaryBtn}><FiEdit3 size={16} /> New message</button>}
      />

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : loading && !messages.length ? (
        <SkeletonList rows={4} />
      ) : threads.length === 0 ? (
        <Card>
          <EmptyState icon={FiMessageSquare} title="No messages yet" description="Start a conversation with your doctor, nurse or therapist."
            action={<button type="button" onClick={() => openCompose(null)} className={primaryBtn}><FiEdit3 size={14} /> New message</button>} />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {threads.map((t) => {
              const other = otherParty(t.latest);
              const unread = t.unread > 0;
              return (
                <li key={t.threadId}>
                  <button type="button" onClick={() => openThread(t)}
                    className={`w-full text-left px-3.5 sm:px-5 py-3.5 flex items-start gap-3 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50 ${unread ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}>
                    <Avatar name={other.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${unread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-200'}`}>{other.name}</p>
                        <span className="text-[10px] text-secondary-400 flex-shrink-0 whitespace-nowrap">{relativeTime(t.latest.sentAt)}</span>
                      </div>
                      <p className="text-xs font-medium text-secondary-600 dark:text-secondary-300 mt-0.5 truncate">{t.first.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-secondary-400 truncate flex-1 min-w-0">{t.latest.senderId === me ? 'You: ' : ''}{t.latest.body}</p>
                        {unread && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{t.unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Conversation */}
      <Modal
        open={!!thread}
        onClose={() => { if (!sendingReply) setThread(null); }}
        title={thread ? <span className="block min-w-0"><span className="block truncate">{thread.subject}</span><span className="block text-xs font-normal text-secondary-500 truncate">with {thread.other.name}{thread.other.role ? ` · ${humanize(thread.other.role)}` : ''}</span></span> : ''}
        size="lg"
        footer={replyBox}
        bodyClassName="bg-secondary-50/60 dark:bg-secondary-950/40"
      >
        {threadState.error ? (
          <ErrorState message={threadState.error} onRetry={() => loadThread(thread.threadId)} />
        ) : threadState.loading && !threadMsgs.length ? (
          <LoadingState label="Opening conversation…" />
        ) : (
          <div className="flex flex-col gap-3 min-h-[30vh]">
            {threadMsgs.map((m) => {
              const mine = m.senderId === me;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-900 dark:text-white rounded-bl-md'}`}>
                    <p className={`text-[10px] font-medium ${mine ? 'text-primary-100' : 'text-secondary-500'}`}>{mine ? 'You' : m.senderName}</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-primary-200' : 'text-secondary-400'}`}>{relativeTime(m.sentAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </Modal>

      {/* New message */}
      <Modal
        open={composeOpen}
        onClose={() => { if (!sendingCompose) setComposeOpen(false); }}
        title="New message"
        size="md"
        footer={(
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button type="button" onClick={() => setComposeOpen(false)} disabled={sendingCompose} className={secondaryBtn}>Cancel</button>
            <button type="button" onClick={sendCompose} disabled={!canSendCompose} className={primaryBtn}>
              {sendingCompose ? <Spinner size="sm" /> : <FiSend size={14} />} {sendingCompose ? 'Sending…' : 'Send message'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <Field label="To" required htmlFor="recipientId" error={recipientsState.error}
            hint={!recipientsState.loading && !recipientsState.error && recipients.length === 0 ? 'No care-team members are available to message yet.' : undefined}>
            <Select
              name="recipientId"
              value={compose.recipientId}
              onChange={(e) => setCompose((p) => ({ ...p, recipientId: e.target.value }))}
              options={recipients.map((p) => ({ value: p.id, label: `${providerName(p)} — ${p.specialization || humanize(p.role)}` }))}
              placeholder={recipientsState.loading ? 'Loading care team…' : 'Choose a doctor, nurse or therapist'}
              searchable
              disabled={recipientsState.loading || sendingCompose}
            />
          </Field>
          <Field label="Subject" required htmlFor="subject">
            <input id="subject" value={compose.subject} maxLength={SUBJECT_MAX} disabled={sendingCompose} onChange={(e) => setCompose((p) => ({ ...p, subject: e.target.value }))} className={inputClass} placeholder="What is this about?" />
          </Field>
          <Field label="Message" required htmlFor="body" hint="Don't use messages for emergencies — call the hospital or emergency services.">
            <textarea id="body" value={compose.body} disabled={sendingCompose} onChange={(e) => setCompose((p) => ({ ...p, body: e.target.value }))} className={`${inputClass} h-36 resize-none leading-relaxed`} placeholder="Type your message…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
