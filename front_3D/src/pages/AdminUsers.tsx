import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, X, Shield, BookOpen, GraduationCap, FileSpreadsheet, FileText, User } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { getSwalTheme } from '../services/swalTheme';
import { useLanguage } from '../contexts/LanguageContext';

const RoleSelector = ({ value, onChange, disabledRoles, isLocked, t }: { t: any, value: string, onChange: (r: string) => void, disabledRoles: string[], isLocked: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
            { id: 'student', label: t('Étudiant', 'Student'), icon: <GraduationCap size={16} />, color: '#10b981', bg: '#34d39915', border: '#34d39930' },
            { id: 'teacher', label: t('Professeur', 'Teacher'), icon: <BookOpen size={16} />, color: '#f59e0b', bg: '#fbbf2415', border: '#fbbf2430' },
            { id: 'admin', label: 'Admin', icon: <Shield size={16} />, color: '#f87171', bg: '#f8717115', border: '#f8717130' }
        ].map(role => {
            const isSelected = value === role.id;
            const isDisabled = isLocked || disabledRoles.includes(role.id);
            return (
                <div 
                    key={role.id}
                    onClick={() => !isDisabled && onChange(role.id)}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${isSelected ? role.color : 'var(--dash-border)'}`,
                        background: isSelected ? role.bg : 'var(--dash-bg)',
                        color: isSelected ? role.color : 'var(--dash-text-muted)',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled && !isSelected ? 0.4 : 1,
                        transition: '0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? `0 0 10px ${role.bg}` : 'none'
                    }}
                >
                    {role.icon}
                    {role.label}
                </div>
            );
        })}
    </div>
);

const AdminUsers: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [roleCounts, setRoleCounts] = useState<{total: number; admin: number; teacher: number; student: number} | null>(null);

    const currentLoggedUser = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); }
        catch { return {}; }
    })();
    
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: 'compte@gmail.com',
        password: '',
        role: 'student'
    });

    const generateSecurePassword = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = password.length; i < 12; i++) password += allChars[Math.floor(Math.random() * allChars.length)];
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);
            const url = `users${params.toString() ? '?' + params.toString() : ''}`;
            const res = await apiCall(url);
            const usersList = Array.isArray(res) ? res : (res.data || []);
            setUsers(usersList);
            if (res.role_counts) setRoleCounts(res.role_counts);
            setSelectedIds([]);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => { fetchUsers(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search, roleFilter]);

    const handleCreateWrapper = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiCall('users', { method: 'POST', body: JSON.stringify(formData) });
            setIsAddingUser(false);
            fetchUsers();
            Swal.fire({ icon: 'success', title: t('Utilisateur créé', 'User created'), timer: 1500, showConfirmButton: false, ...getSwalTheme() });
        } catch (e: any) { Swal.fire({ title: t('Erreur', 'Error'), text: e.message || t('Erreur de création.', 'Creation error.'), icon: 'error', ...getSwalTheme() }); }
    };

    const handleEditWrapper = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...formData };
            if (!data.password) delete (data as any).password;
            await apiCall(`users/${currentUser.id}`, { method: 'POST', body: JSON.stringify({ ...data, _method: 'PUT' }) });
            setIsEditModalOpen(false);
            fetchUsers();
            Swal.fire({ icon: 'success', title: t('Mis à jour', 'Updated'), timer: 1000, showConfirmButton: false, ...getSwalTheme() });
        } catch (e: any) { Swal.fire({ title: t('Erreur', 'Error'), text: e.message || t('Erreur de modification.', 'Modification error.'), icon: 'error', ...getSwalTheme() }); }
    };

    const handleDelete = async (user: any) => {
        const { value: adminPassword } = await Swal.fire({
            title: t('Confirmer la suppression', 'Confirm deletion'),
            text: `${t('Êtes-vous sûr de vouloir supprimer', 'Are you sure you want to delete')} "${user.firstname} ${user.lastname}" ? ${t('Cette action est irréversible.', 'This action is irreversible.')}`,
            icon: 'warning',
            input: 'password',
            inputPlaceholder: t('Entrez votre mot de passe admin', 'Enter your admin password'),
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Supprimer définitivement', 'Delete permanently'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (adminPassword) {
            try {
                await apiCall(`users/${user.id}`, { method: 'POST', body: JSON.stringify({ password: adminPassword, _method: 'DELETE' }) });
                fetchUsers();
                Swal.fire({ icon: 'success', title: t('Utilisateur supprimé', 'User deleted'), timer: 1000, showConfirmButton: false, ...getSwalTheme() });
            } catch (e: any) { Swal.fire({ title: t('Erreur', 'Error'), text: e.message || t('Mot de passe incorrect ou erreur serveur.', 'Incorrect password or server error.'), icon: 'error', ...getSwalTheme() }); }
        }
    };

    const handleBulkDelete = async () => {
        const { value: adminPassword } = await Swal.fire({
            title: t('Suppression groupée', 'Bulk deletion'),
            text: `${t('Voulez-vous supprimer les', 'Do you want to delete the')} ${selectedIds.length} ${t('utilisateurs sélectionnés ? Cette action est irréversible.', 'selected users? This action is irreversible.')}`,
            icon: 'warning',
            input: 'password',
            inputPlaceholder: t('Entrez votre mot de passe admin', 'Enter your admin password'),
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Tout supprimer', 'Delete all'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (adminPassword) {
            try {
                await apiCall('users/bulk-delete', { method: 'POST', body: JSON.stringify({ password: adminPassword, ids: selectedIds }) });
                fetchUsers();
                Swal.fire({ icon: 'success', title: t('Sélection supprimée', 'Selection deleted'), timer: 1500, showConfirmButton: false, ...getSwalTheme() });
            } catch (e: any) { Swal.fire({ title: t('Erreur', 'Error'), text: e.message || t('Erreur lors de la suppression.', 'Error during deletion.'), icon: 'error', ...getSwalTheme() }); }
        }
    };

    const toggleSelectAll = () => {
        const deletableUsers = users.filter(u => u.role !== 'admin' && u.id !== currentLoggedUser.id);
        if (selectedIds.length === deletableUsers.length) setSelectedIds([]);
        else setSelectedIds(deletableUsers.map(u => u.id));
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── EXPORTS ──────────────────────────────────────────────────────────────
    const getRoleLabel = (role: string) =>
        role === 'admin' ? t('Administrateur', 'Administrator') : role === 'teacher' ? t('Professeur', 'Teacher') : t('Étudiant', 'Student');

    const exportExcel = () => {
        const rows = users.map((u, i) => {
            const row: any = {};
            row['#'] = i + 1;
            row[t('Prénom', 'First Name')] = u.firstname;
            row[t('Nom', 'Last Name')] = u.lastname;
            row[t('Email', 'Email')] = u.email;
            row[t('Rôle', 'Role')] = getRoleLabel(u.role);
            row[t('Inscrit le', 'Registered at')] = u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—';
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('Utilisateurs', 'Users'));
        // Largeurs de colonnes
        ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 14 }];
        XLSX.writeFile(wb, `utilisateurs_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const exportPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const today = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });

        // En-tête
        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, 297, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(t('Liste des Utilisateurs — Anatomy 3D', 'User List — Anatomy 3D'), 14, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${t('Généré le', 'Generated on')} ${today}  •  ${users.length} ${t('utilisateur(s)', 'user(s)')}`, 148, 12, { align: 'center' });

        autoTable(doc, {
            startY: 22,
            head: [[t('#', '#'), t('Prénom', 'First Name'), t('Nom', 'Last Name'), t('Email', 'Email'), t('Rôle', 'Role'), t('Créé le', 'Created at')]],
            body: users.map((u, i) => [
                i + 1,
                u.firstname,
                u.lastname,
                u.email,
                getRoleLabel(u.role),
                u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—',
            ]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 250, 255] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                4: { halign: 'center', cellWidth: 28 },
                5: { halign: 'center', cellWidth: 28 },
            },
        });

        // Pied de page
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`${t('Page', 'Page')} ${i} / ${pageCount}`, 290, 205, { align: 'right' });
        }

        doc.save(`utilisateurs_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    return (
        <App breadcrumb={t("Administration", "Administration")} title={t("Gestion des Utilisateurs", "User Management")}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
                            <Trash2 size={18} /> {t('Supprimer la sélection', 'Delete selection')} ({selectedIds.length})
                        </button>
                    )}
                    {/* ── Boutons Export ── */}
                    <button
                        id="btn-export-excel"
                        onClick={exportExcel}
                        disabled={users.length === 0}
                        title={t('Télécharger la liste en Excel', 'Download list in Excel')}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: users.length === 0 ? 'not-allowed' : 'pointer', opacity: users.length === 0 ? 0.5 : 1, boxShadow: '0 4px 12px rgba(22,163,74,0.2)', transition: '0.2s' }}
                    >
                        <FileSpreadsheet size={17} /> Excel
                    </button>
                    <button
                        id="btn-export-pdf"
                        onClick={exportPdf}
                        disabled={users.length === 0}
                        title={t('Télécharger la liste en PDF', 'Download list in PDF')}
                        style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: users.length === 0 ? 'not-allowed' : 'pointer', opacity: users.length === 0 ? 0.5 : 1, boxShadow: '0 4px 12px rgba(220,38,38,0.2)', transition: '0.2s' }}
                    >
                        <FileText size={17} /> PDF
                    </button>
                </div>
                <button 
                    onClick={() => { setIsAddingUser(!isAddingUser); setIsEditModalOpen(false); if(!isAddingUser) setFormData({firstname:'', lastname:'', email:'compte@gmail.com', password:generateSecurePassword(), role:'student'}); }}
                    style={{ background: isAddingUser ? 'var(--dash-border)' : '#0ea5e9', color: isAddingUser ? 'var(--dash-text)' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    {isAddingUser ? <X size={18}/> : <Plus size={18}/>} {isAddingUser ? t("Annuler l'ajout", 'Cancel addition') : t("Ajouter un Utilisateur", 'Add a User')}
                </button>
            </div>

            {roleCounts && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '140px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--dash-text)' }}>{roleCounts.total}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dash-text-muted)', marginTop: '4px' }}>{t('Total', 'Total')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '140px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{roleCounts.student}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dash-text-muted)', marginTop: '4px' }}>{t('Étudiant', 'Student')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '140px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{roleCounts.teacher}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dash-text-muted)', marginTop: '4px' }}>{t('Prof', 'Teacher')}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '140px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>{roleCounts.admin}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--dash-text-muted)', marginTop: '4px' }}>Admin</div>
                    </div>
                </div>
            )}

            {isAddingUser && (
                <div style={{ background: 'var(--dash-bg)', border: '1px solid #0ea5e950', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.1)' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20}/> {t('Créer un compte', 'Create an account')}</h3>
                    <form onSubmit={handleCreateWrapper}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div><label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Prénom', 'First Name')}</label>
                            <input type="text" required value={formData.firstname} onChange={(e)=>setFormData({...formData, firstname:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/></div>
                            <div><label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Nom', 'Last Name')}</label>
                            <input type="text" required value={formData.lastname} onChange={(e)=>setFormData({...formData, lastname:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/></div>
                        </div>
                        <div style={{marginBottom:'16px'}}><label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Email', 'Email')}</label>
                        <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/></div>
                        <div style={{marginBottom:'16px'}}><label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'8px'}}>{t("Rôle de l'utilisateur", "User Role")}</label>
                        <RoleSelector t={t} value={formData.role} onChange={(r)=>setFormData({...formData, role:r})} disabledRoles={[]} isLocked={false}/></div>
                        <div style={{marginBottom:'24px'}}><label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Mot de passe initial', 'Initial password')}</label>
                        <div style={{display:'flex',gap:'8px'}}><input type="text" required value={formData.password} onChange={(e)=>setFormData({...formData, password:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none',fontFamily:'monospace'}}/>
                        <button type="button" onClick={()=>setFormData({...formData, password:generateSecurePassword()})} style={{padding:'0 16px',background:'rgba(14,165,233,0.12)',border:'1px solid rgba(14,165,233,0.35)',borderRadius:'8px',cursor:'pointer',color:'#0ea5e9',fontWeight:600,whiteSpace:'nowrap'}}>{t('Régénérer', 'Regenerate')}</button></div></div>
                        <div style={{display:'flex',justifyContent:'flex-end',gap:'12px'}}>
                            <button type="button" onClick={()=>setIsAddingUser(false)} style={{padding:'10px 20px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'transparent',color:'var(--dash-text)',cursor:'pointer'}}>{t('Annuler', 'Cancel')}</button>
                            <button type="submit" style={{padding:'10px 24px',borderRadius:'8px',border:'none',background:'#0ea5e9',color:'#fff',fontWeight:600,cursor:'pointer'}}>{t("Créer l'utilisateur", "Create user")}</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '11px', color: 'var(--dash-text-muted)' }} />
                        <input type="text" placeholder={t('Rechercher...', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 44px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)', outline: 'none' }} />
                    </div>
                    <Filter size={18} color="var(--dash-text-muted)" />
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', outline: 'none' }}>
                        <option value="">{t('Tous les rôles', 'All roles')}</option>
                        <option value="student">{t('Étudiants', 'Students')}</option>
                        <option value="teacher">{t('Professeurs', 'Teachers')}</option>
                        <option value="admin">{t('Administrateurs', 'Administrators')}</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                                <th style={{ padding: '16px 20px', width: '40px' }}>
                                    <input type="checkbox" onChange={toggleSelectAll} checked={users.length > 0 && users.some(u => u.role !== 'admin' && u.id !== currentLoggedUser.id) && selectedIds.length === users.filter(u => u.role !== 'admin' && u.id !== currentLoggedUser.id).length} style={{width:'14px',height:'14px',accentColor:'#0ea5e9'}}/>
                                </th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Utilisateur', 'User')}</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Rôle</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Email</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>{t('Chargement...', 'Loading...')}</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>{t('Aucun utilisateur.', 'No user.')}</td></tr>
                            ) : (
                                users.map(u => {
                                    const isProtected = u.role === 'admin' || u.id === currentLoggedUser.id;
                                    return (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--dash-border)', background: selectedIds.includes(u.id) ? 'rgba(14, 165, 233, 0.03)' : 'transparent' }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                {!isProtected && <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelectOne(u.id)} style={{width:'14px',height:'14px',accentColor:'#0ea5e9'}}/>}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="user-avatar-circle" style={{ 
                                                        width: '36px', height: '36px', borderRadius: '10px', 
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        color: '#3b82f6',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                        border: '1px solid rgba(59, 130, 246, 0.2)'
                                                    }}>
                                                        <User size={18} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{u.firstname} {u.lastname}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: u.role === 'admin' ? '#f8717115' : u.role === 'teacher' ? '#fbbf2415' : '#34d39915', color: u.role === 'admin' ? '#f87171' : u.role === 'teacher' ? '#f59e0b' : '#10b981' }}>{getRoleLabel(u.role)}</span>
                                            </td>
                                            <td style={{ padding: '16px 20px', color: 'var(--dash-text-muted)' }}>{u.email}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                {!isProtected ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button onClick={() => {setCurrentUser(u); setFormData({firstname:u.firstname, lastname:u.lastname, email:u.email, password:'', role:u.role}); setIsEditModalOpen(true);}} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e' }}><Trash2 size={16} /></button>
                                                    </div>
                                                ) : <span style={{fontSize:'11px',color:'var(--dash-text-muted)',fontStyle:'italic'}}>{language === 'fr' ? 'Protégé' : 'Protected'}</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'var(--dash-bg)', width: '100%', maxWidth: '500px', borderRadius: '16px', border: '1px solid var(--dash-border)', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 20px 0' }}>{t("Modifier l'utilisateur", "Edit user")}</h3>
                        <form onSubmit={handleEditWrapper}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Prénom', 'First Name')}</label>
                                    <input type="text" value={formData.firstname} onChange={(e)=>setFormData({...formData, firstname:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/>
                                </div>
                                <div>
                                    <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Nom', 'Last Name')}</label>
                                    <input type="text" value={formData.lastname} onChange={(e)=>setFormData({...formData, lastname:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/>
                                </div>
                            </div>
                            <div style={{marginBottom:'16px'}}>
                                <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'6px'}}>{t('Email', 'Email')}</label>
                                <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none'}}/>
                            </div>
                            <div style={{marginBottom:'16px'}}>
                                <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'8px'}}>{t("Rôle de l'utilisateur", "User Role")}</label>
                                <RoleSelector t={t} value={formData.role} onChange={(r)=>setFormData({...formData, role:r})} disabledRoles={currentUser?.role === 'teacher' ? ['student'] : []} isLocked={currentUser?.role === 'admin'}/>
                            </div>
                            <div style={{marginBottom:'24px'}}>
                                <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'var(--dash-text-muted)',marginBottom:'4px'}}>
                                    {t('Nouveau mot de passe', 'New password')}&nbsp;
                                    <span style={{fontWeight:400,fontStyle:'italic',opacity:0.6}}>({t('laisser vide pour ne pas changer', 'leave blank to keep current')})</span>
                                </label>
                                <div style={{display:'flex',gap:'8px'}}>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        placeholder={t('Nouveau mot de passe...', 'New password...')}
                                        style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--dash-border)',background:'rgba(0,0,0,0.02)',color:'var(--dash-text)',outline:'none',fontFamily:'monospace'}}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, password: generateSecurePassword()})}
                                        style={{padding:'0 14px',background:'rgba(14,165,233,0.12)',border:'1px solid rgba(14,165,233,0.35)',borderRadius:'8px',cursor:'pointer',color:'#0ea5e9',fontWeight:600,whiteSpace:'nowrap'}}
                                    >
                                        {t('Régénérer', 'Regenerate')}
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)' }}>{t('Annuler', 'Cancel')}</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 600 }}>{t('Enregistrer', 'Save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </App>
    ); 
};

export default AdminUsers;