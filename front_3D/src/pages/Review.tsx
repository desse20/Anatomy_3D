import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Pencil, Trash2, MessageSquare, Plus, Send, Menu, Maximize2, Minimize2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { aiService } from '../services/ai';
import { formatChatContent, getCopyText } from '../utils/chatMessageFormat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnatNode {
    name: { en: string; fr: string } | string;
    raw_name: string;
    type: string;
    child_count: number;
}
interface Message {
    role: 'ai' | 'user';
    content: string;
}
interface Session {
    id: string;             // ID local (timestamp)
    conversationId?: string; // UUID de la conversation backend
    name: string;
    elements: AnatNode[];
    messages: Message[];
    updatedAt: number;
    createdAt?: number;
    pendingJobId?: string; 
}

const Review: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const { id: urlId } = useParams();
    const navigate = useNavigate();

    // Helper pour extraire le texte depuis l'objet multilingue
    const getLoc = (val: any, fallback: string = ''): string => {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        return val[language] || val['fr'] || val['en'] || fallback;
    };

    const loadSessions = (): Session[] => {
        const stored = localStorage.getItem('chat_sessions') || localStorage.getItem('review_sessions');
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch {
            return [];
        }
    };

    const [sessions, setSessions] = useState<Session[]>(loadSessions);
    
    // Initialiser currentSessionId à partir de l'URL si présent
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
        if (!urlId) return null;
        const stored = loadSessions();
        const found = stored.find(s => s.id === urlId || s.conversationId === urlId);
        return found ? found.id : null;
    });
    const [selectedElements, setSelectedElements] = useState<AnatNode[]>([]);
    
    // UI states
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    
    // Search elements state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AnatNode[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Editing title state
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const [isMaximized, setIsMaximized] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollIntervals = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
    const navigatingFromCode = useRef(false);

    // ── Sync localStorage ↔ backend ────────────────────────────────────────
    // Au montage, on récupère les conversations existantes en BDD et on purge
    // les sessions locales dont le conversationId n'existe plus (ex. après migrate:fresh).
    useEffect(() => {
        aiService.listConversations()
            .then((serverConvs) => {
                const serverMap = new Map(serverConvs.map(c => [c.id, c]));
                setSessions(prev => {
                    let changed = false;
                    const synced = prev.map(s => {
                        if (s.conversationId && serverMap.has(s.conversationId)) {
                            const serverData = serverMap.get(s.conversationId)!;
                            // Si le nom en BDD est différent du nom local, on synchronise
                            if (s.name !== serverData.name) {
                                changed = true;
                                return { ...s, name: serverData.name };
                            }
                        }
                        return s;
                    }).filter(s => {
                        // Purge des orphelins (conversation supprimée en BDD ou ancien système)
                        if (s.conversationId) return serverMap.has(s.conversationId);
                        return s.messages.length === 0;
                    });

                    if (synced.length !== prev.length) changed = true;
                    return changed ? synced : prev;
                });
            })
            .catch(console.error);

        // REPRISE DES JOBS EN COURS
        const stored = loadSessions();
        stored.forEach(s => {
            if (s.pendingJobId) resumeJob(s.pendingJobId, s.id);
        });

        return () => {
            pollIntervals.current.forEach(clearInterval);
            pollIntervals.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect 1: Quand l'utilisateur change de session (clic, nouveau message),
    // on met à jour l'URL et on pose un flag pour qu'Effect 2 ignore ce changement.
    useEffect(() => {
        if (currentSessionId) {
            const session = sessions.find(s => s.id === currentSessionId);
            if (session && session.id !== urlId) {
                navigatingFromCode.current = true;
                navigate(`/chat/${session.id}`, { replace: true });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSessionId, navigate]);

    // Effect 2: Quand l'URL change de l'extérieur (back/forward, saisie directe),
    // on active la session correspondante. On ignore les changements qu'on a nous-mêmes déclenchés.
    useEffect(() => {
        if (navigatingFromCode.current) {
            navigatingFromCode.current = false;
            return;
        }
        if (urlId) {
            const found = sessions.find(s => s.id === urlId || s.conversationId === urlId);
            if (found && found.id !== currentSessionId) {
                setCurrentSessionId(found.id);
            }
        } else if (currentSessionId) {
            setCurrentSessionId(null);
        }
    }, [urlId, sessions]);

    const resumeJob = async (jobId: string, sessionId: string) => {
        if (sessionId === currentSessionId) setIsChatting(true);
        try {
            let attempts = 0;
            const poll = setInterval(async () => {
                try {
                    attempts++;
                    const res = await aiService.pollStatus(jobId);
                    
                    if (res.status === 'done') {
                        clearInterval(poll);
                        pollIntervals.current.delete(poll);
                        const aiMessage: Message = { role: 'ai', content: res.response };
                        setSessions(prev => prev.map(s => 
                            s.id === sessionId ? { ...s, pendingJobId: undefined, messages: [...s.messages, aiMessage] } : s
                        ));
                        if (sessionId === currentSessionId) {
                            setIsChatting(false);
                            showSuccessToast();
                        }
                    } else if (res.status === 'error' || attempts > 100) {
                        clearInterval(poll);
                        pollIntervals.current.delete(poll);
                        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pendingJobId: undefined } : s));
                        if (sessionId === currentSessionId) setIsChatting(false);
                    }
                } catch (e) {
                    console.error("Polling error in Review:", e);
                    clearInterval(poll);
                    pollIntervals.current.delete(poll);
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pendingJobId: undefined } : s));
                    if (sessionId === currentSessionId) setIsChatting(false);
                }
            }, 3000);
            pollIntervals.current.add(poll);
        } catch (e) {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pendingJobId: undefined } : s));
            if (sessionId === currentSessionId) setIsChatting(false);
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

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }, [sessions]);

    // Scroll chat on new message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        scrollToBottom();
    }, [sessions, currentSessionId]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            // Recalculate after a tiny delay to ensure width change has been applied by React
            const adjust = () => {
                if (!textareaRef.current) return;
                textareaRef.current.style.height = 'auto';
                const maxHeight = isMaximized ? 600 : 300;
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
            };
            adjust();
            const timer = setTimeout(adjust, 10); // Safety second pass
            return () => clearTimeout(timer);
        }
    }, [chatInput, isMaximized]);

    // Root elements for initial search view
    const [roots, setRoots] = useState<AnatNode[]>([]);
    useEffect(() => {
        apiCall('anatomy/roots').then((res: any) => setRoots(res.roots || [])).catch(console.error);
    }, []);

    // Search logic
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
    // Display elements: either from current session, or the newly selected ones
    const activeElements = activeSession ? activeSession.elements : selectedElements;

    const startNewChat = () => {
        const newSession: Session = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: t('Nouveau message', 'New message'),
            elements: [],
            messages: [],
            updatedAt: Date.now(),
            createdAt: Date.now(),
        };
        setSessions(prev => {
            const kept = prev.filter(s =>
                s.conversationId || s.messages.length > 0 || s.elements.length > 0
            );
            return [newSession, ...kept];
        });
        setCurrentSessionId(newSession.id);
        setSelectedElements([]);
        setChatInput('');
        setIsSearchOpen(false);
    };

    const toggleElement = (node: AnatNode) => {
        if (activeSession) {
            // Cannot easily modify existing session elements logic in UI, force new chat
            startNewChat();
            setSelectedElements([node]);
            setChatInput(language === 'fr' ? `Expliquez-moi en détail : ${getLoc(node.name)}.` : `Explain in detail: ${getLoc(node.name)}.`);
            return;
        }
        setSelectedElements(prev => {
            const exists = prev.find(n => n.raw_name === node.raw_name);
            let nextElements;
            if (exists) {
                nextElements = prev.filter(n => n.raw_name !== node.raw_name);
            } else {
                nextElements = [...prev, node];
            }
            
            if (nextElements.length > 0) {
                const names = nextElements.map(e => getLoc(e.name)).join(', ');
                setChatInput(language === 'fr' 
                    ? `Expliquez-moi en détail : ${names}.` 
                    : `Explain in detail: ${names}.`
                );
            } else {
                setChatInput('');
            }
            return nextElements;
        });
    };

    const removeElement = (nodeRawName: string) => {
        if (activeSession) return; // Disallow changing elements of historical session directly
        setSelectedElements(prev => {
            const nextElements = prev.filter(n => n.raw_name !== nodeRawName);
            if (nextElements.length > 0) {
                const names = nextElements.map(e => getLoc(e.name)).join(', ');
                setChatInput(language === 'fr' 
                    ? `Expliquez-moi en détail : ${names}.` 
                    : `Explain in detail: ${names}.`
                );
            } else {
                setChatInput('');
            }
            return nextElements;
        });
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const msg = chatInput.trim();
        if (!msg || isChatting) return;

        setChatInput('');
        setIsChatting(true);

        let targetSession = activeSession;

        // If no active session, try to find one with exactly same elements, else create new
        if (!targetSession) {
            const sortedCurrentNames = selectedElements.map(el => el.raw_name).sort().join('|');
            const matchingSession = sessions.find(s => {
                const sNames = s.elements.map(el => el.raw_name).sort().join('|');
                return sNames === sortedCurrentNames;
            });

            if (matchingSession) {
                targetSession = matchingSession;
                setCurrentSessionId(targetSession.id);
            } else {
                // Create new session
                const baseName = selectedElements.length > 0 
                    ? selectedElements.map(e => getLoc(e.name)).join(' & ')
                    : t('Discussion Générale', 'General Discussion');
                
                targetSession = {
                    id: Date.now().toString(),
                    name: baseName,
                    elements: [...selectedElements],
                    messages: [],
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                };
                setSessions(prev => [targetSession!, ...prev]);
                setCurrentSessionId(targetSession.id);
            }
        }

        // Add user message
        const userMessage: Message = { role: 'user', content: msg };
        
        // Update session state instantly
        setSessions(prev => prev.map(s => {
            if (s.id === targetSession!.id) {
                return { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now() };
            }
            return s;
        }));

        // Generate AI response
        let contextText = t('Anatomie humaine en général', 'General human anatomy');
        if (targetSession.elements.length > 0) {
            contextText = targetSession.elements.map(e => `- ${getLoc(e.name)} (${e.type})`).join('\n');
        }

        const userInput = language === 'fr'
            ? `Agis comme un professeur d'anatomie expert et bienveillant. Langue: français.\nSujet(s) abordé(s) dans cette discussion:\n${contextText}\n\nQuestion de l'étudiant: ${msg}\n\nRéponds en Markdown clair avec titres, texte en gras et listes à puces. N'inclus PAS de balise JSON.`
            : `Act as an expert anatomy professor. Language: English.\nSubject(s):\n${contextText}\n\nStudent question: ${msg}\n\nReply in clear Markdown with headings, bold, and bullet lists. Do NOT include JSON tags.`;

        try {
             // ── Créer la conversation en BDD avec le bon nom si elle n'existe pas encore ──
             let conversationId = targetSession.conversationId;
             if (!conversationId) {
                 const conv = await aiService.createConversation(targetSession.name);
                 conversationId = conv.id;
                 setSessions(prev => prev.map(s =>
                     s.id === targetSession!.id ? { ...s, conversationId } : s
                 ));
             }

             const res = await aiService.startGenerate('phi3:latest', userInput, undefined, 'explain', conversationId);
             
             if (res.job_id) {
                 // On marque la session avec le jobId en cours
                 setSessions(prev => prev.map(s => 
                     s.id === targetSession!.id ? { ...s, conversationId: res.conversation_id || conversationId, pendingJobId: res.job_id } : s
                 ));
                 // On lance le polling
                 resumeJob(res.job_id, targetSession.id);
             }
        } catch (error) {
             console.error(error);
             const aiMessage: Message = { role: 'ai', content: t("_(Erreur: Impossible de joindre l'IA)_", "_(Error: Could not reach AI)_") };
             setSessions(prev => prev.map(s =>
                 s.id === targetSession!.id ? { ...s, messages: [...s.messages, aiMessage] } : s
             ));
             setIsChatting(false);
        }
    };

    const handleRename = (id: string, newName: string) => {
        if (!newName.trim()) return;
        const session = sessions.find(s => s.id === id);
        // Sync with backend if the conversation exists in DB
        if (session?.conversationId) {
            aiService.renameConversation(session.conversationId, newName).catch(console.error);
        }
        setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
        setEditingSessionId(null);
    };

    const deleteSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        // Sync with backend if the conversation exists in DB
        if (session?.conversationId) {
            aiService.deleteConversation(session.conversationId).catch(console.error);
        }
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) startNewChat();
    }

    const renderMessageBody = (msg: Message) => {
        if (msg.role === 'user') {
            return <div className="user-text">{msg.content}</div>;
        }
        const display = formatChatContent(msg.content, language === 'fr' ? 'fr' : 'en');
        return (
            <div className="review-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
            </div>
        );
    };

    return (
        <App>
            <div className="gpt-layout">
                {/* SIDEBAR SESSIONS */}
                <aside className={`gpt-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                    <div className="sidebar-header-mobile">
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{t('Historique', 'History')}</span>
                        <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
                    </div>
                    
                    <button className="new-chat-btn" onClick={startNewChat}>
                        <Plus size={18} strokeWidth={2.5} />
                        {t('Nouveau message', 'New message')}
                    </button>

                    <div className="sessions-list">
                        {sessions.sort((a,b) => b.updatedAt - a.updatedAt).map(s => (
                            <div key={s.id} className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}>
                                <div className="session-item-main" onClick={() => { setCurrentSessionId(s.id); setIsSidebarOpen(false); }}>
                                    <MessageSquare size={16} strokeWidth={2} />
                                    
                                    {editingSessionId === s.id ? (
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={editingTitle}
                                            onChange={e => setEditingTitle(e.target.value)}
                                            onBlur={() => handleRename(s.id, editingTitle)}
                                            onKeyDown={e => e.key === 'Enter' && handleRename(s.id, editingTitle)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="session-name" title={s.name}>{s.name}</span>
                                    )}
                                </div>
                                <div className="session-actions">
                                    <button type="button" className="icon-action-btn" onClick={(e) => { e.stopPropagation(); setEditingTitle(s.name); setEditingSessionId(s.id); }}>
                                        <Pencil size={15} strokeWidth={2} />
                                        <span className="btn-text">{t('Renommer', 'Rename')}</span>
                                    </button>
                                    <button type="button" className="icon-action-btn danger" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}>
                                        <Trash2 size={15} strokeWidth={2} />
                                        <span className="btn-text">{t('Supprimer', 'Delete')}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* MAIN CHAT AREA */}
                <main className="gpt-main">
                    
                    {/* Header: Selected Subjects */}
                    <div className="gpt-header">
                        <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu size={20} strokeWidth={2} />
                        </button>
                        <div className="element-tags" style={{ flex: 1 }}>
                            {activeElements.map(el => (
                                <span key={el.raw_name} className="element-tag">
                                    {getLoc(el.name)} <small>{el.type}</small>
                                    {!activeSession && (
                                        <button onClick={() => removeElement(el.raw_name)}>×</button>
                                    )}
                                </span>
                            ))}
                            {activeElements.length === 0 && (
                                <span className="element-tag general">{t('Thème général', 'General topic')}</span>
                            )}
                        </div>
                        <div className="session-date" style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>
                            {activeSession 
                                ? new Date(activeSession.createdAt || activeSession.updatedAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            }
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="gpt-messages-container">
                        {(!activeSession || activeSession.messages.length === 0) ? (
                            <div className="gpt-empty-state">
                                <h2>{t("Comment puis-je vous aider ?", "How can I help you?")}</h2>
                                <p>{t("Ajoutez des éléments anatomiques ci-dessous et posez votre question. L'historique sera sauvegardé automatiquement.", "Add anatomical elements below and ask your question. History will be saved automatically.")}</p>
                            </div>
                        ) : (
                            <div className="gpt-messages">
                                {activeSession.messages.map((msg, i) => (
                                    <div key={i} className={`gpt-message ${msg.role}`}>
                                        <div className="gpt-bubble">
                                            {renderMessageBody(msg)}
                                            <div className="message-actions-bottom">
                                                <button
                                                    type="button"
                                                    className="msg-action-btn"
                                                    onClick={() => navigator.clipboard.writeText(getCopyText(msg.content))}
                                                    title={t('Copier', 'Copy')}
                                                >
                                                    <Copy size={16} strokeWidth={2} />
                                                    <span className="btn-text">{t('Copier', 'Copy')}</span>
                                                </button>
                                                {msg.role === 'user' && (
                                                    <button
                                                        type="button"
                                                        className="msg-action-btn"
                                                        onClick={() => { setChatInput(msg.content); scrollToBottom(); }}
                                                        title={t('Modifier', 'Edit')}
                                                    >
                                                        <Pencil size={16} strokeWidth={2} />
                                                        <span className="btn-text">{t('Modifier', 'Edit')}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isChatting && (
                                    <div className="gpt-message ai">
                                        <div className="gpt-bubble">
                                            <div className="review-ai-loading" style={{minHeight: 'auto', flexDirection: 'row'}}>
                                                <div className="review-glow-ring" style={{width: 20, height: 20, borderWidth: 2}}></div>
                                                <span>{t("Génération...", "Generating...")}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="gpt-input-wrapper">
                        
                        {/* Selected tags helper inside input area if floating */}
                        <form className={`gpt-input-box ${chatInput.length > 50 || isMaximized ? 'expanded' : ''}`} onSubmit={handleChatSubmit}>
                            
                            <div className="plus-btn-container">
                                <button type="button" className={`plus-btn ${isSearchOpen ? 'active' : ''}`} onClick={() => setIsSearchOpen(!isSearchOpen)} title={t('Ajouter un élément', 'Add element')}>
                                    <Plus size={22} strokeWidth={2} />
                                </button>
                                
                                <AnimatePresence>
                                    {isSearchOpen && (
                                        <motion.div 
                                            className="search-popover"
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder={t("Chercher un élément...", "Search element...")} 
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                                            />
                                            <div className="search-results">
                                                {isSearching && <div className="popover-msg">{t('Recherche...', 'Searching...')}</div>}
                                                {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && <div className="popover-msg">Aucun résultat</div>}
                                                {searchQuery.trim().length < 2 && <div className="popover-msg">Commencez à taper... ou choisissez dans la liste</div>}
                                                
                                                {(searchQuery.trim().length >= 2 ? searchResults : roots).map(node => (
                                                    <div 
                                                        key={node.raw_name} 
                                                        className={`search-item ${selectedElements.find(n => n.raw_name === node.raw_name) ? 'selected' : ''}`}
                                                        onClick={() => toggleElement(node)}
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

                            <textarea 
                                ref={textareaRef}
                                rows={1}
                                placeholder={t("Posez une question à l'IA...", "Ask the AI a question...")}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleChatSubmit(e as any);
                                    }
                                }}
                                disabled={isChatting}
                            />

                            <div className="input-actions-right">
                                <button 
                                    type="button" 
                                    className="maximize-btn" 
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    title={isMaximized ? t('Réduire', 'Minimize') : t('Agrandir', 'Expand')}
                                >
                                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                
                                <button type="submit" className="send-btn" disabled={isChatting || !chatInput.trim()} title={t('Envoyer', 'Send')}>
                                    <Send size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

            <style>{`
                /* Override App.tsx global layout constraints for Chat */
                .dash-content-container {
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    height: 100%;
                }
                .dash-main {
                    padding: 0 !important;
                }
                .dash-top-header {
                    display: none !important;
                }

                .gpt-layout {
                    display: flex;
                    height: 100%;
                    width: 100%;
                    background: var(--dash-bg);
                    overflow: hidden;
                }

                /* Sidebar */
                .gpt-sidebar {
                    width: 260px;
                    background: var(--dash-bg);
                    border-right: 1px solid var(--dash-border);
                    display: flex; flex-direction: column;
                    transition: all 0.3s ease;
                    z-index: 100;
                }
                .gpt-sidebar.closed {
                    margin-left: -260px;
                }
                
                .sidebar-header-mobile {
                    display: none;
                    padding: 16px;
                    border-bottom: 1px solid var(--dash-border);
                    justify-content: space-between; align-items: center;
                }

                /* Mobile Sidebar Adjustments */
                @media (max-width: 800px) {
                    .gpt-sidebar {
                        position: absolute; top: 0; bottom: 0; left: 0;
                        width: 280px;
                        box-shadow: 10px 0 30px rgba(0,0,0,0.15);
                    }
                    .gpt-sidebar.closed {
                        margin-left: -280px; opacity: 0; pointer-events: none;
                    }
                    .sidebar-header-mobile { display: flex; }
                    .gpt-layout { height: calc(100vh - 160px); }
                }

                /* Sidebar elements */
                .new-chat-btn {
                    margin: 16px; padding: 12px;
                    background: #0ea5e9; color: white;
                    border: none; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    font-weight: 600; cursor: pointer; transition: 0.2s;
                }
                .new-chat-btn:hover { background: #0284c7; }

                .sessions-list { flex: 1; overflow-y: auto; padding: 0 12px 16px; }
                .session-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 12px; margin-bottom: 6px;
                    border-radius: 8px; cursor: pointer; color: var(--dash-text); transition: 0.2s;
                }
                .session-item:hover, .session-item.active { background: color-mix(in srgb, var(--dash-text) 5%, transparent); }
                .session-item-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
                .session-item-main svg { color: var(--dash-text-muted); flex-shrink: 0; }
                .session-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
                .session-item input {
                    width: 100%; border: 1px solid #0ea5e9; background: transparent;
                    color: var(--dash-text); font-size: 14px; padding: 2px 4px; border-radius: 4px; outline: none;
                }
                .session-actions {
                    display: flex; align-items: center; gap: 4px;
                    opacity: 0; transition: opacity 0.2s ease;
                }
                .session-item:hover .session-actions, .session-item.active .session-actions { opacity: 1; }
                .icon-action-btn {
                    background: var(--dash-bg); border: 1px solid var(--dash-border); color: var(--dash-text-muted);
                    padding: 6px; border-radius: 8px; display: flex; align-items: center; gap: 0; transition: all 0.2s;
                    overflow: hidden;
                }
                .icon-action-btn:hover {
                    color: #0ea5e9; border-color: #0ea5e9; background: color-mix(in srgb, #0ea5e9 10%, var(--dash-bg));
                    gap: 6px; padding: 6px 10px;
                }
                .icon-action-btn.danger:hover {
                    color: #f87171; border-color: #f87171; background: color-mix(in srgb, #f87171 10%, var(--dash-bg));
                }
                .icon-action-btn .btn-text {
                    font-size: 11px; font-weight: 600; width: 0; opacity: 0; white-space: nowrap; transition: all 0.2s;
                }
                .icon-action-btn:hover .btn-text {
                    width: auto; opacity: 1;
                }

                /* Main Chat Area */
                .gpt-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--dash-bg); }
                .gpt-header { padding: 16px; border-bottom: 1px solid var(--dash-border); display: flex; align-items: center; gap: 16px; }
                .sidebar-toggle { background: none; border: none; color: var(--dash-text-muted); cursor: pointer; }
                
                .gpt-empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    margin-top: 80px;
                }
                .gpt-empty-state h2 {
                    font-size: 26px;
                    font-weight: 800;
                    margin-bottom: 16px;
                    color: var(--dash-text-main);
                }
                .gpt-empty-state p {
                    font-size: 15px;
                    color: var(--dash-text-muted);
                    max-width: 450px;
                    margin: 0 auto;
                    line-height: 1.6;
                }

                .gpt-messages-container { flex: 1; overflow-y: auto; padding: 20px 0; }
                .gpt-message {
                    display: flex; flex-direction: column; margin-bottom: 24px;
                    width: 100%; max-width: none; padding: 0 10px;
                }
                @media (max-width: 800px) { .gpt-message { padding: 0 5px; } }

                .gpt-bubble { max-width: 100%; }
                .gpt-message.user .gpt-bubble {
                    background: color-mix(in srgb, #0ea5e9 12%, var(--dash-card-bg));
                    color: var(--dash-text); border-radius: 12px; padding: 16px 20px; align-self: flex-end;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }
                .gpt-message.ai .gpt-bubble { background: transparent; color: var(--dash-text); padding: 0; }

                /* Input Section - EDGE TO EDGE */
                .gpt-input-wrapper {
                    padding: 20px 10px 40px;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                }
                @media (max-width: 800px) { 
                    .gpt-input-wrapper { padding: 10px; } 
                    .gpt-input-box {
                        min-width: 0 !important;
                        width: 100% !important;
                    }
                }

                .gpt-input-box {
                    width: 100%;
                    max-width: 500px; /* Even more compact by default */
                    display: flex; align-items: flex-end;
                    background: var(--dash-card-bg); border: 1px solid var(--dash-border);
                    padding: 4px 0 4px 16px; border-radius: 24px;
                    position: relative;
                    min-height: 52px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }
                .gpt-input-box.expanded {
                    max-width: 100%;
                }
                .gpt-input-box:focus-within { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
                
                .gpt-input-box textarea {
                    flex: 1; background: transparent; border: none; outline: none;
                    color: var(--dash-text-main); font-size: 15px;
                    resize: none; padding: 14px 100px 14px 0; max-height: 500px;
                    line-height: 1.5; font-family: inherit;
                    scrollbar-width: thin;
                }
                
                /* Custom ultra-thin discreet scrollbar */
                .gpt-input-box textarea::-webkit-scrollbar {
                    width: 5px;
                }
                .gpt-input-box textarea::-webkit-scrollbar-track {
                    background: transparent;
                }
                .gpt-input-box textarea::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                    border: 1px solid transparent;
                    background-clip: content-box;
                }
                .gpt-input-box textarea::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
                .gpt-input-box textarea {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
                }

                .plus-btn-container { margin-bottom: 8px; margin-right: 12px; position: relative; }
                .plus-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 34px; height: 34px; border-radius: 50%;
                    background: var(--dash-bg); color: var(--dash-text-muted); border: 1px solid var(--dash-border); cursor: pointer;
                }
                
                .input-actions-right {
                    position: absolute; right: 8px; bottom: 8px;
                    display: flex; align-items: center; gap: 8px; z-index: 5;
                }

                .maximize-btn, .send-btn { 
                    display: flex; align-items: center; justify-content: center;
                    border: none; border-radius: 50%; cursor: pointer; transition: 0.2s;
                }
                .maximize-btn {
                    background: var(--dash-bg); border: 1px solid var(--dash-border); color: var(--dash-text-muted);
                    width: 30px; height: 30px;
                }
                .send-btn {
                    width: 36px; height: 36px; background: #0ea5e9; color: white;
                }
                .send-btn:hover:not(:disabled) { transform: scale(1.05); background: #0284c7; }
                .send-btn:disabled { background: var(--dash-border); color: var(--dash-text-muted); cursor: not-allowed; }

                /* Search popover */
                .search-popover {
                    position: absolute; bottom: 50px; left: 0;
                    width: 380px; background: var(--dash-bg);
                    border: 1px solid var(--dash-border); border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 1000;
                }
                .search-popover input { padding: 14px; border: none; border-bottom: 1px solid var(--dash-border); background: transparent; color: var(--dash-text-main); outline: none; }
                .search-results { max-height: 250px; overflow-y: auto; }
                .search-item { padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid var(--dash-border); color: var(--dash-text-main); }
                .search-item:hover { background: var(--dash-accent-hover); }

                .gpt-bubble { max-width: 100%; position: relative; }
                
                .message-actions-bottom {
                    display: flex; gap: 4px; margin-top: 8px;
                    opacity: 0; transition: opacity 0.2s ease;
                }
                .gpt-message:hover .message-actions-bottom {
                    opacity: 1;
                }
                .msg-action-btn {
                    background: transparent; border: 1px solid transparent; color: var(--dash-text-muted);
                    padding: 6px; border-radius: 8px; display: inline-flex; align-items: center; gap: 0;
                    cursor: pointer; transition: all 0.2s; overflow: hidden;
                }
                .msg-action-btn:hover {
                    background: color-mix(in srgb, var(--dash-text) 5%, transparent);
                    border-color: var(--dash-border);
                    color: #0ea5e9;
                    gap: 8px; padding: 6px 12px;
                }
                .msg-action-btn .btn-text {
                    font-size: 12px; font-weight: 600;
                    width: 0; opacity: 0; white-space: nowrap; transition: all 0.2s;
                }
                .msg-action-btn:hover .btn-text {
                    width: auto; opacity: 1;
                }

                /* Markdown fixes */
                .review-markdown { font-size: 15px; line-height: 1.7; }
                .review-markdown p { margin-bottom: 1em; }
                .review-markdown strong { font-weight: 700; color: #0ea5e9; }
                .user-text { font-size: 15px; white-space: pre-wrap; }

                .review-markdown h1, .review-markdown h2, .review-markdown h3 { margin-top: 1.5em; margin-bottom: 0.7em; }
                .review-markdown table { width: 100%; border-collapse: collapse; margin-bottom: 1.2em; font-size: 14px; }
                .review-markdown th, .review-markdown td { border: 1px solid var(--dash-border); padding: 8px 12px; }
                .review-markdown th { background: color-mix(in srgb, var(--dash-text) 5%, transparent); font-weight: 600; text-align: left; }
                .review-markdown strong { font-weight: 700; color: #0ea5e9; }
                .review-markdown *:last-child { margin-bottom: 0; }
            `}</style>
        </App>
    );
};

export default Review;
