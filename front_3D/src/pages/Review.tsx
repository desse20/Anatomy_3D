import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Pencil, Trash2, MessageSquare, Plus, Send, Menu } from 'lucide-react';
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
}

const Review: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

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
    
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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

    const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

        // Generate AI response — envoyer seulement le message brut + sujet + langue
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
                 // Sauvegarder le conversationId dans la session locale immédiatement
                 setSessions(prev => prev.map(s =>
                     s.id === targetSession!.id ? { ...s, conversationId } : s
                 ));
             }

             const response = await aiService.generate('phi3:latest', userInput, undefined, 'explain', conversationId);
             const aiMessage: Message = { role: 'ai', content: response.response };
             setSessions(prev => prev.map(s => {
                 if (s.id === targetSession!.id) {
                     return { ...s, conversationId: response.conversation_id ?? conversationId, messages: [...s.messages, aiMessage] };
                 }
                 return s;
             }));
        } catch (error) {
             console.error(error);
             const aiMessage: Message = { role: 'ai', content: t("_(Erreur: Impossible de joindre l'IA)_", "_(Error: Could not reach AI)_") };
             setSessions(prev => prev.map(s => {
                 if (s.id === targetSession!.id) {
                     return { ...s, messages: [...s.messages, aiMessage] };
                 }
                 return s;
             }));
        } finally {
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
        <App breadcrumb={t('Chat', 'Chat')}>
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
                                    <button type="button" className="icon-action-btn" title={t('Renommer', 'Rename')} aria-label={t('Renommer', 'Rename')} onClick={(e) => { e.stopPropagation(); setEditingTitle(s.name); setEditingSessionId(s.id); }}>
                                        <Pencil size={15} strokeWidth={2} />
                                    </button>
                                    <button type="button" className="icon-action-btn danger" title={t('Supprimer', 'Delete')} aria-label={t('Supprimer', 'Delete')} onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}>
                                        <Trash2 size={15} strokeWidth={2} />
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
                                                    <Copy size={14} strokeWidth={2} />
                                                    <span>{t('Copier', 'Copy')}</span>
                                                </button>
                                                {msg.role === 'user' && (
                                                    <button
                                                        type="button"
                                                        className="msg-action-btn"
                                                        onClick={() => { setChatInput(msg.content); scrollToBottom(); }}
                                                        title={t('Modifier', 'Edit')}
                                                    >
                                                        <Pencil size={14} strokeWidth={2} />
                                                        <span>{t('Modifier', 'Edit')}</span>
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
                        <form className="gpt-input-box" onSubmit={handleChatSubmit}>
                            
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

                            <input 
                                type="text" 
                                placeholder={t("Posez une question à l'IA...", "Ask the AI a question...")}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                disabled={isChatting}
                            />
                            
                            <button type="submit" className="send-btn" disabled={isChatting || !chatInput.trim()} title={t('Envoyer', 'Send')}>
                                <Send size={18} strokeWidth={2.5} />
                            </button>
                        </form>
                    </div>
                </main>
            </div>

            <style>{`
                .gpt-layout {
                    display: flex;
                    height: calc(100vh - 120px);
                    background: var(--dash-bg);
                    border: 1px solid var(--dash-border);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }

                @media (max-width: 800px) {
                    .gpt-layout {
                        height: calc(100vh - 180px);
                        border: none;
                        border-radius: 0;
                        box-shadow: none;
                        margin: 0 -20px; /* Offset the parent padding if needed */
                        width: calc(100% + 40px);
                    }
                    .gpt-sidebar {
                        position: absolute;
                        z-index: 1001;
                        height: 100%;
                        box-shadow: 10px 0 30px rgba(0,0,0,0.1);
                    }
                    .gpt-messages-container {
                        padding: 15px 5px;
                    }
                    .gpt-message.ai, .gpt-message.user {
                        width: 100% !important;
                    }
                    .gpt-bubble {
                        max-width: 100% !important;
                        width: 100% !important;
                        padding: 16px;
                        border-radius: 12px;
                    }
                }

                /* Sidebar */
                .gpt-sidebar {
                    width: 260px;
                    background: var(--dash-bg);
                    border-right: 1px solid var(--dash-border);
                    display: flex; flex-direction: column;
                    transition: margin 0.3s ease;
                }
                .gpt-sidebar.closed {
                    margin-left: -260px;
                }
                
                .sidebar-header-mobile {
                    display: none;
                    padding: 16px;
                    border-bottom: 1px solid var(--dash-border);
                    justify-content: space-between;
                    align-items: center;
                }

                @media (max-width: 800px) {
                    .gpt-layout {
                        height: calc(100vh - 160px);
                        border: none;
                        border-radius: 0;
                        box-shadow: none;
                        margin: 0 -20px;
                        width: calc(100% + 40px);
                    }
                    .gpt-sidebar {
                        position: absolute;
                        top: 0; bottom: 0; left: 0;
                        z-index: 1001;
                        width: 280px;
                        box-shadow: 10px 0 30px rgba(0,0,0,0.15);
                    }
                    .gpt-sidebar.closed {
                        margin-left: -280px;
                        opacity: 0;
                        width: 0;
                        pointer-events: none;
                    }
                    .sidebar-header-mobile {
                        display: flex;
                    }
                    .gpt-input-wrapper {
                        padding: 10px;
                        background: var(--dash-bg);
                        border-top: 1px solid var(--dash-border);
                        position: sticky;
                        bottom: 0;
                        z-index: 10;
                    }
                    .gpt-header {
                        flex-direction: row;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 12px;
                        padding: 12px 16px;
                    }
                    .element-tags {
                        order: 1;
                        flex: 1;
                    }
                    .sidebar-toggle {
                        order: 2;
                    }
                    .session-date {
                        order: 3;
                        width: 100%;
                    }
                    .gpt-input-box {
                        padding: 10px 14px;
                        min-height: 54px;
                        background: var(--dash-card-bg);
                    }
                }
                
                .close-sidebar-btn {
                    background: none; border: none; font-size: 24px; color: var(--dash-text-muted); cursor: pointer; padding: 0 10px;
                }
                .new-chat-btn {
                    margin: 16px; padding: 12px;
                    background: #0ea5e9; color: white;
                    border: none; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    font-weight: 600; cursor: pointer; transition: 0.2s;
                }
                .new-chat-btn:hover { background: #0284c7; }

                .sessions-list {
                    flex: 1; overflow-y: auto; padding: 0 12px 16px;
                }
                .session-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 12px; margin-bottom: 6px;
                    border-radius: 8px; cursor: pointer;
                    color: var(--dash-text); transition: 0.2s;
                }
                .session-item:hover, .session-item.active {
                    background: color-mix(in srgb, var(--dash-text) 5%, transparent);
                }
                .session-item-main {
                    display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
                }
                .session-item-main svg { color: var(--dash-text-muted); flex-shrink: 0; }
                .session-name {
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    font-size: 14px;
                }
                .session-item input {
                    width: 100%; border: 1px solid #0ea5e9; background: transparent;
                    color: var(--dash-text); font-size: 14px; padding: 2px 4px; border-radius: 4px;
                    outline: none;
                }
                
                .session-actions {
                    display: none; align-items: center; gap: 4px; flex-shrink: 0;
                }
                .session-item:hover .session-actions,
                .session-item.active .session-actions {
                    display: flex;
                }
                .icon-action-btn {
                    background: var(--dash-bg);
                    border: 1px solid var(--dash-border);
                    color: var(--dash-text-muted);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s;
                }
                .icon-action-btn:hover {
                    color: #0ea5e9;
                    border-color: rgba(14, 165, 233, 0.45);
                    background: color-mix(in srgb, #0ea5e9 10%, var(--dash-bg));
                }
                .icon-action-btn.danger:hover {
                    color: #f87171;
                    border-color: rgba(248, 113, 113, 0.45);
                    background: color-mix(in srgb, #f87171 10%, var(--dash-bg));
                }

                /* Main */
                .gpt-main {
                    flex: 1; display: flex; flex-direction: column; min-width: 0;
                    position: relative;
                }
                .gpt-header {
                    padding: 16px; border-bottom: 1px solid var(--dash-border);
                    display: flex; align-items: center; gap: 16px;
                }
                .sidebar-toggle {
                    background: none; border: none; color: var(--dash-text-muted); cursor: pointer;
                }
                .element-tags {
                    display: flex; flex-wrap: wrap; gap: 8px;
                }
                .element-tag {
                    display: flex; align-items: center; gap: 6px;
                    background: color-mix(in srgb, #0ea5e9 15%, transparent);
                    color: #0ea5e9; padding: 4px 12px; border-radius: 100px;
                    font-size: 13px; font-weight: 600;
                }
                .element-tag.general {
                    background: var(--dash-border); color: var(--dash-text-muted);
                }
                .element-tag small { opacity: 0.6; font-weight: normal; }
                .element-tag button {
                    background: none; border: none; color: inherit; font-size: 16px; cursor: pointer;
                    margin-left: 4px;
                }

                .gpt-messages-container {
                    flex: 1; overflow-y: auto; padding: 20px;
                }
                .gpt-empty-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100%; text-align: center; color: var(--dash-text-muted);
                }
                .gpt-empty-state h2 { color: var(--dash-text); margin-bottom: 12px; }
                
                .gpt-messages {
                    width: 100%; display: flex; flex-direction: column; gap: 24px;
                }
                .gpt-message {
                    display: flex; width: 100%;
                }
                .gpt-message.user { justify-content: flex-end; }
                .gpt-message.ai { justify-content: flex-start; }
                
                .gpt-bubble {
                    max-width: 85%; padding: 18px 24px; border-radius: 20px;
                    position: relative;
                }
                .message-actions-bottom {
                    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;
                    padding-top: 10px; border-top: 1px solid var(--dash-border);
                }
                .msg-action-btn {
                    background: var(--dash-bg);
                    border: 1px solid var(--dash-border);
                    color: var(--dash-text-muted);
                    padding: 6px 10px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: 0.2s;
                }
                .msg-action-btn:hover {
                    background: color-mix(in srgb, #0ea5e9 12%, var(--dash-bg));
                    color: #0ea5e9;
                    border-color: rgba(14, 165, 233, 0.4);
                }
                
                @media (max-width: 800px) {
                    .message-actions-bottom { margin-top: 16px; }
                    .msg-action-btn { padding: 8px 12px; }
                }
                .gpt-message.user .gpt-bubble {
                    background: color-mix(in srgb, #0ea5e9 12%, var(--dash-card-bg));
                    color: var(--dash-text);
                    border-bottom-right-radius: 4px;
                }

                
                .gpt-message.ai .gpt-bubble {
                    background: transparent; border: none;
                    color: var(--dash-text);
                }
                
                .user-text { font-size: 15px; white-space: pre-wrap; }

                /* Input wrapper */
                .gpt-input-wrapper {
                    padding: 20px;
                }
                .gpt-input-box {
                    width: 100%;
                    display: flex; align-items: center; gap: 12px;
                    background: var(--dash-card-bg); border: 1px solid var(--dash-border);
                    padding: 10px 12px 10px 16px; border-radius: 24px;
                    position: relative;
                }
                .gpt-input-box:focus-within {
                    border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
                }
                .gpt-input-box input[type="text"] {
                    flex: 1; background: transparent; border: none; outline: none;
                    color: var(--dash-text); font-size: 15px;
                }
                
                .plus-btn-container { position: relative; }
                .plus-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 50%;
                    background: var(--dash-bg); color: var(--dash-text-muted); border: 1px solid var(--dash-border);
                    cursor: pointer; transition: 0.2s;
                }
                .plus-btn:hover, .plus-btn.active { color: #0ea5e9; border-color: #0ea5e9; }
                
                .search-popover {
                    position: absolute; bottom: 50px; left: 0;
                    width: 380px; background: var(--dash-bg);
                    border: 1px solid var(--dash-border); border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    display: flex; flex-direction: column; overflow: hidden;
                    z-index: 1000;
                }
                .search-popover input {
                    padding: 14px; border-bottom: 1px solid var(--dash-border);
                    background: transparent; border-top: none; border-left: none; border-right: none;
                    color: var(--dash-text); outline: none; width: 100%;
                }
                .search-results {
                    max-height: 250px; overflow-y: auto;
                }
                .search-item {
                    padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;
                    cursor: pointer; border-bottom: 1px solid var(--dash-border);
                }
                .search-item:hover { background: var(--dash-bg); }
                .search-item.selected { background: color-mix(in srgb, #0ea5e9 10%, transparent); color: #0ea5e9; }
                .search-item small { opacity: 0.6; font-size: 11px; }
                .popover-msg { padding: 14px; text-align: center; color: var(--dash-text-muted); font-size: 13px; white-space: nowrap; }

                .send-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 38px; height: 38px; border-radius: 50%;
                    background: #0ea5e9; color: white; border: none; cursor: pointer;
                    flex-shrink: 0;
                }
                .send-btn:disabled { background: var(--dash-border); cursor: not-allowed; }

                /* Markdown fixes for messages */
                .review-markdown { font-size: 15px; line-height: 1.7; }
                .review-markdown p { margin-bottom: 1em; margin-top: 0; }
                .review-markdown ul, .review-markdown ol { padding-left: 24px; margin-bottom: 1.2em; }
                .review-markdown ul { list-style-type: disc; }
                .review-markdown ol { list-style-type: decimal; }
                .review-markdown li { margin-bottom: 0.4em; }
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
