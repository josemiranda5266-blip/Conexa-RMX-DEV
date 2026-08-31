import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, getDocs, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { 
  UserProfile, Category, Profession, ServiceRequest, Quote, 
  Conversation, Message, Review, UserReport, VerificationRequest, 
  NotificationItem, LocationData, InviteCode, FeedbackItem, AnalyticsEvent, BetaConfig,
  RadarOpportunity, RadarStats, ApprovalMode, OpportunityStatus, Role, Transaction
} from '../types';
import { 
  INITIAL_CATEGORIES, INITIAL_PROFESSIONS, INITIAL_PROFILES, 
  INITIAL_REVIEWS, INITIAL_SERVICE_REQUESTS, INITIAL_QUOTES, 
  INITIAL_CONVERSATIONS, INITIAL_MESSAGES 
} from '../data/mockData';
import { initialRadarOpportunities, initialRadarStats } from '../data/radarMockData';
import { canUseProfessionalMode, getDefaultProfessionalMode, matchOpportunityWithProfessionals } from '../domain/professionalMatching';
import {
  getOrCreateConversation,
  sendConversationMessage,
  subscribeToUserConversations,
  updateConversationPrivacy,
  subscribeToMessages,
  markConversationAsRead,
  type Unsubscribe,
  type StoredConversation,
  type StoredMessage,
} from '../services/conversationService';

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  switchUserRole: (userId: string) => void;
  switchActiveMode: (mode: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN') => boolean;
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
  favorites: string[]; // professional IDs
  
  // Beta 1.0 States
  betaConfig: BetaConfig;
  inviteCodes: InviteCode[];
  feedbacks: FeedbackItem[];
  analyticsEvents: AnalyticsEvent[];

  // CONEXA RADAR States
  radarOpportunities: RadarOpportunity[];
  radarStats: RadarStats;
  approvalMode: ApprovalMode;
  setApprovalMode: (mode: ApprovalMode) => void;
  updateApprovalMode: (mode: ApprovalMode) => Promise<void>;
  addRadarOpportunity: (opp: RadarOpportunity) => void;
  updateRadarOpportunity: (id: string, updates: Partial<RadarOpportunity>) => void;
  deleteRadarOpportunity: (id: string) => void;
  convertRadarOpportunity: (opportunityId: string, userId?: string) => void;
  createServiceRequestFromRadar: (
    opportunityId: string,
    clientId?: string
  ) => Promise<ServiceRequest | null>;
  
  // Search & Filter State
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedProfession: string | null;
  setSelectedProfession: (prof: string | null) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  maxDistanceKm: number;
  setMaxDistanceKm: (dist: number) => void;
  onlyVerified: boolean;
  setOnlyVerified: (v: boolean) => void;
  
  // Actions
  toggleFavorite: (proId: string) => void;
  sharePhoneWithUser: (conversationId: string, recipientId: string) => Promise<void>;
  shareAddressWithUser: (conversationId: string, recipientId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: Message['type'], quoteData?: Quote) => Promise<void>;
  subscribeConversationMessages: (conversationId: string) => Unsubscribe;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  createConversation: (targetUserId: string) => Promise<string>;
  createServiceRequest: (req: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt' | 'status' | 'quotesCount'>) => void;
  submitQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => void;
  acceptQuote: (quoteId: string) => Promise<Transaction | null>;
  connectMercadoPago: () => Promise<void>;
  createMercadoPagoCheckout: (transactionId: string) => Promise<string>;
  getMercadoPagoStatus: () => Promise<{ connected: boolean; mpUserId?: string | null; publicKey?: string | null }>;
  startJob: (jobId: string) => Promise<void>;
  completeJob: (jobId: string) => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'>) => Promise<void>;
  submitVerification: (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => void;
  approveVerification: (verificationId: string) => void;
  reportUser: (reportedUserId: string, reason: UserReport['reason'], description: string) => void;
  blockUser: (userIdToBlock: string) => void;
  resolveReport: (reportId: string, action: 'DISMISSED' | 'ACTION_TAKEN') => void;
  markNotificationRead: (notifId: string) => void;
  deleteAccount: (userId: string) => Promise<boolean>;
  
  // Beta Actions
  trackEvent: (eventName: string, context?: Record<string, any>) => void;
  submitFeedback: (category: FeedbackItem['category'], comment: string) => void;
  createInviteCode: (code: string, maxUses: number, role: UserProfile['role'], note?: string) => void;
  toggleInviteCode: (codeId: string) => void;
  updateBetaConfig: (updates: Partial<BetaConfig>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load or initialize state
  const [users, setUsers] = useState<UserProfile[]>(() => {
    if (isFirebaseConfigured) {
      return []; // empty until Firestore snapshot loads them
    }
    const saved = localStorage.getItem('conexa_users');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (isFirebaseConfigured) {
      return null;
    }
    return users[0] || null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authSessionReady, setAuthSessionReady] = useState<boolean>(!isFirebaseConfigured);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [professions] = useState<Profession[]>(INITIAL_PROFESSIONS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [requests, setRequests] = useState<ServiceRequest[]>(INITIAL_SERVICE_REQUESTS);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [favorites, setFavorites] = useState<string[]>(['pro-1']);
  const [isAuthPortalOpen, setIsAuthPortalOpen] = useState<boolean>(false);
  const openAuthPortal = () => setIsAuthPortalOpen(true);
  const closeAuthPortal = () => setIsAuthPortalOpen(false);
  
  const [reports, setReports] = useState<UserReport[]>([
    {
      id: 'rep-1',
      reporterId: 'user-particular-1',
      reporterName: 'Gonzalo Morales',
      reportedUserId: 'pro-5',
      reportedUserName: 'Jorge "Coqui" Benítez',
      reason: 'SPAM',
      description: 'Envía mensajes automáticos ofreciendo presupuesto no solicitado.',
      createdAt: 'Ayer',
      status: 'PENDING'
    }
  ]);

  const [verifications, setVerifications] = useState<VerificationRequest[]>([
    {
      id: 'ver-1',
      userId: 'pro-2',
      userName: 'Marcelo "Chelo" Juárez',
      userRole: 'PROFESSIONAL',
      type: 'PROFESSIONAL',
      documentName: 'Registro_Municipal_Plomeria_SdE.pdf',
      documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400',
      status: 'PENDING',
      createdAt: 'Hace 1 día'
    }
  ]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      userId: 'user-particular-1',
      title: 'Nuevo presupuesto recibido',
      body: 'El Ing. Carlos Mansilla envió un presupuesto para tu solicitud de aire acondicionado.',
      type: 'QUOTE',
      read: false,
      createdAt: 'Hace 1 hora',
      targetId: 'req-1'
    }
  ]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('Santiago del Estero');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(30);
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);

  // Sync users to localStorage (for local preferences only - NOT for authorization)
  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('conexa_users', JSON.stringify(users));
  }, [users]);

  const formatConversationTime = (value: any): string => {
    if (!value?.toDate) return '';
    return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toConversationView = (stored: StoredConversation): Conversation => {
    const otherUserId = stored.participantIds.find(id => id !== currentUser?.id) || stored.participantIds[0];
    const otherUser = users.find(user => user.id === otherUserId);
    const privacy = stored.privacyByUser || {};
    const firstUserId = stored.participantIds[0];
    const secondUserId = stored.participantIds[1];

    return {
      id: stored.id,
      participantIds: stored.participantIds,
      otherUser: {
        id: otherUserId,
        name: otherUser?.name || 'Usuario CONEXA',
        avatar: otherUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
        profession: otherUser?.professionName,
        isIdentityVerified: otherUser?.isIdentityVerified,
        isProfessionalVerified: otherUser?.isProfessionalVerified,
      },
      lastMessage: stored.lastMessagePreview || 'Conversación iniciada',
      lastMessageTime: formatConversationTime(stored.lastMessageAt) || 'Ahora',
      unreadCount: currentUser ? (stored.unreadCountByUser[currentUser.id] ?? 0) : 0,
      sharedPhoneBySender: privacy[firstUserId]?.phoneShared === true,
      sharedPhoneByReceiver: privacy[secondUserId]?.phoneShared === true,
      sharedAddressBySender: privacy[firstUserId]?.addressShared === true,
      sharedAddressByReceiver: privacy[secondUserId]?.addressShared === true,
    };
  };

  const toMessageView = (stored: StoredMessage): Message => ({
    id: stored.id,
    conversationId: stored.conversationId,
    senderId: stored.senderId,
    senderName: stored.senderName,
    createdAt: formatConversationTime(stored.createdAt),
    type: stored.type,
    content: stored.content,
    attachmentUrl: stored.attachmentUrl,
    quoteData: stored.quoteData as Quote | undefined,
  });

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) return;

    return subscribeToUserConversations(
      currentUser.id,
      (stored) => setConversations(stored.map(toConversationView)),
      (error) => console.warn('[CONEXA MESSAGING] Error sincronizando conversaciones:', error),
    );
  }, [currentUser?.id, users]);

  // Firebase Auth Real Listener Effect & Real-time Firestore Sync
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthSessionReady(false);
      try {
        if (firebaseUser) {
          console.log('[CONEXA AUTH] Usuario autenticado vía Firebase Auth:', firebaseUser.uid, firebaseUser.email);
          
          const tokenResult = await firebaseUser.getIdTokenResult();
          const claimRole = (tokenResult.claims.role as Role) || 'USER';
          
          if (isFirebaseConfigured && db) {
            // Load or create `/users/{uid}` in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            let profileData: Partial<UserProfile> = {};
            if (userDocSnap.exists()) {
              profileData = userDocSnap.data() as Partial<UserProfile>;

              // Private contact data must never remain in the publicly readable
              // /users document. Migrate legacy fields when found.
              const legacyPhonePrivate = profileData.phonePrivate;
              const legacyExactAddressPrivate = profileData.location?.exactAddressPrivate;

              const privateInfoRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
              const privateInfoSnap = await getDoc(privateInfoRef);

              let privateData: Record<string, unknown> = {};
              if (privateInfoSnap.exists()) {
                privateData = privateInfoSnap.data() as Record<string, unknown>;
              }

              if (legacyPhonePrivate || legacyExactAddressPrivate) {
                await setDoc(privateInfoRef, {
                  ...(legacyPhonePrivate ? { phonePrivate: legacyPhonePrivate } : {}),
                  ...(legacyExactAddressPrivate ? { exactAddressPrivate: legacyExactAddressPrivate } : {}),
                  migratedAt: new Date().toISOString(),
                }, { merge: true });

                await updateDoc(userDocRef, {
                  ...(legacyPhonePrivate ? { phonePrivate: deleteField() } : {}),
                  ...(legacyExactAddressPrivate ? { 'location.exactAddressPrivate': deleteField() } : {}),
                });

                delete (profileData as any).phonePrivate;
                if (profileData.location) delete (profileData.location as any).exactAddressPrivate;

                privateData = {
                  ...privateData,
                  ...(legacyPhonePrivate ? { phonePrivate: legacyPhonePrivate } : {}),
                  ...(legacyExactAddressPrivate ? { exactAddressPrivate: legacyExactAddressPrivate } : {}),
                };
              }

              profileData = {
                ...profileData,
                ...(typeof privateData.phonePrivate === 'string'
                  ? { phonePrivate: privateData.phonePrivate }
                  : {}),
                ...(typeof privateData.exactAddressPrivate === 'string'
                  ? {
                      location: {
                        ...(profileData.location || {}),
                        exactAddressPrivate: privateData.exactAddressPrivate,
                      },
                    }
                  : {}),
              };

              console.log('[CONEXA AUTH] Perfil público y datos privados del propietario cargados.');
            } else {
              // Create default profile for newly registered users
              const defaultProfile: UserProfile = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuario CONEXA',
                email: firebaseUser.email || '',
                phonePrivate: '',
                avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                role: claimRole,
                activeMode: claimRole === 'PROFESSIONAL' ? 'PROFESSIONAL' : claimRole === 'ADMIN' ? 'ADMIN' : 'CLIENT',
                isProfessional: claimRole === 'PROFESSIONAL',
                hasProfessionalProfile: claimRole === 'PROFESSIONAL',
                joinedDate: new Date().toLocaleDateString('es-AR'),
                location: {
                  city: 'Santiago del Estero',
                  province: 'Santiago del Estero',
                  country: 'Argentina',
                  lat: -27.7834,
                  lng: -64.2642,
                  approxZone: 'Santiago del Estero - Centro'
                },
                isIdentityVerified: firebaseUser.emailVerified || false,
                identityVerificationStatus: 'NONE',
                rating: claimRole === 'PROFESSIONAL' ? 5.0 : 0,
                reviewCount: 0,
                jobsCompleted: 0,
                trustScore: 50,
                availabilityStatus: 'DISPONIBLE'
              };
              await setDoc(userDocRef, defaultProfile);
              profileData = defaultProfile;
              console.log('[CONEXA AUTH] Perfil por defecto guardado en Firestore.');
            }
            
            // Core Auth Synch Rules: Firestore is the Source of Truth for Role & Profile (except ADMIN/SUPER_ADMIN checks)
            const firestoreRole = profileData.role;
            const isClaimAdmin = claimRole === 'ADMIN' || claimRole === 'SUPER_ADMIN';
            
            let effectiveRole: Role = 'USER';
            if (firestoreRole === 'ADMIN' || firestoreRole === 'SUPER_ADMIN') {
              if (isClaimAdmin) {
                effectiveRole = firestoreRole;
              } else {
                console.warn(`[CONEXA SECURITY] Se detectó intento de elevación de privilegios en Firestore para UID: ${firebaseUser.uid} sin Custom Claim de Admin correspondiente.`);
                effectiveRole = 'USER';
              }
            } else if (firestoreRole) {
              effectiveRole = firestoreRole;
            } else {
              effectiveRole = claimRole;
            }

            // Professional capability is independent from the currently selected app mode.
            // activeMode must never create or remove a professional profile.
            const finalHasProfessionalProfile =
              profileData.hasProfessionalProfile === true ||
              profileData.isProfessional === true ||
              effectiveRole === 'PROFESSIONAL';

            const finalIsProfessional = finalHasProfessionalProfile;

            const finalActiveMode = profileData.activeMode || 
                                    (effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN' ? 'ADMIN' : (finalIsProfessional ? 'PROFESSIONAL' : 'CLIENT'));

            console.log('[CONEXA DIAGNOSTICS]', {
              uid: firebaseUser.uid,
              firestoreRole: firestoreRole || null,
              claimRole,
              effectiveRole,
              isProfessional: finalIsProfessional,
              hasProfessionalProfile: finalHasProfessionalProfile,
              activeMode: finalActiveMode
            });

            setCurrentUser({
              ...profileData,
              id: firebaseUser.uid,
              name: profileData.name || firebaseUser.displayName || 'Usuario CONEXA',
              email: profileData.email || firebaseUser.email || '',
              avatar: profileData.avatar || firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
              role: effectiveRole,
              activeMode: finalActiveMode,
              isProfessional: finalIsProfessional,
              hasProfessionalProfile: finalHasProfessionalProfile,
              isIdentityVerified: firebaseUser.emailVerified || profileData.isIdentityVerified || false
            } as UserProfile);
            setAuthSessionReady(true);
          } else {
            // Firebase Auth configured partially or in local mode
            setCurrentUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuario Piloto',
              email: firebaseUser.email || '',
              phonePrivate: '385-555-0192',
              avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
              role: claimRole,
              joinedDate: new Date().toLocaleDateString('es-AR'),
              location: {
                city: 'Santiago del Estero',
                province: 'Santiago del Estero',
                country: 'Argentina',
                lat: -27.7834,
                lng: -64.2642,
                approxZone: 'Centro'
              },
              isIdentityVerified: true,
              rating: 5,
              reviewCount: 1,
              jobsCompleted: 3,
              trustScore: 90,
              availabilityStatus: 'DISPONIBLE'
            } as UserProfile);
            setAuthSessionReady(true);
          }
        } else {
          console.log('[CONEXA AUTH] Sin sesión activa.');
          if (isFirebaseConfigured) {
            setCurrentUser(null);
          } else {
            // Keep mock user 0 in demo mode
            setCurrentUser(INITIAL_PROFILES[0]);
          }
          setAuthSessionReady(false);
        }
      } catch (err) {
        console.warn('[CONEXA AUTH] Error procesando autenticación:', err);
        setAuthSessionReady(false);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization with Firestore in production mode
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !auth) return;

    console.log("[CONEXA SYNCHRONIZER] Sincronización activa con Firestore...");

    // Helper to seed a collection with mock data if empty
    const seedCollectionIfEmpty = async (collectionName: string, initialData: any[]) => {
      // ABSOLUTE SECURITY RULE: Never seed simulation data on real production/cloud environment
      const isProdOrCloud = import.meta.env.PROD || import.meta.env.MODE === 'production' || window.location.hostname !== 'localhost';
      if (isProdOrCloud) {
        console.log(`[CONEXA SEED] Evitando siembra de datos de simulación en producción para: ${collectionName}`);
        return;
      }
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        if (querySnapshot.empty) {
          console.log(`[CONEXA SEED] Sembrando datos para ${collectionName}...`);
          for (const item of initialData) {
            await setDoc(doc(db, collectionName, item.id || `doc-${Math.random()}`), item);
          }
        }
      } catch (err) {
        console.warn(`[CONEXA SEED] Error en ${collectionName}:`, err);
      }
    };

    // Seed collections asynchronously
    const seedAll = async () => {
      await seedCollectionIfEmpty('users', INITIAL_PROFILES);
      await seedCollectionIfEmpty('reviews', INITIAL_REVIEWS);
      await seedCollectionIfEmpty('service_requests', INITIAL_SERVICE_REQUESTS);
      await seedCollectionIfEmpty('quotes', INITIAL_QUOTES);
      await seedCollectionIfEmpty('conversations', INITIAL_CONVERSATIONS);
    };
    seedAll();

    // Set up real-time sub subscriptions

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList: UserProfile[] = [];

      snapshot.forEach(userDoc => {
        const data = userDoc.data() as UserProfile;

        uList.push({
          ...data,
          id: data.id || userDoc.id
        });
      });

      setUsers(uList);

      const authenticatedUid = auth.currentUser?.uid;

      if (authenticatedUid) {
        const updatedCurrentUser = uList.find(
          user => user.id === authenticatedUid
        );

        if (updatedCurrentUser) {
          setCurrentUser(previousUser => {
            if (!previousUser) {
              return updatedCurrentUser;
            }

            return {
              ...previousUser,
              ...updatedCurrentUser,
              id: authenticatedUid
            };
          });
        }
      }
    });

    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const list: Review[] = [];

      snapshot.forEach(doc => {
        list.push(doc.data() as Review);
      });

      setReviews(list);
    });

    let unsubOwnRequests = () => {};
    let unsubAssignedRequests = () => {};
    let unsubOpenRequests = () => {};
    let unsubTargetedRequests = () => {};

    const syncRequests = (uid: string | null) => {
      unsubOwnRequests();
      unsubAssignedRequests();
      unsubOpenRequests();
      unsubTargetedRequests();

      if (!uid) {
        setRequests([]);
        return;
      }

      const own = new Map<string, ServiceRequest>();
      const assigned = new Map<string, ServiceRequest>();
      const open = new Map<string, ServiceRequest>();
      const targeted = new Map<string, ServiceRequest>();
      const publish = () => {
        const merged = new Map<string, ServiceRequest>([
          ...open,
          ...targeted,
          ...assigned,
          ...own
        ]);
        setRequests(Array.from(merged.values()));
      };

      const syncBucket = (bucket: Map<string, ServiceRequest>, snapshot: any) => {
        bucket.clear();
        snapshot.docs.forEach((requestDoc: any) => {
          const data = requestDoc.data() as ServiceRequest;
          bucket.set(data.id || requestDoc.id, { ...data, id: data.id || requestDoc.id });
        });
        publish();
      };

      unsubOwnRequests = onSnapshot(
        query(collection(db, 'service_requests'), where('clientId', '==', uid)),
        snapshot => syncBucket(own, snapshot),
        error => console.warn('[Firestore] Error sincronizando solicitudes propias:', error)
      );

      unsubAssignedRequests = onSnapshot(
        query(collection(db, 'service_requests'), where('assignedProfessionalId', '==', uid)),
        snapshot => syncBucket(assigned, snapshot),
        error => console.warn('[Firestore] Error sincronizando trabajos asignados:', error)
      );

      unsubOpenRequests = onSnapshot(
        query(collection(db, 'service_requests'), where('discoveryMode', '==', 'OPEN')),
        snapshot => syncBucket(open, snapshot),
        error => console.warn('[Firestore] Error sincronizando oportunidades abiertas:', error)
      );

      unsubTargetedRequests = onSnapshot(
        query(collection(db, 'service_requests'), where('biddingProfessionalIds', 'array-contains', uid)),
        snapshot => syncBucket(targeted, snapshot),
        error => console.warn('[Firestore] Error sincronizando oportunidades dirigidas:', error)
      );
    };

    syncRequests(authenticatedUid || null);

    const unsubAuthRequests = auth.onAuthStateChanged(user => {
      syncRequests(user?.uid || null);
    });

    let unsubClientQuotes = () => {};
    let unsubProfessionalQuotes = () => {};

    const syncQuotes = (uid: string | null) => {
      unsubClientQuotes();
      unsubProfessionalQuotes();

      if (!uid) {
        setQuotes([]);
        return;
      }

      const byId = new Map<string, Quote>();
      const publish = () => setQuotes(Array.from(byId.values()));

      unsubClientQuotes = onSnapshot(
        query(collection(db, 'quotes'), where('clientId', '==', uid)),
        snapshot => {
          snapshot.docs.forEach(quoteDoc => {
            const data = quoteDoc.data() as Quote;
            byId.set(data.id || quoteDoc.id, { ...data, id: data.id || quoteDoc.id });
          });
          snapshot.docChanges().filter(change => change.type === 'removed').forEach(change => {
            byId.delete((change.doc.data() as Quote).id || change.doc.id);
          });
          publish();
        },
        error => console.warn('[Firestore] Error sincronizando presupuestos del cliente:', error)
      );

      unsubProfessionalQuotes = onSnapshot(
        query(collection(db, 'quotes'), where('professionalId', '==', uid)),
        snapshot => {
          snapshot.docs.forEach(quoteDoc => {
            const data = quoteDoc.data() as Quote;
            byId.set(data.id || quoteDoc.id, { ...data, id: data.id || quoteDoc.id });
          });
          snapshot.docChanges().filter(change => change.type === 'removed').forEach(change => {
            byId.delete((change.doc.data() as Quote).id || change.doc.id);
          });
          publish();
        },
        error => console.warn('[Firestore] Error sincronizando presupuestos del profesional:', error)
      );
    };

    syncQuotes(authenticatedUid || null);

    const unsubAuthQuotes = auth.onAuthStateChanged(user => {
      syncQuotes(user?.uid || null);
    });

    let unsubConversations = () => {};
    let messageUnsubscribers: Record<string, () => void> = {};

    const syncConversationMessages = (conversationIds: string[]) => {
      const nextIds = new Set(conversationIds);

      Object.entries(messageUnsubscribers).forEach(([conversationId, unsubscribe]) => {
        if (!nextIds.has(conversationId)) {
          unsubscribe();
          delete messageUnsubscribers[conversationId];
          setMessages(previous => {
            const next = { ...previous };
            delete next[conversationId];
            return next;
          });
        }
      });

      conversationIds.forEach(conversationId => {
        if (messageUnsubscribers[conversationId]) return;

        messageUnsubscribers[conversationId] = onSnapshot(
          collection(db, 'conversations', conversationId, 'messages'),
          snapshot => {
            const list: Message[] = [];

            snapshot.forEach(messageDoc => {
              const data = messageDoc.data() as Message;
              list.push({
                ...data,
                id: data.id || messageDoc.id
              });
            });

            setMessages(previous => ({
              ...previous,
              [conversationId]: list
            }));
          },
          error => {
            console.warn('[Firestore] Error sincronizando mensajes:', conversationId, error);
          }
        );
      });
    };

    const stopConversationMessages = () => {
      Object.values(messageUnsubscribers).forEach(unsubscribe => unsubscribe());
      messageUnsubscribers = {};
      setMessages({});
    };

    const syncConversations = (uid: string) => {
      unsubConversations();
      stopConversationMessages();

      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', uid)
      );

      unsubConversations = onSnapshot(conversationsQuery, (snapshot) => {
        const list: Conversation[] = [];

        snapshot.forEach(conversationDoc => {
          const data = conversationDoc.data() as Conversation;
          list.push({
            ...data,
            id: data.id || conversationDoc.id
          });
        });

        setConversations(list);
        syncConversationMessages(list.map(conversation => conversation.id));
      });
    };

    const authenticatedUid = auth.currentUser?.uid;
    if (authenticatedUid) {
      syncConversations(authenticatedUid);
    }

    const unsubAuthConversations = auth.onAuthStateChanged(user => {
      if (user) {
        syncConversations(user.uid);
      } else {
        unsubConversations();
        stopConversationMessages();
        setConversations([]);
      }
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const list: UserReport[] = [];
      snapshot.forEach(doc => list.push(doc.data() as UserReport));
      setReports(list);
    });

    const unsubVerifications = onSnapshot(collection(db, 'verifications'), (snapshot) => {
      const list: VerificationRequest[] = [];
      snapshot.forEach(doc => list.push(doc.data() as VerificationRequest));
      setVerifications(list);
    });

    let unsubClientTransactions = () => {};
    let unsubProfessionalTransactions = () => {};

    const syncTransactions = (uid: string | null) => {
      unsubClientTransactions();
      unsubProfessionalTransactions();

      if (!uid) {
        setTransactions([]);
        return;
      }

      const byId = new Map<string, Transaction>();
      const publish = () => setTransactions(Array.from(byId.values()));

      unsubClientTransactions = onSnapshot(
        query(collection(db, 'transactions'), where('clientId', '==', uid)),
        snapshot => {
          snapshot.docs.forEach(transactionDoc => {
            const data = transactionDoc.data() as Transaction;
            byId.set(data.id || transactionDoc.id, { ...data, id: data.id || transactionDoc.id });
          });
          snapshot.docChanges().filter(change => change.type === 'removed').forEach(change => {
            byId.delete((change.doc.data() as Transaction).id || change.doc.id);
          });
          publish();
        },
        error => console.warn('[Firestore] Error sincronizando transacciones del cliente:', error)
      );

      unsubProfessionalTransactions = onSnapshot(
        query(collection(db, 'transactions'), where('professionalId', '==', uid)),
        snapshot => {
          snapshot.docs.forEach(transactionDoc => {
            const data = transactionDoc.data() as Transaction;
            byId.set(data.id || transactionDoc.id, { ...data, id: data.id || transactionDoc.id });
          });
          snapshot.docChanges().filter(change => change.type === 'removed').forEach(change => {
            byId.delete((change.doc.data() as Transaction).id || change.doc.id);
          });
          publish();
        },
        error => console.warn('[Firestore] Error sincronizando transacciones del profesional:', error)
      );
    };

    syncTransactions(authenticatedUid || null);

    const unsubAuthTransactions = auth.onAuthStateChanged(user => {
      syncTransactions(user?.uid || null);
    });

    return () => {
      unsubUsers();
      unsubReviews();
      unsubOwnRequests();
      unsubAssignedRequests();
      unsubOpenRequests();
      unsubTargetedRequests();
      unsubAuthRequests();
      unsubClientQuotes();
      unsubProfessionalQuotes();
      unsubAuthQuotes();
      unsubConversations();
      stopConversationMessages();
      unsubAuthConversations();
      unsubReports();
      unsubVerifications();
      unsubClientTransactions();
      unsubProfessionalTransactions();
      unsubAuthTransactions();
    };
  }, []);

  const deleteAccount = async (userId: string): Promise<boolean> => {
    try {
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        console.log('[CONEXA AUTH] Cuenta eliminada con éxito del backend.');
        if (auth) {
          await auth.signOut();
        }
        setCurrentUser(null);
        return true;
      } else {
        console.warn('[CONEXA AUTH] Error al dar de baja la cuenta:', resData.error || response.statusText);
        alert(`Error al eliminar cuenta: ${resData.error || 'Intente nuevamente.'}`);
        return false;
      }
    } catch (err: any) {
      console.error('[CONEXA AUTH] Excepción al invocar baja de cuenta:', err);
      alert('Error de conexión al servidor al solicitar baja de cuenta.');
      return false;
    }
  };

  // Helper authorization checks based on real currentUser.role
  const isAdmin = (): boolean => {
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  };

  const hasRole = (roles: Role[]): boolean => {
    return !!currentUser?.role && roles.includes(currentUser.role);
  };

  const switchUserRole = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (!found) return;

    const updatedUser = {
      ...found,
      activeMode: getDefaultProfessionalMode(found)
    };

    setCurrentUser(updatedUser);

    if (isFirebaseConfigured && db) {
      void updateDoc(doc(db, 'users', updatedUser.id), {
        activeMode: updatedUser.activeMode
      }).catch(error => {
        console.warn('[CONEXA AUTH] Error sincronizando modo de usuario:', error);
      });
    }
  };

  const switchActiveMode = (mode: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN'): boolean => {
    if (!currentUser) {
      return false;
    }

    if (mode === 'ADMIN' && !isAdmin()) {
      console.warn(`[CONEXA SECURITY] Intento no autorizado de activar MODO ADMIN por usuario id=${currentUser.id} con rol=${currentUser.role}`);
      return false;
    }

    if (mode === 'PROFESSIONAL' && !canUseProfessionalMode(currentUser)) {
      console.warn(`[CONEXA SECURITY] Intento no autorizado de activar MODO PROFESIONAL sin perfil profesional id=${currentUser.id}`);
      return false;
    }

    if (
      mode === 'CLIENT' &&
      (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') &&
      currentUser.activeMode === 'ADMIN'
    ) {
      console.warn(`[CONEXA SECURITY] Cambio de MODO ADMIN requiere una transición explícita autorizada id=${currentUser.id}`);
    }

    {
      const updated = {
        ...currentUser,
        activeMode: mode
      };
      setCurrentUser(updated);
      setUsers(uList => uList.map(u => u.id === currentUser.id ? updated : u));

      if (isFirebaseConfigured && db) {
        const userDocRef = doc(db, 'users', currentUser.id);
        updateDoc(userDocRef, { activeMode: mode }).catch(err => {
          console.warn('[CONEXA AUTH] Error saving activeMode to Firestore:', err);
        });
      }
    }

    return true;
  };

  const toggleFavorite = (proId: string) => {
    setFavorites(prev => 
      prev.includes(proId) ? prev.filter(id => id !== proId) : [...prev, proId]
    );
  };

  const getConversationParticipantIds = (conversationId: string): [string, string] | null => {
    const conversation = conversations.find(item => item.id === conversationId);
    return conversation?.participantIds ?? null;
  };

  const isConversationParticipant = (conversationId: string): boolean => {
    if (!currentUser) return false;
    return Boolean(getConversationParticipantIds(conversationId)?.includes(currentUser.id));
  };

  const sharePhoneWithUser = async (conversationId: string, recipientId: string): Promise<void> => {
    if (!currentUser || currentUser.id === recipientId || !isConversationParticipant(conversationId)) {
      throw new Error('No autorizado para compartir teléfono en esta conversación.');
    }
    if (!isFirebaseConfigured) {
      setConversations(prev => prev.map(conversation => conversation.id === conversationId
        ? { ...conversation, ...(conversation.participantIds[0] === currentUser.id ? { sharedPhoneBySender: true } : { sharedPhoneByReceiver: true }) }
        : conversation));
      return;
    }
    await updateConversationPrivacy({ conversationId, userId: currentUser.id, phoneShared: true });
  };

  const shareAddressWithUser = async (conversationId: string, recipientId: string): Promise<void> => {
    if (!currentUser || currentUser.id === recipientId || !isConversationParticipant(conversationId)) {
      throw new Error('No autorizado para compartir domicilio en esta conversación.');
    }
    if (!isFirebaseConfigured) {
      setConversations(prev => prev.map(conversation => conversation.id === conversationId
        ? { ...conversation, ...(conversation.participantIds[0] === currentUser.id ? { sharedAddressBySender: true } : { sharedAddressByReceiver: true }) }
        : conversation));
      return;
    }
    await updateConversationPrivacy({ conversationId, userId: currentUser.id, addressShared: true });
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
    type: Message['type'] = 'TEXT',
    quoteData?: Quote,
  ): Promise<void> => {
    if (!currentUser || !isConversationParticipant(conversationId)) {
      throw new Error('No autorizado para enviar mensajes en esta conversación.');
    }

    if (!isFirebaseConfigured) {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
        content,
        quoteData,
      };
      setMessages(prev => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), newMsg] }));
      return;
    }

    if (type === 'SYSTEM') throw new Error('Los mensajes SYSTEM no pueden ser creados por el cliente.');
    await sendConversationMessage({
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      type,
      content,
      quoteData,
    });
  };

  const subscribeConversationMessages = (conversationId: string): Unsubscribe => {
    if (!currentUser || !isConversationParticipant(conversationId)) {
      return () => undefined;
    }

    if (!isFirebaseConfigured) {
      return () => undefined;
    }

    return subscribeToMessages(
      conversationId,
      (stored) => setMessages(prev => ({
        ...prev,
        [conversationId]: stored.map(toMessageView),
      })),
      (error) => console.warn('[CONEXA MESSAGING] Error sincronizando mensajes:', error),
    );
  };

  const markActiveConversationAsRead = async (conversationId: string): Promise<void> => {
    if (!currentUser || !isConversationParticipant(conversationId) || !isFirebaseConfigured) return;
    await markConversationAsRead({ conversationId, userId: currentUser.id });
  };

  const createConversation = async (targetUserId: string): Promise<string> => {
    if (!currentUser || targetUserId === currentUser.id) return '';
    const targetUser = users.find(user => user.id === targetUserId);
    if (!targetUser) throw new Error('No se puede crear una conversación con un usuario inexistente.');

    if (!isFirebaseConfigured) {
      const existing = conversations.find(c => c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUserId));
      if (existing) return existing.id;
      const newConvId = [currentUser.id, targetUserId].sort().join('_');
      setConversations(prev => prev.some(c => c.id === newConvId) ? prev : [{
        id: newConvId,
        participantIds: [currentUser.id, targetUserId],
        otherUser: {
          id: targetUserId,
          name: targetUser.name,
          avatar: targetUser.avatar,
          profession: targetUser.professionName,
          isIdentityVerified: targetUser.isIdentityVerified,
          isProfessionalVerified: targetUser.isProfessionalVerified,
        },
        lastMessage: 'Conversación iniciada',
        lastMessageTime: 'Ahora',
        unreadCount: 0,
        sharedPhoneBySender: false,
        sharedPhoneByReceiver: false,
        sharedAddressBySender: false,
        sharedAddressByReceiver: false,
      }, ...prev]);
      return newConvId;
    }

    return getOrCreateConversation(currentUser.id, targetUserId);
  };


  const createServiceRequest = async (reqData: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt' | 'status' | 'quotesCount'>) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('AUTH_TOKEN_REQUIRED');

      const response = await fetch('/api/service-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reqData)
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.serviceRequest) {
        throw new Error(payload?.code || 'SERVICE_REQUEST_CREATE_ERROR');
      }

      const newReq = payload.serviceRequest as ServiceRequest;
      setRequests(prev => [newReq, ...prev.filter(request => request.id !== newReq.id)]);
      trackEvent('service_request_created', {
        requestId: newReq.id,
        category: newReq.category,
        sourceType: newReq.sourceType || 'DIRECT'
      });
      return newReq;
    } catch (error) {
      console.warn('[CONEXA] Error creando solicitud de servicio:', error);
      throw error;
    }
  };

  const submitQuote = async (quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('es-AR'),
      status: 'PENDING'
    };

    if (!db || !auth?.currentUser) {
      throw new Error('El envío del presupuesto requiere una sesión autenticada y backend configurado.');
    }

    let quoteToStore = newQuote;
    try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('/api/quotes/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            requestId: newQuote.requestId,
            priceArs: newQuote.priceArs,
            description: newQuote.description,
            materialsIncluded: newQuote.materialsIncluded,
            estimatedTime: newQuote.estimatedTime,
            availableStartDate: newQuote.availableStartDate,
            warrantyInfo: newQuote.warrantyInfo,
            termsAndConditions: newQuote.termsAndConditions
          })
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.quote) {
          throw new Error(data.error || 'No se pudo enviar el presupuesto.');
        }
        quoteToStore = data.quote as Quote;
    } catch (e) {
      console.warn('[CONEXA QUOTES] Error enviando presupuesto al backend:', e);
      throw e;
    }

    setQuotes(prev => [quoteToStore, ...prev.filter(q => q.id !== quoteToStore.id)]);

    // Find request to open chat with client
    const targetReq = requests.find(r => r.id === quoteData.requestId);
    if (targetReq) {
      try {
        const convId = await createConversation(targetReq.clientId);
        if (convId) {
          await sendMessage(
            convId,
            `Hola! Te envío un presupuesto formal para tu solicitud "${targetReq.title}".`,
            'QUOTE_PROPOSAL',
            quoteToStore,
          );
        }
      } catch (error) {
        console.warn('[CONEXA MESSAGING] No se pudo abrir la conversación para el presupuesto:', error);
      }
    }
  };

  const connectMercadoPago = async () => {
    if (authLoading || !authSessionReady) {
      throw new Error('Verificando sesión de autenticación. Por favor reintentá en unos segundos.');
    }

    if (!auth?.currentUser || !currentUser) {
      throw new Error('Usuario no autenticado o sesión de Firebase Auth expirada. Para vincular Mercado Pago primero debés iniciar sesión.');
    }

    // Immediately open popup window synchronously during user click gesture to avoid browser popup blockers
    const oauthWindow = window.open(
      'about:blank',
      'mercadopago_oauth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!oauthWindow) {
      throw new Error('El navegador bloqueó la ventana emergente de Mercado Pago. Por favor permití las ventanas emergentes (popups) para este sitio.');
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/mercadopago/oauth/start', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data.authorizationUrl) {
        if (!oauthWindow.closed) oauthWindow.close();

        if (response.status === 401) {
          throw new Error('Usuario no autenticado o sesión de Firebase Auth expirada.');
        }
        if (data.error === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
          throw new Error('El backend de Firebase Admin no está configurado en el servidor.');
        }
        if (response.status === 503 || data.error === 'MERCADO_PAGO_NOT_CONFIGURED') {
          throw new Error('Mercado Pago no está configurado en el servidor (faltan variables de entorno MP_APP_ID / MP_CLIENT_SECRET).');
        }
        throw new Error(data.error || `Error HTTP ${response.status}: No se pudo obtener la URL de autorización de Mercado Pago.`);
      }

      oauthWindow.location.href = data.authorizationUrl;
    } catch (err: any) {
      if (oauthWindow && !oauthWindow.closed) {
        oauthWindow.close();
      }
      throw err;
    }
  };

  const getMercadoPagoStatus = async () => {
    if (authLoading || !authSessionReady) {
      return { connected: false, loading: true };
    }
    if (!auth?.currentUser || !currentUser) {
      return { connected: false, unauthenticated: true, errorCode: 'UNAUTHENTICATED_CLIENT' };
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/mercadopago/status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) {
        return {
          connected: false,
          error: data.error || 'ERROR_UNKNOWN',
          reason: data.reason || '',
          detail: data.detail || '',
          errorCode: data.error || 'ERROR_HTTP_' + response.status
        };
      }
      return data;
    } catch (err: any) {
      return { connected: false, error: err?.message || 'Error de conexión', errorCode: 'NETWORK_ERROR' };
    }
  };

  const createMercadoPagoCheckout = async (transactionId: string) => {
    if (!auth?.currentUser) throw new Error('Debés iniciar sesión para pagar.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/mercadopago/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transactionId })
    });
    const data = await response.json();
    if (!response.ok || !data.success || !data.initPoint) throw new Error(data.error || 'No se pudo crear el checkout de Mercado Pago.');
    return data.initPoint as string;
  };

  const acceptQuote = async (quoteId: string) => {
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (!targetQuote || !currentUser) throw new Error('Presupuesto o usuario no disponible.');

    if (!auth?.currentUser || !db) {
      throw new Error('La aceptación del presupuesto requiere una sesión autenticada y backend configurado.');
    }

    {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quoteId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear la transacción.');
      }
      return data.transaction as Transaction;
    }
  };

  const startJob = async (requestId: string): Promise<void> => {
    if (!auth?.currentUser) {
      throw new Error('Debés iniciar sesión para iniciar un trabajo.');
    }

    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/jobs/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.code || 'No se pudo iniciar el trabajo.');
    }

  };

  const completeJob = async (requestId: string): Promise<void> => {
    if (!db || !auth?.currentUser) {
      throw new Error('La finalización del trabajo requiere una sesión autenticada y backend configurado.');
    }

    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/jobs/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'No se pudo completar el trabajo.');
    }
  };

  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'>) => {
    const serviceRequestId = reviewData.serviceRequestId || reviewData.jobId;
    if (!serviceRequestId) {
      throw new Error('La reseña debe estar asociada a una solicitud de servicio válida.');
    }

    const newRev: Review = {
      ...reviewData,
      serviceRequestId,
      jobId: serviceRequestId,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('es-AR'),
      isVerifiedJob: true
    };

    if (db) {
      if (!auth?.currentUser) {
        throw new Error('Debés iniciar sesión para enviar una reseña.');
      }

      try {
        await setDoc(doc(db, 'reviews', newRev.id), newRev);

        const proRef = doc(db, 'users', reviewData.professionalId);
        const proSnap = await getDoc(proRef);
        if (proSnap.exists()) {
          const professional = proSnap.data() as UserProfile;
          const previousCount = professional.reviewCount || 0;
          const newCount = previousCount + 1;
          const newRating = Number(
            ((((professional.rating || 0) * previousCount) + reviewData.overallRating) / newCount).toFixed(1)
          );
          await updateDoc(proRef, {
            reviewCount: newCount,
            rating: newRating,
            jobsCompleted: (professional.jobsCompleted || 0) + 1
          });
        }

        const token = await auth.currentUser.getIdToken();
        const reviewResponse = await fetch('/api/jobs/review-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ serviceRequestId })
        });
        const reviewResult = await reviewResponse.json();
        if (!reviewResponse.ok || !reviewResult.success) {
          throw new Error(reviewResult.error || reviewResult.code || 'No se pudo cerrar el trabajo después de la reseña.');
        }

        setTransactions(prev => prev.map(transaction =>
          transaction.id === reviewResult.transactionId
            ? {
                ...transaction,
                status: 'REVIEW_COMPLETED',
                reviewCompletedAt: reviewResult.completedAt
              }
            : transaction
        ));
      } catch (e) {
        console.warn('[Firestore] Error guardando reseña:', e);
        throw e;
      }
    }

    setReviews(prev => [newRev, ...prev]);
  };

  const submitVerification = (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => {
    const newReq: VerificationRequest = {
      id: `ver-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      type,
      documentName,
      documentUrl: docUrl,
      status: 'PENDING',
      createdAt: 'Hace un instante'
    };
    setVerifications(prev => [newReq, ...prev]);

    // Update current user pending status
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        if (type === 'IDENTITY') return { ...u, identityVerificationStatus: 'PENDING' };
        return { ...u, professionalVerificationStatus: 'PENDING' };
      }
      return u;
    }));
    setCurrentUser(prev => {
      if (type === 'IDENTITY') return { ...prev, identityVerificationStatus: 'PENDING' };
      return { ...prev, professionalVerificationStatus: 'PENDING' };
    });
  };

  const getAuthenticatedRequestHeaders = async (): Promise<Record<string, string>> => {
    if (!auth?.currentUser) {
      throw new Error('Debés iniciar sesión para realizar esta operación.');
    }
    const token = await auth.currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const ensureAdminOperation = () => {
    if (!isAdmin()) {
      throw new Error('No tenés permisos administrativos para realizar esta operación.');
    }
  };

  const approveVerification = async (verificationId: string) => {
    ensureAdminOperation();
    const response = await fetch(`/api/admin/verifications/${encodeURIComponent(verificationId)}/approve`, {
      method: 'POST',
      headers: await getAuthenticatedRequestHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'No se pudo aprobar la verificación.');
    }
  };

  const reportUser = async (reportedUserId: string, reason: UserReport['reason'], description: string) => {
    if (!currentUser) throw new Error('Debés iniciar sesión para reportar un usuario.');
    const newReport: UserReport = {
      id: `rep-${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId,
      reportedUserName: users.find(u => u.id === reportedUserId)?.name || 'Usuario',
      reason,
      description,
      createdAt: 'Hace un momento',
      status: 'PENDING'
    };

    if (db) {
      await setDoc(doc(db, 'reports', newReport.id), newReport);
    }
    setReports(prev => [newReport, ...prev]);
  };

  const blockUser = async (userIdToBlock: string) => {
    ensureAdminOperation();
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userIdToBlock)}/block`, {
      method: 'POST',
      headers: await getAuthenticatedRequestHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'No se pudo bloquear al usuario.');
    }
  };

  const resolveReport = async (reportId: string, action: 'DISMISSED' | 'ACTION_TAKEN') => {
    ensureAdminOperation();
    const response = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
      method: 'POST',
      headers: await getAuthenticatedRequestHeaders(),
      body: JSON.stringify({ action })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'No se pudo resolver el reporte.');
    }
  };

  // Beta 1.0 System State
  const [betaConfig, setBetaConfig] = useState<BetaConfig>({
    isBetaActive: true,
    requireInviteCode: true,
    pilotCity: 'Santiago del Estero',
    allowNewRegistrations: true
  });

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([
    {
      id: 'inv-1',
      code: 'CONEXA-SDE-001',
      maxUses: 100,
      usedCount: 18,
      expiresAt: '2026-12-31',
      userRole: 'PROFESSIONAL',
      isActive: true,
      createdAt: '2026-08-01',
      createdForNote: 'Profesionales Piloto Santiago del Estero'
    },
    {
      id: 'inv-2',
      code: 'CONEXA-CLIENTE-002',
      maxUses: 500,
      usedCount: 42,
      expiresAt: '2026-12-31',
      userRole: 'USER',
      isActive: true,
      createdAt: '2026-08-01',
      createdForNote: 'Particulares Santiago del Estero'
    }
  ]);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([
    {
      id: 'fb-1',
      userId: 'user-particular-1',
      userName: 'Gonzalo Morales',
      userRole: 'USER',
      category: 'LIKE',
      comment: 'Me dio mucha tranquilidad poder charlar con el plomero sin tener que darle mi número de teléfono enseguida.',
      createdAt: 'Hace 2 horas',
      status: 'NEW'
    },
    {
      id: 'fb-2',
      userId: 'pro-1',
      userName: 'Carlos Mansilla',
      userRole: 'PROFESSIONAL',
      category: 'SUGGESTION',
      comment: 'Estaría bueno poder subir fotos de trabajos anteriores en formato de galería cuando armamos el presupuesto.',
      createdAt: 'Ayer',
      status: 'REVIEWED'
    }
  ]);

  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([
    { id: 'ev-1', eventName: 'user_registered', userId: 'user-particular-1', timestamp: '2026-08-09T10:00:00Z', context: { city: 'Santiago del Estero' } },
    { id: 'ev-2', eventName: 'search_performed', userId: 'user-particular-1', timestamp: '2026-08-09T10:15:00Z', context: { query: 'electricista' } },
    { id: 'ev-3', eventName: 'conversation_started', userId: 'user-particular-1', timestamp: '2026-08-09T10:20:00Z', context: { targetProId: 'pro-1' } },
    { id: 'ev-4', eventName: 'phone_share_requested', userId: 'user-particular-1', timestamp: '2026-08-09T10:25:00Z' },
    { id: 'ev-5', eventName: 'service_request_created', userId: 'user-particular-1', timestamp: '2026-08-09T11:00:00Z', context: { category: 'Hogar & Construcción' } },
    { id: 'ev-6', eventName: 'quote_sent', userId: 'pro-1', timestamp: '2026-08-09T11:30:00Z', context: { priceArs: 38000 } },
    { id: 'ev-7', eventName: 'quote_accepted', userId: 'user-particular-1', timestamp: '2026-08-09T12:00:00Z' },
    { id: 'ev-8', eventName: 'job_completed', userId: 'pro-1', timestamp: '2026-08-09T15:00:00Z' },
    { id: 'ev-9', eventName: 'review_created', userId: 'user-particular-1', timestamp: '2026-08-09T15:30:00Z', context: { rating: 5 } }
  ]);

  // Track Analytics Event (PII Free)
  const trackEvent = (eventName: string, context?: Record<string, any>) => {
    const newEv: AnalyticsEvent = {
      id: `ev-${Date.now()}`,
      eventName,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      context
    };
    setAnalyticsEvents(prev => [newEv, ...prev]);
  };

  const submitFeedback = (category: FeedbackItem['category'], comment: string) => {
    const newFb: FeedbackItem = {
      id: `fb-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      category,
      comment,
      createdAt: 'Hace un instante',
      status: 'NEW'
    };
    setFeedbacks(prev => [newFb, ...prev]);
    trackEvent('feedback_submitted', { category });
  };

  const createInviteCode = async (code: string, maxUses: number, role: UserProfile['role'], note?: string) => {
    const newCode: InviteCode = {
      id: `inv-${Date.now()}`,
      code: code.trim().toUpperCase(),
      maxUses,
      usedCount: 0,
      expiresAt: '2026-12-31',
      userRole: role,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      createdForNote: note
    };

    if (db) {
      try {
        await setDoc(doc(db, 'invite_codes', newCode.id), newCode);
        await logAdminAction('CREATE_INVITE_CODE', newCode.id, newCode.code);
        setInviteCodes(prev => [newCode, ...prev]);
      } catch (e: any) {
        console.error('[CONEXA SECURITY] Error al crear código de invitación:', e);
        alert('Error al guardar el código de invitación en el servidor.');
        throw e;
      }
    } else {
      setInviteCodes(prev => [newCode, ...prev]);
      await logAdminAction('CREATE_INVITE_CODE', newCode.id, newCode.code);
    }
  };

  const toggleInviteCode = async (codeId: string) => {
    const code = inviteCodes.find(c => c.id === codeId);
    const newStatus = code ? !code.isActive : true;

    if (db) {
      try {
        await updateDoc(doc(db, 'invite_codes', codeId), { isActive: newStatus });
        await logAdminAction('TOGGLE_INVITE_CODE', codeId, String(newStatus));
        setInviteCodes(prev => prev.map(c => c.id === codeId ? { ...c, isActive: newStatus } : c));
      } catch (e: any) {
        console.error('[CONEXA SECURITY] Error al cambiar estado de código:', e);
        alert('Error al actualizar código de invitación en el servidor.');
        throw e;
      }
    } else {
      setInviteCodes(prev => prev.map(c => c.id === codeId ? { ...c, isActive: !c.isActive } : c));
      await logAdminAction('TOGGLE_INVITE_CODE', codeId, String(newStatus));
    }
  };

  const updateBetaConfig = async (updates: Partial<BetaConfig>) => {
    if (db) {
      try {
        await setDoc(doc(db, 'beta_config', 'main'), { ...betaConfig, ...updates }, { merge: true });
        await logAdminAction('UPDATE_BETA_CONFIG', 'main', JSON.stringify(updates));
        setBetaConfig(prev => ({ ...prev, ...updates }));
      } catch (e: any) {
        console.error('[CONEXA SECURITY] Error al actualizar configuración beta:', e);
        alert('Error al actualizar configuración en el servidor.');
        throw e;
      }
    } else {
      setBetaConfig(prev => ({ ...prev, ...updates }));
      await logAdminAction('UPDATE_BETA_CONFIG', 'main', JSON.stringify(updates));
    }
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  // CONEXA RADAR System State
  const [radarOpportunities, setRadarOpportunities] = useState<RadarOpportunity[]>(() => {
    if (isFirebaseConfigured) return [];
    const saved = localStorage.getItem('conexa_radar_opportunities');
    return saved ? JSON.parse(saved) : initialRadarOpportunities;
  });

  const [radarStats, setRadarStats] = useState<RadarStats>(initialRadarStats);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('ASISTIDO');

  const updateApprovalMode = async (mode: ApprovalMode): Promise<void> => {
    if (!['AUTOMÁTICO', 'ASISTIDO', 'MANUAL'].includes(mode)) {
      throw new Error('Modo de aprobación inválido.');
    }

    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'system_config', 'radar'),
        {
          approvalMode: mode,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    setApprovalMode(mode);
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubRadarOpportunities = onSnapshot(
      collection(db, 'radar_opportunities'),
      snapshot => {
        const opportunities = snapshot.docs.map(radarDoc => {
          const data = radarDoc.data() as RadarOpportunity;
          return {
            ...data,
            id: data.id || radarDoc.id
          };
        });
        setRadarOpportunities(opportunities);
      },
      error => {
        console.warn('[CONEXA RADAR] Error sincronizando oportunidades:', error);
      }
    );

    const unsubRadarConfig = onSnapshot(
      doc(db, 'system_config', 'radar'),
      snapshot => {
        if (!snapshot.exists()) return;
        const config = snapshot.data() as { approvalMode?: ApprovalMode };
        if (config.approvalMode) setApprovalMode(config.approvalMode);
      },
      error => {
        console.warn('[CONEXA RADAR] Error sincronizando configuración:', error);
      }
    );

    return () => {
      unsubRadarOpportunities();
      unsubRadarConfig();
    };
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    localStorage.setItem('conexa_radar_opportunities', JSON.stringify(radarOpportunities));
  }, [radarOpportunities]);

  useEffect(() => {
    setRadarStats(previous => {
      const totalDetected = radarOpportunities.length;
      const newOpportunities = radarOpportunities.filter(o => o.status === 'NEW').length;
      const highIntentCount = radarOpportunities.filter(o => o.intentScore >= 80).length;
      const contactedCount = radarOpportunities.filter(o =>
        ['CONTACTED', 'RESPONDED', 'REGISTERED', 'MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED']
          .includes(o.status)
      ).length;
      const convertedUsers = radarOpportunities.filter(o => o.conversionStatus === 'CONVERTED' || o.status === 'CONVERTED').length;
      const requestsGenerated = radarOpportunities.filter(o => o.status === 'SERVICE_REQUESTED').length;
      const matchedCount = radarOpportunities.filter(o => o.matchedProfessionals.length > 0 || o.status === 'MATCHED').length;
      const respondedCount = radarOpportunities.filter(o =>
        ['RESPONDED', 'REGISTERED', 'MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED'].includes(o.status)
      ).length;
      const registeredCount = radarOpportunities.filter(o =>
        ['REGISTERED', 'MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED'].includes(o.status)
      ).length;

      const byCategory: Record<string, number> = {};
      const byLocation: Record<string, number> = {};
      const bySource: Record<string, number> = {};

      radarOpportunities.forEach(o => {
        byCategory[o.category] = (byCategory[o.category] || 0) + 1;
        const locationKey = [o.city, o.province].filter(Boolean).join(', ');
        byLocation[locationKey] = (byLocation[locationKey] || 0) + 1;
        bySource[o.source] = (bySource[o.source] || 0) + 1;
      });

      const rate = (value: number, total = totalDetected) =>
        total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

      return {
        ...previous,
        totalDetected,
        newOpportunities,
        highIntentCount,
        contactedCount,
        convertedUsers,
        requestsGenerated,
        conversionRate: rate(convertedUsers),
        qualificationRate: rate(radarOpportunities.filter(o =>
          ['QUALIFIED', 'READY_TO_CONTACT', 'CONTACTED', 'RESPONDED', 'REGISTERED', 'MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED']
            .includes(o.status)
        ).length),
        contactRate: rate(contactedCount),
        responseRate: contactedCount > 0 ? Number(((respondedCount / contactedCount) * 100).toFixed(1)) : 0,
        registrationRate: rate(registeredCount),
        matchRate: rate(matchedCount),
        serviceRequestRate: rate(requestsGenerated),
        byCategory,
        byLocation,
        bySource
      };
    });
  }, [radarOpportunities]);

  const addRadarOpportunity = (opp: RadarOpportunity) => {
    // Matching is deterministic in every environment. Simulation may provide
    // fixture matches for visual scenarios, but production data is never trusted
    // from the incoming payload.
    const matchedProfessionals =
      opp.environment === 'simulation' && Array.isArray(opp.matchedProfessionals)
        ? opp.matchedProfessionals
        : matchOpportunityWithProfessionals(users, opp);

    const opportunity = {
      ...opp,
      matchedProfessionals
    };

    setRadarOpportunities(prev => [opportunity, ...prev]);

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'radar_opportunities', opportunity.id), opportunity)
        .catch(error => console.warn('[CONEXA RADAR] Error guardando oportunidad:', error));
    }
    trackEvent('radar_opportunity_detected', { category: opp.category, source: opp.source });
  };

  const allowedRadarTransitions: Record<OpportunityStatus, OpportunityStatus[]> = {
    NEW: ['ANALYZED', 'IGNORED', 'CLOSED'],
    ANALYZED: ['QUALIFIED', 'IGNORED', 'CLOSED'],
    QUALIFIED: ['READY_TO_CONTACT', 'IGNORED', 'CLOSED'],
    READY_TO_CONTACT: ['CONTACTED', 'IGNORED', 'CLOSED'],
    CONTACTED: ['RESPONDED', 'CLOSED', 'IGNORED'],
    RESPONDED: ['REGISTERED', 'CLOSED', 'IGNORED'],
    REGISTERED: ['MATCHED', 'SERVICE_REQUESTED', 'CONVERTED', 'CLOSED'],
    MATCHED: ['SERVICE_REQUESTED', 'CONVERTED', 'CLOSED'],
    SERVICE_REQUESTED: ['CONVERTED', 'CLOSED'],
    CONVERTED: ['CLOSED'],
    CLOSED: [],
    IGNORED: []
  };

  const canTransitionRadarStatus = (
    currentStatus: OpportunityStatus,
    nextStatus: OpportunityStatus
  ): boolean => currentStatus === nextStatus || allowedRadarTransitions[currentStatus].includes(nextStatus);

  const updateRadarOpportunity = (id: string, updates: Partial<RadarOpportunity>) => {
    setRadarOpportunities(prev => prev.map(o => {
      if (o.id !== id) return o;

      if (updates.status && !canTransitionRadarStatus(o.status, updates.status)) {
        console.warn(
          '[CONEXA RADAR] Transición de estado no permitida:',
          o.status,
          '→',
          updates.status,
          'para oportunidad',
          id
        );
        return o;
      }

      const updatedOpportunity = {
        ...o,
        ...updates,
        lastUpdated: 'Hace un instante'
      };

      const shouldRecalculateMatches = Boolean(
        updates.category !== undefined ||
        updates.subcategory !== undefined ||
        updates.city !== undefined ||
        updates.province !== undefined ||
        updates.neighborhood !== undefined
      );

      const recalculatedOpportunity = shouldRecalculateMatches
        ? {
            ...updatedOpportunity,
            matchedProfessionals: matchOpportunityWithProfessionals(users, updatedOpportunity)
          }
        : updatedOpportunity;

      if (isFirebaseConfigured && db) {
        setDoc(doc(db, 'radar_opportunities', id), recalculatedOpportunity)
          .catch(error => console.warn('[CONEXA RADAR] Error actualizando oportunidad:', error));
      }

      return recalculatedOpportunity;
    }));
  };

  const deleteRadarOpportunity = (id: string) => {
    setRadarOpportunities(prev => prev.filter(o => o.id !== id));

    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'radar_opportunities', id), {
        status: 'CLOSED',
        lastUpdated: 'Hace un instante'
      }).catch(error => console.warn('[CONEXA RADAR] Error archivando oportunidad:', error));
    }
  };

  const createServiceRequestFromRadar = async (
    opportunityId: string,
    clientId?: string
  ): Promise<ServiceRequest | null> => {
    const opportunity = radarOpportunities.find(o => o.id === opportunityId);
    if (!opportunity) {
      console.warn('[CONEXA RADAR] No se encontró la oportunidad:', opportunityId);
      return null;
    }

    if (!['REGISTERED', 'MATCHED', 'SERVICE_REQUESTED'].includes(opportunity.status)) {
      console.warn('[CONEXA RADAR] Estado no válido para generar solicitud:', opportunity.status);
      return null;
    }

    if (opportunity.consentStatus === 'PENDING_CONSENT') {
      console.warn('[CONEXA RADAR] Falta consentimiento antes de generar la solicitud.');
      return null;
    }

    const resolvedClientId = clientId || opportunity.clientUserId || currentUser?.id;
    if (!currentUser || currentUser.id !== resolvedClientId) {
      console.warn('[CONEXA RADAR] La identidad autenticada no coincide con el cliente de la oportunidad.');
      return null;
    }

    const existingRequest = requests.find(request => request.radarOpportunityId === opportunityId);
    if (existingRequest) return existingRequest;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('AUTH_TOKEN_REQUIRED');

      const response = await fetch(
        `/api/radar/opportunities/${encodeURIComponent(opportunityId)}/create-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.serviceRequest) {
        throw new Error(payload?.code || 'RADAR_REQUEST_CREATE_ERROR');
      }

      const newRequest = payload.serviceRequest as ServiceRequest;
      setRequests(prev => [newRequest, ...prev.filter(request => request.id !== newRequest.id)]);

      const radarUpdates = {
        clientUserId: currentUser.id,
        linkedAt: new Date().toISOString(),
        status: 'SERVICE_REQUESTED' as OpportunityStatus,
        conversionStatus: 'PENDING' as const,
        lastUpdated: 'Hace un instante'
      };

      setRadarOpportunities(prev => prev.map(o =>
        o.id === opportunityId ? { ...o, ...radarUpdates } : o
      ));

      trackEvent('radar_service_request_created', {
        opportunityId,
        requestId: newRequest.id,
        category: opportunity.category
      });

      return newRequest;
    } catch (error) {
      console.warn('[CONEXA RADAR] Error generando solicitud desde oportunidad:', error);
      return null;
    }
  };

  const convertRadarOpportunity = (opportunityId: string, userId?: string) => {
    const opportunity = radarOpportunities.find(o => o.id === opportunityId);

    if (!opportunity) {
      console.warn('[CONEXA RADAR] No se encontró la oportunidad a convertir:', opportunityId);
      return;
    }

    if (opportunity.conversionStatus === 'CONVERTED' || opportunity.status === 'CONVERTED') {
      console.warn('[CONEXA RADAR] La oportunidad ya fue convertida:', opportunityId);
      return;
    }

    if (!canTransitionRadarStatus(opportunity.status, 'CONVERTED')) {
      console.warn(
        '[CONEXA RADAR] Conversión no permitida desde el estado:',
        opportunity.status,
        'para oportunidad',
        opportunityId
      );
      return;
    }

    const matchedProfessionalIds = new Set(
      opportunity.matchedProfessionals.map(match => match.professionalId)
    );

    if (userId && matchedProfessionalIds.size > 0 && !matchedProfessionalIds.has(userId)) {
      console.warn(
        '[CONEXA RADAR] El usuario indicado para la conversión no pertenece al matching de la oportunidad:',
        opportunityId
      );
      return;
    }

    const conversionUpdates = {
      status: 'CONVERTED' as OpportunityStatus,
      conversionStatus: 'CONVERTED' as const,
      lastUpdated: 'Hace un instante'
    };

    setRadarOpportunities(prev => prev.map(o =>
      o.id === opportunityId ? { ...o, ...conversionUpdates } : o
    ));

    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'radar_opportunities', opportunityId), conversionUpdates)
        .catch(error => {
          console.warn('[CONEXA RADAR] Error registrando conversión:', error);
        });
    }

    trackEvent('radar_opportunity_converted', {
      opportunityId,
      userId,
      matchedProfessionalCount: matchedProfessionalIds.size,
      previousStatus: opportunity.status
    });
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, switchUserRole, switchActiveMode, authLoading, authSessionReady,
      isAuthPortalOpen, openAuthPortal, closeAuthPortal,
      isAdmin, hasRole,
      users, categories, professions, reviews, requests, quotes, 
      conversations, messages, reports, verifications, notifications, transactions, favorites,
      betaConfig, inviteCodes, feedbacks, analyticsEvents,
      radarOpportunities, radarStats, approvalMode, setApprovalMode, updateApprovalMode,
      addRadarOpportunity, updateRadarOpportunity, deleteRadarOpportunity, convertRadarOpportunity, createServiceRequestFromRadar,
      searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
      selectedProfession, setSelectedProfession, selectedCity, setSelectedCity,
      maxDistanceKm, setMaxDistanceKm, onlyVerified, setOnlyVerified,
      toggleFavorite, sharePhoneWithUser, shareAddressWithUser, sendMessage,
      createConversation, createServiceRequest, submitQuote, acceptQuote, connectMercadoPago, createMercadoPagoCheckout, getMercadoPagoStatus, startJob, completeJob,
      addReview, submitVerification, approveVerification, reportUser, blockUser,
      resolveReport, markNotificationRead, deleteAccount,
      trackEvent, submitFeedback, createInviteCode, toggleInviteCode, updateBetaConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
