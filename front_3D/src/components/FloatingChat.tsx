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
interface AnatNode { name: { en: string; fr: string } | string; raw_name: string; type: string; }
interface Session {
    id: string;
    conversationId?: string;
    name: string;
    elements: AnatNode[];
    messages: Message[];
    updatedAt: number;
    pendingJobId?: string; 
}

type View = 'sessions' | 'chat';

interface FloatingChatProps {
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
    externalView?: View;
    onViewChange?: (view: View) => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({ isOpen: propIsOpen, onToggle, externalView, onViewChange }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    // Helper pour extraire le texte depuis l'objet multilingue
    const getLoc = (val: any, fallback: string = ''): string => {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        return val[language] || val['fr'] || val['en'] || fallback;
    };

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val);
        else setInternalIsOpen(val);
    };

    const [isMinimized, setIsMinimized] = useState(false);
    const [internalView, setInternalView] = useState<View>(externalView || 'sessions');
    const view = externalView !== undefined ? externalView : internalView;

    const setView = (v: View) => {
        if (onViewChange) onViewChange(v);
        else setInternalView(v);
    };
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [input]);

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

    // Resume polling for pending jobs
    useEffect(() => {
        sessions.forEach(session => {
            if (session.pendingJobId && !isLoading) {
                resumeJob(session.pendingJobId, session.id);
            }
        });
    }, [currentSessionId]);

    const resumeJob = async (jobId: string, sessionId: string) => {
        setIsLoading(true);
        try {
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                const res = await aiService.pollStatus(jobId);
                
                if (res.status === 'done') {
                    clearInterval(poll);
                    const aiMessage: Message = { role: 'ai', content: res.response };
                    setSessions(prev => prev.map(s => 
                        s.id === sessionId ? { ...s, pendingJobId: undefined, messages: [...s.messages, aiMessage] } : s
                    ));
                    if (sessionId === currentSessionId) {
                        setIsLoading(false);
                        showSuccessToast();
                    }
                } else if (res.status === 'error' || attempts > 100) {
                    clearInterval(poll);
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pendingJobId: undefined } : s));
                    if (sessionId === currentSessionId) setIsLoading(false);
                }
            }, 3000);
        } catch (e) {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pendingJobId: undefined } : s));
            if (sessionId === currentSessionId) setIsLoading(false);
        }
    };

    const showSuccessToast = () => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: '#fff',
            color: '#056CF2'
        });
        Toast.fire({ icon: 'success', title: t('IA: Réponse prête !', 'AI: Response ready!') });
    };

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
                setInput(language === 'fr' ? `Expliquez-moi : ${next.map(e => getLoc(e.name)).join(', ')}.` : `Explain: ${next.map(e => getLoc(e.name)).join(', ')}.`);
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
                ? selectedElements.map(e => getLoc(e.name)).join(' & ')
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
            contextText = targetSession.elements.map(e => `- ${getLoc(e.name)} (${e.type})`).join('\n');
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
            
            const initialRes = await aiService.startGenerate('phi3:latest', userInput, undefined, 'explain', conversationId);
            
            if (initialRes.job_id) {
                // On marque la session avec le jobId en cours
                setSessions(prev => prev.map(s => 
                    s.id === targetSession!.id ? { ...s, conversationId: initialRes.conversation_id || conversationId, pendingJobId: initialRes.job_id } : s
                ));
                // On lance le polling
                resumeJob(initialRes.job_id, targetSession.id);
            }
        } catch (err: any) {
            const aiMessage: Message = { role: 'ai', content: t("_(Erreur de génération)_", "_(Generation error)_") + "\n\n" + (err.message || "") };
            setSessions(prev => prev.map(s =>
                s.id === targetSession!.id ? { ...s, messages: [...s.messages, aiMessage] } : s
            ));
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
                        <MessageSquare size={26} fill="currentColor" fillOpacity={0.1} />
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
                                                    {getLoc(el.name)}
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
                                                                        <span>{getLoc(node.name)}</span>
                                                                        <small>{node.type}</small>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <form className="fc-form" onSubmit={handleSubmit}>
                                                <textarea
                                                    ref={textareaRef}
                                                    placeholder={t("Votre question...", "Your question...")}
                                                    value={input}
                                                    onChange={e => setInput(e.target.value)}
                                                    onKeyDown={e => {
                                                       if (e.key === 'Enter' && !e.shiftKey) {
                                                           e.preventDefault();
                                                           handleSubmit(e);
                                                       }
                                                    }}
                                                    disabled={isLoading}
                                                    rows={1}
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
                .fc-toggle-btn {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: white;
                    color: #056CF2;
                    border: none;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    cursor: pointer;
                    transition: transform 0.2s, bottom 0.2s, right 0.2s, left 0.2s;
                }
                .fc-toggle-btn:hover {
                    transform: scale(1.1);
                }

                @media (max-width: 768px) {
                    .fc-toggle-btn {
                        bottom: 20px;
                        right: auto;
                        left: 20px; /* Déplacer à gauche sur mobile */
                    }
                }

                .unified-messenger .fc-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                }
                .unified-messenger .fc-window {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    background: transparent;
                    border: none;
                    box-shadow: none;
                }
                .unified-messenger .fc-messages {
                    flex: 1;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    overflow-y: auto;
                    background: #F7F8FB;
                }
                .unified-messenger .fc-bubble {
                    max-width: 85%;
                    padding: 12px 18px;
                    border-radius: 20px;
                    font-size: 14px;
                    line-height: 1.5;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .unified-messenger .fc-bubble.user {
                    align-self: flex-end;
                    background: #6861F2;
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                .unified-messenger .fc-bubble.bot, 
                .unified-messenger .fc-bubble.ai {
                    align-self: flex-start;
                    background: white;
                    color: #1f2937;
                    border-bottom-left-radius: 4px;
                    border: 1px solid #e5e7eb;
                }
                .unified-messenger .fc-bubble strong { color: inherit; }
                
                .unified-messenger .fc-input-area {
                    padding: 18px;
                    background: white;
                    border-top: 1px solid #f0f0f0;
                }
                .unified-messenger .fc-form {
                    display: flex;
                    gap: 10px;
                    width: 100%;
                }
                .unified-messenger .fc-form input {
                    flex: 1;
                    padding: 12px 20px;
                    border-radius: 25px;
                    border: 1px solid #e5e7eb;
                    background: #f9fafb;
                    font-size: 14px;
                    outline: none;
                    transition: 0.2s;
                }
                .unified-messenger .fc-form input:focus {
                    border-color: #6861F2;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(104, 97, 242, 0.1);
                }
                .unified-messenger .fc-form button {
                    width: 45px; height: 45px;
                    background: #6861F2;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .unified-messenger .fc-form button:hover:not(:disabled) {
                    transform: scale(1.08);
                    background: #5a52e0;
                }
                .unified-messenger .fc-new-btn {
                    margin: 20px;
                    padding: 12px;
                    background: white;
                    border: 1px dashed #056CF2;
                    color: #056CF2;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .unified-messenger .fc-new-btn:hover { background: #EEF2FF; border-style: solid; }

                .unified-messenger .fc-sessions-list {
                    padding: 0 20px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .unified-messenger .fc-session-item {
                    background: white;
                    padding: 15px;
                    border-radius: 14px;
                    border: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .unified-messenger .fc-session-item:hover { border-color: #056CF2; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                
                .unified-messenger .fc-session-info { flex: 1; display: flex; flex-direction: column; }
                .unified-messenger .fc-session-name { font-weight: 600; color: #1f2937; font-size: 14px; }
                .unified-messenger .fc-session-date { font-size: 11px; color: #94a3b8; margin-top: 2px; }

                .unified-messenger .fc-session-actions { display: flex; gap: 5px; opacity: 0; transition: 0.2s; }
                .unified-messenger .fc-session-item:hover .fc-session-actions { opacity: 1; }
                
                .unified-messenger .fc-edit-btn, 
                .unified-messenger .fc-delete-btn {
                    padding: 6px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    background: #f1f5f9;
                    color: #64748b;
                    transition: 0.2s;
                }
                .unified-messenger .fc-edit-btn:hover { background: #EEF2FF; color: #056CF2; }
                .unified-messenger .fc-delete-btn:hover { background: #FEE2E2; color: #EF4444; }

                .unified-messenger .fc-tags {
                    padding: 10px 20px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    background: white;
                    border-bottom: 1px solid #f0f0f0;
                }
                .unified-messenger .fc-tag {
                    padding: 4px 10px;
                    background: #EEF2FF;
                    color: #056CF2;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .unified-messenger .fc-tag button { background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 14px; }
                
                /* Chat messages theme */
                .unified-messenger .fc-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; padding: 20px; }
                .unified-messenger .fc-bubble { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; }
                .unified-messenger .fc-bubble.ai { align-self: flex-start; background: #f1f5f9; color: #1f2937; border-bottom-left-radius: 4px; }
                .unified-messenger .fc-bubble.user { align-self: flex-end; background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%); color: white; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(5, 108, 242, 0.2); }
                
                .unified-messenger .fc-welcome {
                    padding: 40px 20px;
                    text-align: center;
                    opacity: 0.9;
                }
                .unified-messenger .fc-welcome p {
                    font-size: 16px;
                    font-weight: 700;
                    color: #056CF2;
                    margin-bottom: 8px;
                    line-height: 1.5;
                }

                /* Loading dots animation */
                .unified-messenger .fc-dots { display: flex; gap: 4px; align-items: center; padding: 5px 0; }
                .unified-messenger .fc-dots span { 
                    width: 6px; height: 6px; 
                    background: #056CF2; 
                    border-radius: 50%; 
                    display: inline-block;
                    animation: fc-bounce 1.4s infinite ease-in-out both;
                }
                .unified-messenger .fc-dots span:nth-child(1) { animation-delay: -0.32s; }
                .unified-messenger .fc-dots span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes fc-bounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }

                /* Chat Input Area update */
                .unified-messenger .fc-input-area { 
                    padding: 15px 20px; 
                    background: white; 
                    border-top: 1px solid #f0f0f0; 
                    display: flex; 
                    gap: 12px; 
                    align-items: flex-end;
                    position: relative;
                }
                .unified-messenger .fc-form { 
                    flex: 1; 
                    display: flex; 
                    gap: 8px; 
                }
                .unified-messenger .fc-form textarea { 
                    flex: 1; 
                    border: 1px solid #e5e7eb; 
                    padding: 10px 15px; 
                    border-radius: 12px; 
                    font-size: 14px; 
                    transition: border-color 0.2s;
                    resize: none;
                    max-height: 120px;
                    overflow-y: auto;
                    font-family: inherit;
                    line-height: 1.4;
                }
                .unified-messenger .fc-form textarea:focus { outline: none; border-color: #056CF2; box-shadow: 0 0 0 3px rgba(5, 108, 242, 0.1); }
                
                .unified-messenger .fc-form button { 
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%); 
                    color: white; border: none; border-radius: 10px; width: 42px; height: 42px; 
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
                }
                .unified-messenger .fc-form button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(5, 108, 242, 0.2); }
                .unified-messenger .fc-form button:disabled { opacity: 0.5; cursor: not-allowed; }

                .unified-messenger .fc-plus-btn {
                    width: 42px;
                    height: 42px;
                    border-radius: 10px;
                    border: 1px solid #e5e7eb;
                    background: #f8fafc;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .unified-messenger .fc-plus-btn:hover { background: #EEF2FF; color: #056CF2; border-color: #056CF2; }
                .unified-messenger .fc-plus-btn.active { background: #056CF2; color: white; border-color: #056CF2; transform: rotate(45deg); }

                /* Search Popover */
                .unified-messenger .fc-search-popover {
                    position: absolute;
                    bottom: 100%;
                    left: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
                    margin-bottom: 15px;
                    max-height: 300px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 10;
                }
                .unified-messenger .fc-search-popover input {
                    padding: 15px;
                    border: none;
                    border-bottom: 1px solid #f0f0f0;
                    width: 100%;
                    outline: none;
                }
                .unified-messenger .fc-search-results { overflow-y: auto; flex: 1; }
                .unified-messenger .fc-search-item { padding: 12px 15px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; border-bottom: 1px solid #f8fafc; }
                .unified-messenger .fc-search-item:hover { background: #f8fafc; }
                .unified-messenger .fc-search-item.selected { background: #EEF2FF; border-left: 3px solid #056CF2; }
                .unified-messenger .fc-search-item span { font-weight: 600; font-size: 13px; color: #1f2937; }
                .unified-messenger .fc-search-item small { font-size: 11px; color: #94a3b8; }
                .unified-messenger .fc-popover-msg { padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default FloatingChat;
