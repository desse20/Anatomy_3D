import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { aiService } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnatNode {
    name: string;
    raw_name: string;
    type: string;
    child_count: number;
}
interface Message {
    role: 'ai' | 'user';
    content: string;
}
interface Session {
    id: string;
    name: string;
    elements: AnatNode[];
    messages: Message[];
    updatedAt: number;
    createdAt?: number;
}

const Review: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [sessions, setSessions] = useState<Session[]>(() => {
        const local = localStorage.getItem('review_sessions');
        return local ? JSON.parse(local) : [];
    });
    
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

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem('review_sessions', JSON.stringify(sessions));
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
        setCurrentSessionId(null);
        setSelectedElements([]);
        setChatInput('');
        setIsSearchOpen(false);
    };

    const toggleElement = (node: AnatNode) => {
        if (activeSession) {
            // Cannot easily modify existing session elements logic in UI, force new chat
            startNewChat();
            setSelectedElements([node]);
            setChatInput(language === 'fr' ? `Expliquez-moi en détail : ${node.name}.` : `Explain in detail: ${node.name}.`);
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
                const names = nextElements.map(e => e.name).join(', ');
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
                const names = nextElements.map(e => e.name).join(', ');
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
                    ? selectedElements.map(e => e.name).join(' & ')
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
        const lang = language === 'fr' ? 'français' : 'english';
        
        // Build Conversation context
        // we use the directly updated message array
        const allMessages = [...targetSession.messages, userMessage];
        const conversationHistory = allMessages.map(m => (m.role === 'user' ? 'Étudiant: ' : 'Professeur: ') + m.content).join('\n\n');
        
        let contextText = t('Anatomie humaine en général', 'General human anatomy');
        if (targetSession.elements.length > 0) {
            contextText = targetSession.elements.map(e => `- ${e.name} (${e.type})`).join('\n');
        }

        const prompt = `Agis comme un professeur d'anatomie expert et bienveillant. Langue: ${lang}.
Sujet(s) abordé(s) dans cette discussion:
${contextText}

Historique de la conversation:
${conversationHistory}

Donne ta réponse la plus pertinente, claire et structurée possible. Utilise la syntaxe Markdown avec des titres, du texte en gras, et surtout des listes à puces (tiret "-") pour que les explications et les sous-éléments soient beaux, bien indentés et aérés. N'inclus PAS de balise JSON.`;

        try {
             const response = await aiService.generate('phi3:latest', prompt, undefined, 'explain');
             const aiMessage: Message = { role: 'ai', content: response };
             setSessions(prev => prev.map(s => {
                 if (s.id === targetSession!.id) {
                     return { ...s, messages: [...s.messages, aiMessage] };
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
        setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
        setEditingSessionId(null);
    };

    const deleteSession = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) startNewChat();
    }

    return (
        <App breadcrumb={t('Révisions', 'Review')}>
            <div className="gpt-layout">
                {/* SIDEBAR SESSIONS */}
                <aside className={`gpt-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                    <button className="new-chat-btn" onClick={startNewChat}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                        {t('Nouvelle discussion', 'New chat')}
                    </button>

                    <div className="sessions-list">
                        {sessions.sort((a,b) => b.updatedAt - a.updatedAt).map(s => (
                            <div key={s.id} className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}>
                                <div className="session-item-main" onClick={() => setCurrentSessionId(s.id)}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    
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
                                    <button onClick={(e) => { e.stopPropagation(); setEditingTitle(s.name); setEditingSessionId(s.id); }}>
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}>
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <div className="element-tags" style={{ flex: 1 }}>
                            {activeElements.map(el => (
                                <span key={el.raw_name} className="element-tag">
                                    {el.name} <small>{el.type}</small>
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
                                            {msg.role === 'user' ? (
                                                <div className="user-text">{msg.content}</div>
                                            ) : (
                                                <div className="review-markdown">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                </div>
                                            )}
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
                                <button type="button" className={`plus-btn ${isSearchOpen ? 'active' : ''}`} onClick={() => setIsSearchOpen(!isSearchOpen)} title="Choisir un élément">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
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
                                                        <span>{node.name}</span>
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
                            
                            <button type="submit" className="send-btn" disabled={isChatting || !chatInput.trim()}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
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

                /* Sidebar */
                .gpt-sidebar {
                    width: 260px;
                    background: var(--dash-card-bg);
                    border-right: 1px solid var(--dash-border);
                    display: flex; flex-direction: column;
                    transition: margin 0.3s ease;
                }
                .gpt-sidebar.closed {
                    margin-left: -260px;
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
                    display: none; align-items: center; gap: 4px;
                }
                .session-item:hover .session-actions, .session-item.active .session-actions {
                    display: flex;
                }
                .session-actions button {
                    background: none; border: none; color: var(--dash-text-muted);
                    cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;
                }
                .session-actions button:hover { color: #0ea5e9; }

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
