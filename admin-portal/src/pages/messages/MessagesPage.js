import { useState, useEffect, useCallback, useRef } from 'react';
import { FiMessageSquare, FiSend, FiMail, FiSearch, FiCheck } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { messageApi } from '../../services/organizationService';
import { patientApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';
import useDebounce from '../../hooks/useDebounce';
import { formatRelativeTime } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

/**
 * Pick a patient by searching the server. Only patients who have registered
 * (have a login) can read messages, so the others are shown but disabled.
 */
function PatientPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    patientApi.list(0, 20, query || undefined)
      .then((data) => { if (id === requestId.current) setResults(data?.content ?? []); })
      .catch(() => { if (id === requestId.current) setResults([]); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [query]);

  if (value.id) {
    return (
      <div className={`${inputClass} flex items-center justify-between`}>
        <span className="truncate">{value.name}</span>
        <button type="button" onClick={() => onChange({ id: '', name: '' })} className="text-xs font-medium text-primary-600 hover:text-primary-700 ml-2">Change</button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="relative border-b border-secondary-100 dark:border-secondary-700">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={13} />
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or MRN…"
          className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white outline-none" />
      </div>
      <ul className="max-h-56 overflow-y-auto scrollbar-thin">
        {loading && <li className="px-3 py-3 text-xs text-secondary-400">Searching…</li>}
        {!loading && results.length === 0 && <li className="px-3 py-3 text-xs text-secondary-400">No patients found.</li>}
        {!loading && results.map((p) => {
          const canMessage = !!p.keycloakUserId;
          return (
            <li key={p.id}>
              <button type="button" disabled={!canMessage}
                onClick={() => onChange({ id: p.keycloakUserId, name: `${p.firstName} ${p.lastName}` })}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <span className="min-w-0">
                  <span className="block text-sm text-secondary-900 dark:text-white truncate">{p.firstName} {p.lastName}</span>
                  <span className="block text-[11px] text-secondary-400 truncate">{p.mrn ? `MRN ${p.mrn} · ` : ''}{p.email}</span>
                </span>
                {!canMessage && <span className="text-[10px] text-warning-600 whitespace-nowrap">Not registered yet</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MessagesPage() {
  const me = useAuthStore((s) => s.user?.sub);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewThread, setViewThread] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ recipientId: '', recipientName: '', subject: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setMessages(await messageApi.getAll()); }
    catch (e) { setError(e.response?.data?.message || 'Could not load messages.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openThread = async (msg) => {
    setViewThread(msg);
    setThreadMsgs([]);
    setReply('');
    setThreadLoading(true);
    try {
      setThreadMsgs(await messageApi.getThread(msg.threadId));
      if (!msg.read && msg.recipientId === me) {
        await messageApi.markThreadRead(msg.threadId);
        setMessages((prev) => prev.map((m) => (m.threadId === msg.threadId && m.recipientId === me ? { ...m, read: true } : m)));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not open the conversation');
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    const fromMe = viewThread.senderId === me;
    const other = fromMe
      ? { id: viewThread.recipientId, name: viewThread.recipientName, role: viewThread.recipientRole }
      : { id: viewThread.senderId, name: viewThread.senderName, role: viewThread.senderRole };
    setSending(true);
    try {
      await messageApi.send({
        recipientId: other.id, recipientName: other.name, recipientRole: other.role,
        subject: viewThread.subject.startsWith('Re: ') ? viewThread.subject : `Re: ${viewThread.subject}`,
        body: reply.trim(), threadId: viewThread.threadId,
      });
      setReply('');
      setThreadMsgs(await messageApi.getThread(viewThread.threadId));
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Your reply was not sent');
    } finally {
      setSending(false);
    }
  };

  const sendCompose = async () => {
    if (sending) return;
    if (!compose.recipientId) { toast.error('Choose a patient'); return; }
    if (!compose.subject.trim() || !compose.body.trim()) { toast.error('Subject and message are required'); return; }
    setSending(true);
    try {
      await messageApi.send({
        recipientId: compose.recipientId, recipientName: compose.recipientName, recipientRole: 'PATIENT',
        subject: compose.subject.trim(), body: compose.body.trim(),
      });
      setComposeOpen(false);
      toast.success('Message sent');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Your message was not sent');
    } finally {
      setSending(false);
    }
  };

  // newest message per conversation
  const threads = {};
  messages.forEach((m) => {
    if (!threads[m.threadId] || new Date(m.sentAt) > new Date(threads[m.threadId].sentAt)) threads[m.threadId] = m;
  });
  const unreadThreads = new Set(messages.filter((m) => !m.read && m.recipientId === me).map((m) => m.threadId));
  const threadList = Object.values(threads).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Messages</h1>
          <p className="text-xs sm:text-sm text-secondary-500">Conversations with patients.</p>
        </div>
        <button onClick={() => { setCompose({ recipientId: '', recipientName: '', subject: '', body: '' }); setComposeOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition shadow-sm w-full sm:w-auto">
          <FiMail size={16} /> New Message
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-sm text-secondary-400">Loading…</div>
        ) : error ? (
          <EmptyState icon={FiMessageSquare} title="Couldn't load messages" description={error}
            action={<button onClick={load} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} />
        ) : threadList.length === 0 ? (
          <EmptyState icon={FiMessageSquare} title="No messages yet" description="Conversations with patients will appear here." />
        ) : (
          <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {threadList.map((m) => {
              const otherName = m.senderId === me ? m.recipientName : m.senderName;
              const isUnread = unreadThreads.has(m.threadId);
              return (
                <li key={m.threadId}>
                  <button type="button" onClick={() => openThread(m)}
                    className={`w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50 ${isUnread ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}>
                    <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {(otherName || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm truncate ${isUnread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-200'}`}>{otherName}</span>
                          {isUnread && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                        </span>
                        <span className="text-[10px] text-secondary-400 flex-shrink-0 whitespace-nowrap">{formatRelativeTime(m.sentAt)}</span>
                      </span>
                      <span className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mt-0.5 truncate">{m.subject}</span>
                      <span className="block text-xs text-secondary-400 mt-0.5 truncate">{m.senderId === me && <FiCheck className="inline mr-1" size={11} />}{m.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={!!viewThread} onClose={() => setViewThread(null)} title={viewThread?.subject || 'Conversation'} size="lg">
        <div className="flex flex-col gap-3 min-h-[30vh] max-h-[50dvh] overflow-y-auto scrollbar-thin pr-1 mb-1">
          {threadLoading && <p className="text-center text-xs text-secondary-400 py-8">Loading conversation…</p>}
          {threadMsgs.map((m) => {
            const mine = m.senderId === me;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-900 dark:text-white rounded-bl-md'}`}>
                  <p className={`text-[10px] font-medium ${mine ? 'text-primary-100' : 'text-secondary-500'}`}>{m.senderName}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                  <p className={`text-[10px] mt-1.5 ${mine ? 'text-primary-200' : 'text-secondary-400'}`}>{formatRelativeTime(m.sentAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-4 border-t border-secondary-100 dark:border-secondary-700">
          <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            placeholder="Write a reply… (Shift+Enter for a new line)" className={`${inputClass} flex-1 resize-none`} />
          <button onClick={sendReply} disabled={!reply.trim() || sending} aria-label="Send reply"
            className="px-3 sm:px-4 self-end py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition flex-shrink-0">
            <FiSend size={16} />
          </button>
        </div>
      </Modal>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New Message" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">To (patient)</label>
            <PatientPicker value={{ id: compose.recipientId, name: compose.recipientName }}
              onChange={(p) => setCompose((prev) => ({ ...prev, recipientId: p.id, recipientName: p.name }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Subject</label>
            <input value={compose.subject} maxLength={200} onChange={(e) => setCompose((prev) => ({ ...prev, subject: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Message</label>
            <textarea rows={5} value={compose.body} onChange={(e) => setCompose((prev) => ({ ...prev, body: e.target.value }))} className={`${inputClass} resize-y`} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button onClick={() => setComposeOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">Cancel</button>
            <button onClick={sendCompose} disabled={sending}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              <FiSend size={14} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
