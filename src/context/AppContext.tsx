import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, collection, getDoc, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { UserProfile, Category, Profession, ServiceRequest, Quote, Conversation, Message, Review, UserReport, VerificationRequest, NotificationItem, LocationData, InviteCode, FeedbackItem, AnalyticsEvent, BetaConfig, RadarOpportunity, RadarStats, ApprovalMode, Role, Transaction } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PROFESSIONS, INITIAL_PROFILES, INITIAL_REVIEWS, INITIAL_SERVICE_REQUESTS, INITIAL_QUOTES, INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/mockData';
import { initialRadarOpportunities, initialRadarStats } from '../data/radarMockData';

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  switchUserRole: (userId: string) => void;
  switchActiveMode: (mode: 'CLIENT' | 'PROFESSIONAL') => boolean;
  authLoading: boolean;
  authSessionReady: boolean;
  isAuthPortalOpen: boolean;
  openAuthPortal: () => void;
  closeAuthPortal: () => void;
  isAdmin: () => boolean;
  hasRole: (roles: Role[]) => boolean;
  users: UserProfile[];
  categories: Category[];
  professions: Profession[];
  reviews: Review[];
  requests: ServiceRequest[];
  quotes: Quote[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  reports: UserReport[];
  verifications: VerificationRequest[];
  notifications: NotificationItem[];
  transactions: Transaction[];
  favorites: string[];
  betaConfig: BetaConfig;
  inviteCodes: InviteCode[];
  feedbacks: FeedbackItem[];
  analyticsEvents: AnalyticsEvent[];
  radarOpportunities: RadarOpportunity[];
  radarStats: RadarStats;
  approvalMode: ApprovalMode;
  setApprovalMode: (mode: ApprovalMode) => void;
  toggleFavorite: (proId: string) => void;
  sharePhoneWithUser: (conversationId: string, recipientId: string) => void;
  shareAddressWithUser: (conversationId: string, recipientId: string) => void;
  addReview: (reviewData: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'> & { quoteId: string }) => Promise<Review>;
  submitVerification: (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => Promise<VerificationRequest>;
  deleteAccount: (userId: string) => Promise<boolean>;
  acceptQuote: (quoteId: string) => Promise<Transaction | null>;
  createMercadoPagoCheckout: (transactionId: string) => Promise<string>;
  connectMercadoPago: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_PROFILES);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [professions] = useState<Profession[]>(INITIAL_PROFESSIONS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [requests, setRequests] = useState<ServiceRequest[]>(INITIAL_SERVICE_REQUESTS);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [conversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [notifications] = useState<NotificationItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [betaConfig] = useState<BetaConfig>({} as BetaConfig);
  const [inviteCodes] = useState<InviteCode[]>([]);
  const [feedbacks] = useState<FeedbackItem[]>([]);
  const [analyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [radarOpportunities] = useState<RadarOpportunity[]>(initialRadarOpportunities);
  const [radarStats] = useState<RadarStats>(initialRadarStats);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('AUTO');
  const [authLoading, setAuthLoading] = useState(true);
  const [authSessionReady, setAuthSessionReady] = useState(false);
  const [isAuthPortalOpen, setIsAuthPortalOpen] = useState(false);

  useEffect(() => {
    if (!auth) { setAuthLoading(false); setAuthSessionReady(true); return; }
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) { setCurrentUser(null); setAuthLoading(false); setAuthSessionReady(true); return; }
      try {
        const token = await firebaseUser.getIdTokenResult();
        const effectiveRole: Role = (token.claims.role as Role | undefined) || 'USER';
        const snap = db ? await getDoc(doc(db, 'users', firebaseUser.uid)) : null;
        const data = (snap?.exists() ? snap.data() : {}) as Partial<UserProfile>;
        const activeMode: 'CLIENT' | 'PROFESSIONAL' = effectiveRole === 'PROFESSIONAL' && data.activeMode === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT';
        const profile: UserProfile = {
          ...data, id: firebaseUser.uid, name: data.name || firebaseUser.displayName || 'Usuario CONEXA', email: firebaseUser.email || data.email || '', phonePrivate: data.phonePrivate || '', avatar: data.avatar || firebaseUser.photoURL || '', role: effectiveRole, joinedDate: data.joinedDate || new Date().toISOString(), location: data.location || ({ city: '', province: '', country: 'Argentina', lat: 0, lng: 0, approxZone: '' } as LocationData), isIdentityVerified: data.isIdentityVerified === true, identityVerificationStatus: data.identityVerificationStatus || 'NONE', activeMode, hasClientProfile: true, hasProfessionalProfile: effectiveRole === 'PROFESSIONAL', isProfessional: effectiveRole === 'PROFESSIONAL', isProfessionalVerified: effectiveRole === 'PROFESSIONAL' && data.isProfessionalVerified === true, professionalVerificationStatus: data.professionalVerificationStatus || 'NONE', rating: Number(data.rating || 0), reviewCount: Number(data.reviewCount || 0), jobsCompleted: Number(data.jobsCompleted || 0), trustScore: Number(data.trustScore || 0), availabilityStatus: data.availabilityStatus || 'DISPONIBLE'
        };
        setCurrentUser(profile); setUsers(prev => prev.map(u => u.id === profile.id ? { ...u, ...profile } : u));
      } catch (error) { console.error('[CONEXA AUTH] profile:', error); setCurrentUser(null); }
      finally { setAuthLoading(false); setAuthSessionReady(true); }
    });
  }, []);

  useEffect(() => {
    if (!db || !currentUser) return;
    const uid = currentUser.id;
    const admin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const unsubscribers: Unsubscribe[] = [];
    const trans = admin ? collection(db, 'transactions') : query(collection(db, 'transactions'), where('clientId', '==', uid));
    unsubscribers.push(onSnapshot(trans, s => setTransactions(s.docs.map(d => d.data() as Transaction)), e => console.warn('[CONEXA SYNC] transactions:', e.message)));
    const verif = admin ? collection(db, 'verifications') : query(collection(db, 'verifications'), where('userId', '==', uid));
    unsubscribers.push(onSnapshot(verif, s => setVerifications(s.docs.map(d => d.data() as VerificationRequest)), e => console.warn('[CONEXA SYNC] verifications:', e.message)));
    if (admin) unsubscribers.push(onSnapshot(collection(db, 'reports'), s => setReports(s.docs.map(d => d.data() as UserReport)), e => console.warn('[CONEXA SYNC] reports:', e.message)));
    return () => unsubscribers.forEach(u => u());
  }, [currentUser?.id, currentUser?.role]);

  const isAdmin = () => currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const hasRole = (roles: Role[]) => !!currentUser?.role && roles.includes(currentUser.role);
  const switchUserRole = (userId: string) => { const found = users.find(u => u.id === userId); if (found) setCurrentUser({ ...found, activeMode: found.role === 'PROFESSIONAL' && found.activeMode === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT' }); };
  const switchActiveMode = (mode: 'CLIENT' | 'PROFESSIONAL') => {
    if (!currentUser || (mode === 'PROFESSIONAL' && currentUser.role !== 'PROFESSIONAL')) return false;
    const updated = { ...currentUser, activeMode: mode };
    setCurrentUser(updated); setUsers(list => list.map(u => u.id === currentUser.id ? updated : u));
    if (isFirebaseConfigured && db) updateDoc(doc(db, 'users', currentUser.id), { activeMode: mode }).catch(e => console.warn('[CONEXA AUTH] activeMode:', e));
    return true;
  };
  const toggleFavorite = (id: string) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const sharePhoneWithUser = (_conversationId: string, _recipientId: string) => { if (!currentUser) return; };
  const shareAddressWithUser = (_conversationId: string, _recipientId: string) => { if (!currentUser) return; };

  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'> & { quoteId: string }) => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para dejar una reseña.');
    const token = await auth.currentUser.getIdToken(); const { quoteId, ...payload } = reviewData;
    const response = await fetch('/api/reviews/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payload, quoteId }) });
    const data = await response.json().catch(() => ({})); if (!response.ok || !data.success || !data.review) throw new Error(data.error || 'No se pudo guardar la reseña.');
    const saved = data.review as Review; setReviews(prev => [saved, ...prev.filter(r => r.id !== saved.id)]); return saved;
  };

  const submitVerification = async (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para solicitar una verificación.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/verifications/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type, documentName, docUrl }) });
    const data = await response.json().catch(() => ({})); if (!response.ok || !data.success || !data.verification) throw new Error(data.error || 'No se pudo enviar la verificación.');
    const saved = data.verification as VerificationRequest; setVerifications(prev => [saved, ...prev.filter(v => v.id !== saved.id)]); return saved;
  };

  const deleteAccount = async (userId: string) => {
    if (!auth?.currentUser || userId !== auth.currentUser.uid) return false;
    try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/user/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId }) }); const data = await response.json(); if (!response.ok || !data.success) return false; await auth.signOut(); setCurrentUser(null); return true; } catch { return false; }
  };

  const connectMercadoPago = async () => {
    if (!auth?.currentUser || !currentUser) throw new Error('Usuario no autenticado.');
    const oauthWindow = window.open('about:blank', 'mercadopago_oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    if (!oauthWindow) throw new Error('El navegador bloqueó la ventana emergente de Mercado Pago.');
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/mercadopago/oauth/start', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.authorizationUrl) { oauthWindow.close(); throw new Error(data.error || 'No se pudo iniciar la conexión con Mercado Pago.'); }
      oauthWindow.location.href = data.authorizationUrl;
    } catch (error) { if (!oauthWindow.closed) oauthWindow.close(); throw error; }
  };

  const acceptQuote = async (quoteId: string): Promise<Transaction | null> => {
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (!targetQuote) throw new Error('Presupuesto no disponible.');
    if (!currentUser || currentUser.role !== 'USER') throw new Error('Solo el cliente puede aceptar un presupuesto.');
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para aceptar el presupuesto.');

    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/transactions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quoteId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.transaction) throw new Error(data.error || 'No se pudo crear la contratación.');

    const transaction = data.transaction as Transaction;
    setTransactions(prev => [transaction, ...prev.filter(t => t.id !== transaction.id)]);
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'ACCEPTED' } : q));
    setRequests(prev => prev.map(r => r.id === targetQuote.requestId ? { ...r, status: 'PROFESSIONAL_SELECTED' } : r));
    return transaction;
  };

  const createMercadoPagoCheckout = async (transactionId: string): Promise<string> => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para pagar.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/mercadopago/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transactionId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.initPoint) throw new Error(data.error || 'No se pudo crear el checkout de Mercado Pago.');
    return data.initPoint as string;
  };

  const value: AppContextType = {
    currentUser, setCurrentUser, switchUserRole, switchActiveMode, authLoading, authSessionReady,
    isAuthPortalOpen, openAuthPortal: () => setIsAuthPortalOpen(true), closeAuthPortal: () => setIsAuthPortalOpen(false),
    isAdmin, hasRole, users, categories, professions, reviews, requests, quotes, conversations, messages, reports,
    verifications, notifications, transactions, favorites, betaConfig, inviteCodes, feedbacks, analyticsEvents,
    radarOpportunities, radarStats, approvalMode, setApprovalMode, toggleFavorite, sharePhoneWithUser, shareAddressWithUser,
    addReview, submitVerification, deleteAccount, acceptQuote, createMercadoPagoCheckout, connectMercadoPago
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used within AppProvider'); return context; };
