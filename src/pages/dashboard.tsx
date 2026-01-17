import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { Lead, LeadFormData, Source, Status, InquiryType, DescriptionEntry } from '@/types/lead';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import styles from '@/styles/Dashboard.module.css';

const SOURCES: Source[] = ['אינסטגרם', 'טיקטוק', 'פייסבוק', 'אימייל', 'טלפון'];
const STATUSES: Status[] = ['חדש', 'מענה ראשוני', 'פולואפ', 'נסגר'];
const INQUIRY_TYPES: InquiryType[] = ['איפור ערב', 'שיער ערב', 'איפור + שיער ערב', 'כלה חלקי', 'כלה מלא'];

const emptyLead: LeadFormData = {
  fullName: '',
  source: 'אינסטגרם',
  status: 'חדש',
  inquiryType: 'כלה מלא',
  closed: false,
  advancePayment: false,
  additionalDetails: '',
  importantNotes: '',
  descriptions: [],
};

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(emptyLead);
  const [newDescription, setNewDescription] = useState('');
  const [skipDay, setSkipDay] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Status | 'הכל'>('הכל');
  const [filterSource, setFilterSource] = useState<Source | 'הכל'>('הכל');
  const [filterInquiry, setFilterInquiry] = useState<InquiryType | 'הכל'>('הכל');
  const [filterClosed, setFilterClosed] = useState<'הכל' | 'פתוח' | 'סגור'>('הכל');
  const [filterPaid, setFilterPaid] = useState<'הכל' | 'שולם' | 'לא שולם'>('הכל');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: Lead[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Lead[];
      setLeads(leadsData);
    }, (error) => {
      console.error('Error fetching leads:', error);
      toast.error('שגיאה בטעינת הלידים. בדקי את הרשאות Firestore.');
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        fullName: lead.fullName,
        source: lead.source,
        status: lead.status,
        inquiryType: lead.inquiryType,
        closed: lead.closed,
        advancePayment: lead.advancePayment,
        additionalDetails: lead.additionalDetails,
        importantNotes: lead.importantNotes,
        descriptions: lead.descriptions || [],
      });
    } else {
      setEditingLead(null);
      setFormData(emptyLead);
    }
    setNewDescription('');
    setSkipDay(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
    setFormData(emptyLead);
    setNewDescription('');
    setSkipDay(false);
  };

  const handleAddDescription = () => {
    const today = format(new Date(), 'dd/MM/yyyy');
    const entry: DescriptionEntry = {
      date: today,
      text: skipDay ? '[דילגתי]' : newDescription,
      skipped: skipDay,
    };
    setFormData({
      ...formData,
      descriptions: [...formData.descriptions, entry],
    });
    setNewDescription('');
    setSkipDay(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const now = new Date().toISOString();
      
      if (editingLead) {
        await updateDoc(doc(db, 'leads', editingLead.id), {
          ...formData,
          updatedAt: now,
        });
        toast.success('הליד עודכן בהצלחה!');
      } else {
        await addDoc(collection(db, 'leads'), {
          ...formData,
          createdAt: now,
          updatedAt: now,
        });
        toast.success('הליד נוצר בהצלחה!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('שגיאה בשמירת הליד. נסי שוב.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('את בטוחה שרוצה למחוק את הליד הזה?')) {
      try {
        await deleteDoc(doc(db, 'leads', id));
        toast.success('הליד נמחק בהצלחה!');
      } catch (error) {
        toast.error('שגיאה במחיקת הליד.');
      }
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = filterStatus === 'הכל' || lead.status === filterStatus;
    const matchesSource = filterSource === 'הכל' || lead.source === filterSource;
    const matchesInquiry = filterInquiry === 'הכל' || lead.inquiryType === filterInquiry;
    const matchesClosed = filterClosed === 'הכל' || 
      (filterClosed === 'סגור' && lead.closed) || 
      (filterClosed === 'פתוח' && !lead.closed);
    const matchesPaid = filterPaid === 'הכל' || 
      (filterPaid === 'שולם' && lead.advancePayment) || 
      (filterPaid === 'לא שולם' && !lead.advancePayment);
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || lead.fullName.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSource && matchesInquiry && matchesClosed && matchesPaid && matchesSearch;
  });

  const clearAllFilters = () => {
    setFilterStatus('הכל');
    setFilterSource('הכל');
    setFilterInquiry('הכל');
    setFilterClosed('הכל');
    setFilterPaid('הכל');
    setSearchQuery('');
  };

  const hasActiveFilters = filterStatus !== 'הכל' || filterSource !== 'הכל' || 
    filterInquiry !== 'הכל' || filterClosed !== 'הכל' || filterPaid !== 'הכל' || searchQuery;

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'חדש': return styles.statusNew;
      case 'מענה ראשוני': return styles.statusInitial;
      case 'פולואפ': return styles.statusFollowup;
      case 'נסגר': return styles.statusClosed;
      default: return '';
    }
  };

  const getSourceIcon = (source: Source) => {
    switch (source) {
      case 'אינסטגרם':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      case 'טיקטוק':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        );
      case 'פייסבוק':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'אימייל':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      case 'טלפון':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        );
    }
  };

  if (loading || !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.logo}>Talya Kasif Makeup</h1>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.userName}>{user.displayName}</span>
            <button className={styles.logoutButton} onClick={logout}>
              יציאה
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="חיפוש לפי שם..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button 
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <button className={styles.addButton} onClick={() => handleOpenModal()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              הוספת ליד
            </button>
          </div>

          {/* Dropdown Filters */}
          <div className={styles.filtersRow}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | 'הכל')}
              className={`${styles.filterDropdown} ${filterStatus !== 'הכל' ? styles.filterActive : ''}`}
            >
              <option value="הכל">סטטוס: הכל</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as Source | 'הכל')}
              className={`${styles.filterDropdown} ${filterSource !== 'הכל' ? styles.filterActive : ''}`}
            >
              <option value="הכל">מקור: הכל</option>
              {SOURCES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>

            <select
              value={filterInquiry}
              onChange={(e) => setFilterInquiry(e.target.value as InquiryType | 'הכל')}
              className={`${styles.filterDropdown} ${filterInquiry !== 'הכל' ? styles.filterActive : ''}`}
            >
              <option value="הכל">סוג: הכל</option>
              {INQUIRY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filterClosed}
              onChange={(e) => setFilterClosed(e.target.value as 'הכל' | 'פתוח' | 'סגור')}
              className={`${styles.filterDropdown} ${filterClosed !== 'הכל' ? styles.filterActive : ''}`}
            >
              <option value="הכל">סגירה: הכל</option>
              <option value="פתוח">פתוח</option>
              <option value="סגור">סגור</option>
            </select>

            <select
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value as 'הכל' | 'שולם' | 'לא שולם')}
              className={`${styles.filterDropdown} ${filterPaid !== 'הכל' ? styles.filterActive : ''}`}
            >
              <option value="הכל">מקדמה: הכל</option>
              <option value="שולם">שולם</option>
              <option value="לא שולם">לא שולם</option>
            </select>

            {hasActiveFilters && (
              <button className={styles.clearFilters} onClick={clearAllFilters}>
                נקה הכל
              </button>
            )}
          </div>

          {/* Results count */}
          <div className={styles.resultsCount}>
            מציג {filteredLeads.length} מתוך {leads.length} לידים
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #B76E79, #D4A5AC)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{leads.length}</span>
              <span className={styles.statLabel}>סה״כ לידים</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #7CB69D, #A8D5BA)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{leads.filter(l => l.closed).length}</span>
              <span className={styles.statLabel}>נסגרו</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #E5B567, #F0D090)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{leads.filter(l => l.status === 'פולואפ').length}</span>
              <span className={styles.statLabel}>פולואפ</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #7B9FC7, #A8C5E5)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{leads.filter(l => l.advancePayment).length}</span>
              <span className={styles.statLabel}>שילמו מקדמה</span>
            </div>
          </div>
        </div>

        {/* Leads Grid */}
        <div className={styles.leadsGrid}>
          {filteredLeads.length === 0 ? (
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <h3>לא נמצאו לידים</h3>
              <p>התחילי להוסיף את הליד הראשון שלך</p>
            </div>
          ) : (
            filteredLeads.map((lead, index) => (
              <div
                key={lead.id}
                className={styles.leadCard}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleOpenModal(lead)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.sourceIcon}>{getSourceIcon(lead.source)}</div>
                  <span className={`${styles.statusBadge} ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
                
                <h3 className={styles.leadName}>{lead.fullName || 'ללא שם'}</h3>
                
                <div className={styles.cardMeta}>
                  <span className={styles.inquiryType}>{lead.inquiryType}</span>
                  <span className={styles.metaDot}>•</span>
                  <span className={styles.source}>{lead.source}</span>
                </div>
                
                {lead.importantNotes && (
                  <div className={styles.importantNote}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span>{lead.importantNotes.substring(0, 50)}{lead.importantNotes.length > 50 ? '...' : ''}</span>
                  </div>
                )}
                
                <div className={styles.cardFooter}>
                  <div className={styles.tags}>
                    {lead.closed && <span className={styles.tagClosed}>נסגר</span>}
                    {lead.advancePayment && <span className={styles.tagPaid}>שולם</span>}
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lead.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <button className={styles.fab} onClick={() => handleOpenModal()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingLead ? 'עריכת ליד' : 'הוספת ליד חדש'}</h2>
              <button className={styles.closeButton} onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>שם מלא</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="הכניסי שם מלא"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>מקור</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as Source })}
                  >
                    {SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>סוג הפנייה</label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value as InquiryType })}
                  >
                    {INQUIRY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.closed}
                    onChange={(e) => setFormData({ ...formData, closed: e.target.checked })}
                  />
                  <span className={styles.checkmark}></span>
                  סגירה
                </label>
                
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.advancePayment}
                    onChange={(e) => setFormData({ ...formData, advancePayment: e.target.checked })}
                  />
                  <span className={styles.checkmark}></span>
                  תשלום מקדמה
                </label>
              </div>
              
              <div className={styles.formGroup}>
                <label>פרטים נוספים</label>
                <textarea
                  value={formData.additionalDetails}
                  onChange={(e) => setFormData({ ...formData, additionalDetails: e.target.value })}
                  placeholder="הכניסי פרטים נוספים"
                  rows={3}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>הכי חשוב לזכור</label>
                <textarea
                  value={formData.importantNotes}
                  onChange={(e) => setFormData({ ...formData, importantNotes: e.target.value })}
                  placeholder="מה הכי חשוב לזכור?"
                  rows={3}
                  className={styles.importantTextarea}
                />
              </div>
              
              {/* Description Timeline */}
              <div className={styles.descriptionSection}>
                <label>תיעוד (ציר זמן)</label>
                
                <div className={styles.addDescriptionBox}>
                  <div className={styles.descriptionInputRow}>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="הוסיפי עדכון להיום..."
                      disabled={skipDay}
                    />
                    <label className={styles.skipCheckbox}>
                      <input
                        type="checkbox"
                        checked={skipDay}
                        onChange={(e) => setSkipDay(e.target.checked)}
                      />
                      דלגי
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDescription}
                      disabled={!skipDay && !newDescription.trim()}
                      className={styles.addDescButton}
                    >
                      הוסף
                    </button>
                  </div>
                </div>
                
                {formData.descriptions.length > 0 && (
                  <div className={styles.timeline}>
                    {formData.descriptions.map((desc, index) => (
                      <div key={index} className={`${styles.timelineItem} ${desc.skipped ? styles.skipped : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineDate}>{desc.date}</span>
                          <p>{desc.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={handleCloseModal}>
                  ביטול
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingLead ? 'עדכון ליד' : 'יצירת ליד'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
