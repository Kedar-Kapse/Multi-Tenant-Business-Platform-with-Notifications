import { useState, useEffect, useCallback } from 'react';
import { FiMessageSquare, FiSend, FiX, FiMail } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { messageApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const PNAME = user?.fullName || user?.username || 'Patient';
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewThread, setViewThread] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [reply, setReply] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ recipientId: '', recipientName: '', subject: '', body: '' });
  const [toast, setToast] = useState(null);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => { setLoading(true); try { setMessages(await messageApi.getAll(PID)); } catch { setMessages([]); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const openThread = async (msg) => {
    setViewThread(msg);
    try { setThreadMsgs(await messageApi.getThread(msg.threadId)); } catch { setThreadMsgs([msg]); }
    if (!msg.read && msg.recipientId === PID) { try { await messageApi.markRead(msg.id); } catch {} }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    const recipient = viewThread.senderId === PID ? { id: viewThread.recipientId, name: viewThread.recipientName, role: viewThread.recipientRole } : { id: viewThread.senderId, name: viewThread.senderName, role: viewThread.senderRole };
    try {
      await messageApi.send({ senderId: PID, senderName: PNAME, senderRole: 'PATIENT', recipientId: recipient.id, recipientName: recipient.name, recipientRole: recipient.role, subject: `Re: ${viewThread.subject}`, body: reply, threadId: viewThread.threadId });
      setReply(''); setThreadMsgs(await messageApi.getThread(viewThread.threadId)); showToast('Reply sent'); load();
    } catch { showToast('Failed to send'); }
  };

  const sendCompose = async () => {
    if (!compose.recipientName.trim() || !compose.subject.trim() || !compose.body.trim()) return;
    try {
      await messageApi.send({ senderId: PID, senderName: PNAME, senderRole: 'PATIENT', recipientId: compose.recipientId || compose.recipientName, recipientName: compose.recipientName, recipientRole: 'PHYSICIAN', subject: compose.subject, body: compose.body });
      setComposeOpen(false); showToast('Message sent'); load();
    } catch { showToast('Failed to send'); }
  };

  // Group by thread
  const threads = {};
  messages.forEach(m => { if (!threads[m.threadId] || new Date(m.sentAt) > new Date(threads[m.threadId].sentAt)) threads[m.threadId] = m; });
  const threadList = Object.values(threads).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const formatTime = (iso) => { const d = Date.now() - new Date(iso).getTime(); if (d < 3600000) return `${Math.floor(d/60000)}m ago`; if (d < 86400000) return `${Math.floor(d/3600000)}h ago`; return new Date(iso).toLocaleDateString(); };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white">{toast}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Messages</h1><p className="text-xs sm:text-sm text-secondary-500">Communicate with your care team.</p></div>
        <button onClick={() => { setCompose({ recipientId: '', recipientName: '', subject: '', body: '' }); setComposeOpen(true); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiMail size={16} /> New Message</button>
      </div>

      <Card>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
          {loading ? <div className="p-12 text-center text-secondary-400">Loading...</div>
          : threadList.length === 0 ? <div className="p-12 text-center text-secondary-400"><FiMessageSquare size={24} className="mx-auto mb-2 opacity-50" />No messages yet.</div>
          : threadList.map(m => {
            const isFromMe = m.senderId === PID;
            const otherName = isFromMe ? m.recipientName : m.senderName;
            return (
              <div key={m.threadId} onClick={() => openThread(m)} className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition hover:bg-secondary-50/50 ${!m.read && m.recipientId === PID ? 'bg-primary-50/30' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{otherName?.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className={`text-sm ${!m.read && m.recipientId === PID ? 'font-bold text-secondary-900' : 'font-medium text-secondary-700'} dark:text-white`}>{otherName}</p>{!m.read && m.recipientId === PID && <span className="w-2 h-2 rounded-full bg-primary-500" />}</div>
                  <p className="text-xs font-medium text-secondary-700 dark:text-secondary-300 mt-0.5">{m.subject}</p>
                  <p className="text-xs text-secondary-400 mt-0.5 line-clamp-1">{m.body}</p>
                </div>
                <span className="text-[10px] text-secondary-400 flex-shrink-0">{formatTime(m.sentAt)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Thread View */}
      <Modal open={!!viewThread} onClose={() => setViewThread(null)} title={viewThread?.subject || 'Conversation'} size="lg">
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {threadMsgs.map(m => (
            <div key={m.id} className={`flex ${m.senderId === PID ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.senderId === PID ? 'bg-primary-600 text-white rounded-br-md' : 'bg-secondary-100 dark:bg-secondary-800 rounded-bl-md'}`}>
                <p className={`text-[10px] font-medium ${m.senderId === PID ? 'text-primary-100' : 'text-secondary-500'}`}>{m.senderName}</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.senderId === PID ? 'text-primary-200' : 'text-secondary-400'}`}>{formatTime(m.sentAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type your reply..." className={inputClass + ' flex-1'} />
          <button onClick={sendReply} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition"><FiSend size={16} /></button>
        </div>
      </Modal>

      {/* Compose */}
      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New Message" size="md">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-secondary-700 mb-1">To</label><input value={compose.recipientName} onChange={e => setCompose(p => ({ ...p, recipientName: e.target.value }))} className={inputClass} placeholder="Doctor's name" /></div>
          <div><label className="block text-xs font-medium text-secondary-700 mb-1">Subject</label><input value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} className={inputClass} placeholder="Subject" /></div>
          <div><label className="block text-xs font-medium text-secondary-700 mb-1">Message</label><textarea value={compose.body} onChange={e => setCompose(p => ({ ...p, body: e.target.value }))} className={inputClass + ' h-32 resize-none'} placeholder="Type your message..." /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100"><button onClick={() => setComposeOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button><button onClick={sendCompose} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Send</button></div>
      </Modal>
    </div>
  );
}
