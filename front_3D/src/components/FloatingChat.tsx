import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minus, Maximize2, Plus, ChevronLeft, Trash2, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/ai';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message { role: 'ai' | 'user'; content: string; }
interface AnatNode { name: string; raw_name: string; type: string; }
interface Session {
    id: string;
    conversationId?: string;
    name: string;
    elements: AnatNode[];
    messages: Message[];
    updatedAt: number;
}

type View = 'sessions' | 'chat';

interface FloatingChatProps {
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({ isOpen: propIsOpen, onToggle }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val);
        else setInternalIsOpen(val);
    };

    const [isMinimized, setIsMinimized] = useState(false);
    const [view, setView] = useState<View>('sessions');
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');

    const loadSessions = (): Session[] => {
        try { return JSON.parse(localStorage.getItem('chat_sessions') || '[]'); }
        catch { return []; }
    };

    const [sessions, setSessions] = useState<Session[]>(loadSessions);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedElements, setSelectedElements] = useState<AnatNode[]>([]);

    // Search
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnatNode[]>([]);
    const [roots, setRoots] = useState<AnatNode[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync sessions from backend on open
    useEffect(() => {
        if (!isOpen) return;
        aiService.listConversations().then(serverConvs => {
            const serverMap = new Map(serverConvs.map((c: any) => [c.id, c]));
            setSessions(prev => {
                const synced = prev
                    .map(s => {
                        if (s.conversationId && serverMap.has(s.conversationId)) {
                            const sd = serverMap.get(s.conversationId) as any;
                            if (s.name !== sd.name) return { ...s, name: sd.name };
                        }
                        return s;
                    })
                    .filter(s => {
                        if (s.conversationId) return serverMap.has(s.conversationId);
                        return s.messages.length === 0;
                    });
                return synced;
            });
        }).catch(console.error);

        apiCall('anatomy/roots').then((res: any) => setRoots(res.roots || [])).catch(console.error);
    }, [isOpen]);

    // Persist sessions
    useEffect(() => {
        localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        if (view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessions, currentSessionId, view]);

    // Search anatomy
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            setIsSearching(true);
            const delay = setTimeout(() => {
                apiCall(`anatomy/search?q=${encodeURIComponent(searchQuery)}`)
                    .then((res: any) => setSearchResults(res.results || []))
                    .catch(console.error)
                    .finally(() => setIsSearching(false));
            }, 300);
            return () => clearTimeout(delay);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchQuery]);

    const activeSession = sessions.find(s => s.id === currentSessionId);
    const activeElements = activeSession ? activeSession.elements : selectedElements;

    const startNewChat = () => {
        setCurrentSessionId(null);
        setSelectedElements([]);
        setInput('');
        setIsSearchOpen(false);
        setView('chat');
    };

    const openSession = (id: string) => {
        setCurrentSessionId(id);
        setView('chat');
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const session = sessions.find(s => s.id === id);
        if (session?.conversationId) aiService.deleteConversation(session.conversationId).catch(console.error);
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) { setCurrentSessionId(null); }
    };

    const renameSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const session = sessions.find(s => s.id === id);
        if (!session) return;

        const { value: newName } = await Swal.fire({
            title: t('Renommer la discussion', 'Rename discussion'),
            input: 'text',
            inputValue: session.name,
            showCancelButton: true,
            confirmButtonText: t('Enregistrer', 'Save'),
            cancelButtonText: t('Annuler', 'Cancel'),
            customClass: {
                container: 'swal2-high-zindex'
            }
        });

        if (newName && newName !== session.name) {
            setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
            if (session.conversationId) aiService.renameConversation(session.conversationId, newName).catch(console.error);
        }
    };

    const toggleElement = (node: AnatNode) => {
        if (activeSession) return;
        setSelectedElements(prev => {
            const exists = prev.find(n => n.raw_name === node.raw_name);
            const next = exists ? prev.filter(n => n.raw_name !== node.raw_name) : [...prev, node];
            if (next.length > 0) {
                setInput(language === 'fr' ? `Expliquez-moi : ${next.map(e => e.name).join(', ')}.` : `Explain: ${next.map(e => e.name).join(', ')}.`);
            } else {
                setInput('');
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const msg = input.trim();
        if (!msg || isLoading) return;

        setInput('');
        setIsLoading(true);

        let targetSession = activeSession;

        if (!targetSession) {
            const baseName = selectedElements.length > 0
                ? selectedElements.map(e => e.name).join(' & ')
                : t('Discussion Générale', 'General Discussion');
            targetSession = {
                id: Date.now().toString(),
                name: baseName,
                elements: [...selectedElements],
                messages: [],
                updatedAt: Date.now()
            };
            setSessions(prev => [targetSession!, ...prev]);
            setCurrentSessionId(targetSession.id);
        }

        const userMessage: Message = { role: 'user', content: msg };
        setSessions(prev => prev.map(s =>
            s.id === targetSession!.id ? { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now() } : s
        ));

        let contextText = t('Anatomie humaine en général', 'General human anatomy');
        if (targetSession.elements.length > 0) {
            contextText = targetSession.elements.map(e => `- ${e.name} (${e.type})`).join('\n');
        }

        const userInput = language === 'fr'
            ? `Agis comme un professeur d'anatomie expert. Langue: français.\nSujet(s): ${contextText}\nQuestion: ${msg}\nRéponds en Markdown clair.`
            : `Act as an expert anatomy professor. Language: English.\nSubject(s): ${contextText}\nQuestion: ${msg}\nReply in clear Markdown.`;

        try {
            let conversationId = targetSession.conversationId;
            if (!conversationId) {
                const conv = await aiService.createConversation(targetSession.name);
                conversationId = conv.id;
                setSessions(prev => prev.map(s => s.id === targetSession!.id ? { ...s, conversationId } : s));
            }
            const res = await aiService.generate('phi3:latest', userInput, undefined, 'explain', conversationId);
            const aiMessage: Message = { role: 'ai', content: res.response };
            setSessions(prev => prev.map(s =>
                s.id === targetSession!.id ? { ...s, conversationId: res.conversation_id ?? conversationId, messages: [...s.messages, aiMessage] } : s
            ));
        } catch {
            const aiMessage: Message = { role: 'ai', content: t("_(Erreur de génération)_", "_(Generation error)_") };
            setSessions(prev => prev.map(s =>
                s.id === targetSession!.id ? { ...s, messages: [...s.messages, aiMessage] } : s
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fc-container">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fc-toggle-btn"
                        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                        title={t('Chat Anatomie IA', 'Anatomy AI Chat')}
                    >
                        <MessageSquare size={22} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: 30, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1, height: isMinimized ? '50px' : '520px' }}
                        exit={{ y: 30, opacity: 0, scale: 0.95 }}
                        className={`fc-window ${isMinimized ? 'minimized' : ''}`}
                    >
                        {/* Header */}
                        <div className="fc-header">
                            <div className="fc-header-left">
                                {view === 'chat' && (
                                    <button className="fc-icon-btn" onClick={() => setView('sessions')}>
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                <MessageSquare size={16} />
                                <span>
                                    {view === 'sessions'
                                        ? t('Mes Discussions', 'My Chats')
                                        : (activeSession ? activeSession.name : t('Nouveau Chat', 'New Chat'))
                                    }
                                </span>
                            </div>
                            <div className="fc-header-right">
                                <button className="fc-icon-btn" onClick={() => setIsMinimized(!isMinimized)}>
                                    {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
                                </button>
                                <button className="fc-icon-btn" onClick={() => setIsOpen(false)}>
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* ── SESSIONS VIEW ── */}
                                {view === 'sessions' && (
                                    <div className="fc-sessions-view">
                                        <button className="fc-new-btn" onClick={startNewChat}>
                                            <Plus size={16} />
                                            {t('Nouvelle discussion', 'New discussion')}
                                        </button>
                                        <div className="fc-sessions-list">
                                            {sessions.length === 0 && (
                                                <div className="fc-empty">{t('Aucune discussion. Commencez !', 'No chats yet. Start one!')}</div>
                                            )}
                                            {[...sessions].sort((a, b) => b.updatedAt - a.updatedAt).map(s => (
                                                <div key={s.id} className="fc-session-item" onClick={() => openSession(s.id)}>
                                                    <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                                                    <div className="fc-session-info">
                                                        <span className="fc-session-name">{s.name}</span>
                                                        <span className="fc-session-date">
                                                            {new Date(s.updatedAt).toLocaleDateString()} {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="fc-session-actions">
                                                        <button className="fc-edit-btn" onClick={(e) => renameSession(s.id, e)} title={t('Renommer', 'Rename')}>
                                                            <Edit3 size={13} />
                                                        </button>
                                                        <button className="fc-delete-btn" onClick={(e) => deleteSession(s.id, e)} title={t('Supprimer', 'Delete')}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── CHAT VIEW ── */}
                                {view === 'chat' && (
                                    <>
                                        {/* Element tags */}
                                        <div className="fc-tags">
                                            {activeElements.map(el => (
                                                <span key={el.raw_name} className="fc-tag">
                                                    {el.name}
                                                    {!activeSession && <button onClick={() => toggleElement(el)}>×</button>}
                                                </span>
                                            ))}
                                            {activeElements.length === 0 && (
                                                <span className="fc-tag general">{t('Thème général', 'General topic')}</span>
                                            )}
                                        </div>

                                        {/* Messages */}
                                        <div className="fc-messages">
                                            {(!activeSession || activeSession.messages.length === 0) && (
                                                <div className="fc-welcome">
                                                    <p>{t("Posez une question sur l'anatomie !", "Ask an anatomy question!")}</p>
                                                </div>
                                            )}
                                            {(activeSession?.messages || []).map((m, i) => (
                                                <div key={i} className={`fc-bubble ${m.role}`}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                                </div>
                                            ))}
                                            {isLoading && (
                                                <div className="fc-bubble ai">
                                                    <div className="fc-dots"><span /><span /><span /></div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Input */}
                                        <div className="fc-input-area">
                                            {/* Object selector */}
                                            <div className="fc-plus-wrap">
                                                {!activeSession && (
                                                    <button
                                                        className={`fc-plus-btn ${isSearchOpen ? 'active' : ''}`}
                                                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                                                        type="button"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                )}
                                                <AnimatePresence>
                                                    {isSearchOpen && !activeSession && (
                                                        <motion.div
                                                            className="fc-search-popover"
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 8 }}
                                                        >
                                                            <input
                                                                autoFocus
                                                                placeholder={t('Chercher un élément...', 'Search element...')}
                                                                value={searchQuery}
                                                                onChange={e => setSearchQuery(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                                                            />
                                                            <div className="fc-search-results">
                                                                {isSearching && <div className="fc-popover-msg">{t('Recherche...', 'Searching...')}</div>}
                                                                {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                                                    <div className="fc-popover-msg">{t('Aucun résultat', 'No results')}</div>
                                                                )}
                                                                {searchQuery.trim().length < 2 && (
                                                                    <div className="fc-popover-msg">{t('Tapez pour chercher ou choisissez ci-dessous', 'Type to search or pick below')}</div>
                                                                )}
                                                                {(searchQuery.trim().length >= 2 ? searchResults : roots).map(node => (
                                                                    <div
                                                                        key={node.raw_name}
                                                                        className={`fc-search-item ${selectedElements.find(n => n.raw_name === node.raw_name) ? 'selected' : ''}`}
                                                                        onClick={() => { toggleElement(node); }}
                                                                    >
                                                                        <span>{node.name}</span>
                                                                        <small>{node.type}</small>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <form className="fc-form" onSubmit={handleSubmit}>
                                                <input
                                                    type="text"
                                                    placeholder={t("Votre question...", "Your question...")}
                                                    value={input}
                                                    onChange={e => setInput(e.target.value)}
                                                    disabled={isLoading}
                                                />
                                                <button type="submit" disabled={!input.trim() || isLoading}>
                                                    <Send size={16} />
                                                </button>
                                            </form>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .fc-container {
                    position: fixed;
                    bottom: 24px;
                    right: 84px;
                    z-index: 9999;
                }
                .fc-toggle-btn {
                    width: 52px; height: 52px;
                    border-radius: 50%;
                    background: #3b82f6;
                    color: white; border: none;
                    box-shadow: 0 4px 18px rgba(59,130,246,0.45);
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: 0.2s;
                }
                .fc-toggle-btn:hover { transform: scale(1.06); background: #2563eb; }

                .fc-window {
                    width: 340px;
                    background: #1a1f2e;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                    display: flex; flex-direction: column;
                    overflow: hidden;
                    color: #e2e8f0;
                }
                .fc-window.minimized { overflow: hidden; }

                /* Header */
                .fc-header {
                    padding: 0 14px;
                    height: 50px;
                    background: #3b82f6;
                    color: white;
                    display: flex; align-items: center; justify-content: space-between;
                    flex-shrink: 0;
                    font-size: 13px; font-weight: 700;
                }
                .fc-header-left { display: flex; align-items: center; gap: 8px; }
                .fc-header-right { display: flex; gap: 4px; }
                .fc-icon-btn {
                    background: transparent; border: none; color: white;
                    cursor: pointer; padding: 5px; border-radius: 6px;
                    display: flex; align-items: center; transition: 0.15s;
                }
                .fc-icon-btn:hover { background: rgba(255,255,255,0.15); }

                /* Sessions view */
                .fc-sessions-view {
                    flex: 1; display: flex; flex-direction: column;
                    overflow: hidden;
                    background: #1a1f2e;
                }
                .fc-new-btn {
                    margin: 12px;
                    padding: 10px 14px;
                    background: #3b82f6; color: white; border: none;
                    border-radius: 10px; font-weight: 600; font-size: 13px;
                    cursor: pointer; display: flex; align-items: center; gap: 8px;
                    transition: 0.2s;
                }
                .fc-new-btn:hover { background: #2563eb; }
                .fc-sessions-list { flex: 1; overflow-y: auto; padding: 0 10px 10px; }
                .fc-empty {
                    padding: 30px; text-align: center;
                    color: rgba(226,232,240,0.4); font-size: 13px;
                }
                .fc-session-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 12px; border-radius: 10px;
                    cursor: pointer; transition: 0.15s; margin-bottom: 4px;
                    color: #e2e8f0;
                }
                .fc-session-item:hover { background: rgba(255,255,255,0.07); }
                .fc-session-info { flex: 1; min-width: 0; }
                .fc-session-name {
                    display: block; font-size: 13px; font-weight: 600;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .fc-session-date { font-size: 11px; color: rgba(226,232,240,0.4); }
                .fc-session-actions { display: flex; gap: 4px; opacity: 0; transition: 0.2s; }
                .fc-session-item:hover .fc-session-actions { opacity: 1; }
                .fc-delete-btn, .fc-edit-btn {
                    background: transparent; border: none; color: rgba(226,232,240,0.3);
                    cursor: pointer; padding: 4px; border-radius: 6px;
                    display: flex; align-items: center; transition: 0.15s; flex-shrink: 0;
                }
                .fc-delete-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); }
                .fc-edit-btn:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }
                
                /* Ensure Swal is above everything */
                .swal2-high-zindex {
                    z-index: 100000 !important;
                }

                /* Chat view */
                .fc-tags {
                    padding: 8px 12px;
                    display: flex; flex-wrap: wrap; gap: 6px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    background: #1a1f2e;
                    flex-shrink: 0;
                }
                .fc-tag {
                    display: flex; align-items: center; gap: 5px;
                    background: rgba(59,130,246,0.2); color: #60a5fa;
                    padding: 3px 10px; border-radius: 100px;
                    font-size: 12px; font-weight: 600;
                }
                .fc-tag.general { background: rgba(255,255,255,0.07); color: rgba(226,232,240,0.5); }
                .fc-tag button {
                    background: none; border: none; color: inherit;
                    font-size: 15px; cursor: pointer; padding: 0; margin-left: 2px;
                }
                .fc-messages {
                    flex: 1; overflow-y: auto;
                    padding: 14px;
                    display: flex; flex-direction: column; gap: 10px;
                    background: #0f131e;
                }
                .fc-welcome {
                    height: 100%; display: flex; align-items: center; justify-content: center;
                    text-align: center; font-size: 13px; color: rgba(226,232,240,0.4);
                    padding: 20px;
                }
                .fc-bubble {
                    max-width: 88%;
                    padding: 10px 14px;
                    border-radius: 14px;
                    font-size: 13px; line-height: 1.5;
                }
                .fc-bubble.user {
                    align-self: flex-end;
                    background: #3b82f6; color: white;
                    border-bottom-right-radius: 3px;
                }
                .fc-bubble.ai {
                    align-self: flex-start;
                    background: rgba(255,255,255,0.08); color: #e2e8f0;
                    border-bottom-left-radius: 3px;
                }
                .fc-bubble.ai p, .fc-bubble.ai ul, .fc-bubble.ai ol { margin: 0 0 4px; }
                .fc-bubble.ai code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
                .fc-dots { display: flex; gap: 5px; padding: 3px 0; }
                .fc-dots span {
                    width: 7px; height: 7px; border-radius: 50%; background: #38bdf8;
                    animation: fc-bounce 1.2s infinite;
                }
                .fc-dots span:nth-child(2) { animation-delay: 0.2s; }
                .fc-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes fc-bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.5; }
                    50% { transform: translateY(-4px); opacity: 1; }
                }

                /* Input area */
                .fc-input-area {
                    display: flex; align-items: flex-end; gap: 6px;
                    padding: 10px 12px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                    background: #1a1f2e;
                    flex-shrink: 0;
                    position: relative;
                }
                .fc-plus-wrap { position: relative; flex-shrink: 0; }
                .fc-plus-btn {
                    width: 34px; height: 34px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(226,232,240,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: 0.2s;
                }
                .fc-plus-btn:hover, .fc-plus-btn.active { background: rgba(14,165,233,0.2); color: #38bdf8; border-color: rgba(14,165,233,0.4); }

                .fc-search-popover {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    width: 280px;
                    background: #1a1f2e;
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 12px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
                    overflow: hidden;
                    z-index: 10;
                }
                .fc-search-popover input {
                    width: 100%; box-sizing: border-box;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.05);
                    border: none; border-bottom: 1px solid rgba(255,255,255,0.1);
                    color: #e2e8f0; font-size: 13px; outline: none;
                }
                .fc-search-results { max-height: 160px; overflow-y: auto; }
                .fc-popover-msg { padding: 10px 14px; font-size: 12px; color: rgba(226,232,240,0.4); }
                .fc-search-item {
                    padding: 9px 14px;
                    cursor: pointer; font-size: 13px; transition: 0.15s;
                    display: flex; align-items: center; justify-content: space-between;
                    color: #e2e8f0;
                }
                .fc-search-item:hover { background: rgba(255,255,255,0.06); }
                .fc-search-item.selected { background: rgba(14,165,233,0.15); color: #38bdf8; }
                .fc-search-item small { font-size: 11px; color: rgba(226,232,240,0.4); }

                .fc-form {
                    flex: 1; display: flex; gap: 8px; align-items: center;
                }
                .fc-form input {
                    flex: 1;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 22px;
                    padding: 8px 14px;
                    color: #e2e8f0; font-size: 13px; outline: none;
                    transition: 0.2s;
                }
                .fc-form input:focus { border-color: rgba(59,130,246,0.5); }
                .fc-form button {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: #3b82f6; border: none;
                    color: white; cursor: pointer; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    transition: 0.2s;
                }
                .fc-form button:hover { background: #2563eb; }
                .fc-form button:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default FloatingChat;
