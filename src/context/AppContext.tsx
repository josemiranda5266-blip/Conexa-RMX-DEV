import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, Category, Profession, ServiceRequest, Quote, 
  Conversation, Message, Review, UserReport, VerificationRequest, 
  NotificationItem, LocationData, InviteCode, FeedbackItem, AnalyticsEvent, BetaConfig,
  RadarOpportunity, RadarStats, ApprovalMode
} from '../types';
import { 
  INITIAL_CATEGORIES, INITIAL_PROFESSIONS, INITIAL_PROFILES, 
  INITIAL_REVIEWS, INITIAL_SERVICE_REQUESTS, INITIAL_QUOTES, 
  INITIAL_CONVERSATIONS, INITIAL_MESSAGES 
} from '../data/mockData';
import { initialRadarOpportunities, initialRadarStats } from '../data/radarMockData';

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchUserRole: (userId: string) => void;
  switchActiveMode: (mode: 'CLIENT' | 'PROFESSIONAL') => void;
  
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
  addRadarOpportunity: (opp: RadarOpportunity) => void;
  updateRadarOpportunity: (id: string, updates: Partial<RadarOpportunity>) => void;
  deleteRadarOpportunity: (id: string) => void;
  convertRadarOpportunity: (opportunityId: string, userId?: string) => void;
  
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
  sharePhoneWithUser: (conversationId: string, recipientId: string) => void;
  shareAddressWithUser: (conversationId: string, recipientId: string) => void;
  sendMessage: (conversationId: string, content: string, type?: Message['type'], quoteData?: Quote) => void;
  createConversation: (targetUserId: string) => string;
  createServiceRequest: (req: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt' | 'status' | 'quotesCount'>) => void;
  submitQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => void;
  acceptQuote: (quoteId: string) => void;
  completeJob: (jobId: string) => void;
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'>) => void;
  submitVerification: (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => void;
  approveVerification: (verificationId: string) => void;
  reportUser: (reportedUserId: string, reason: UserReport['reason'], description: string) => void;
  blockUser: (userIdToBlock: string) => void;
  resolveReport: (reportId: string, action: 'DISMISSED' | 'ACTION_TAKEN') => void;
  markNotificationRead: (notifId: string) => void;
  
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
    const saved = localStorage.getItem('conexa_users');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => users[0]);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [professions] = useState<Profession[]>(INITIAL_PROFESSIONS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [requests, setRequests] = useState<ServiceRequest[]>(INITIAL_SERVICE_REQUESTS);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [favorites, setFavorites] = useState<string[]>(['pro-1']);
  
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

  // Sync users to localStorage
  useEffect(() => {
    localStorage.setItem('conexa_users', JSON.stringify(users));
  }, [users]);

  const switchUserRole = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) setCurrentUser(found);
  };

  const switchActiveMode = (mode: 'CLIENT' | 'PROFESSIONAL') => {
    setCurrentUser(prev => {
      const updated = {
        ...prev,
        activeMode: mode
      };
      setUsers(uList => uList.map(u => u.id === prev.id ? updated : u));
      return updated;
    });
  };

  const toggleFavorite = (proId: string) => {
    setFavorites(prev => 
      prev.includes(proId) ? prev.filter(id => id !== proId) : [...prev, proId]
    );
  };

  const sharePhoneWithUser = (conversationId: string, recipientId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          sharedPhoneBySender: c.participantIds[0] === currentUser.id ? true : c.sharedPhoneBySender,
          sharedPhoneByReceiver: c.participantIds[1] === currentUser.id ? true : c.sharedPhoneByReceiver
        };
      }
      return c;
    }));

    sendMessage(
      conversationId,
      `📱 ${currentUser.name} compartió voluntariamente su número de teléfono privado: ${currentUser.phonePrivate}`,
      'SHARED_PHONE'
    );
  };

  const shareAddressWithUser = (conversationId: string, recipientId: string) => {
    const exactAddress = currentUser.location.exactAddressPrivate || 'Dirección no provista';
    
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          sharedAddressBySender: c.participantIds[0] === currentUser.id ? true : c.sharedAddressBySender,
          sharedAddressByReceiver: c.participantIds[1] === currentUser.id ? true : c.sharedAddressByReceiver
        };
      }
      return c;
    }));

    sendMessage(
      conversationId,
      `📍 ${currentUser.name} compartió voluntariamente su domicilio exacto para la visita: ${exactAddress}`,
      'SHARED_ADDRESS'
    );
  };

  const sendMessage = (conversationId: string, content: string, type: Message['type'] = 'TEXT', quoteData?: Quote) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      content,
      quoteData
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: type === 'SHARED_PHONE' ? '📱 Teléfono compartido' : type === 'SHARED_ADDRESS' ? '📍 Domicilio compartido' : type === 'QUOTE_PROPOSAL' ? '📋 Presupuesto enviado' : content,
          lastMessageTime: newMsg.createdAt
        };
      }
      return c;
    }));
  };

  const createConversation = (targetUserId: string): string => {
    const existing = conversations.find(c => 
      c.participantIds.includes(currentUser.id) && c.participantIds.includes(targetUserId)
    );
    if (existing) return existing.id;

    const targetUser = users.find(u => u.id === targetUserId);
    const newConvId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      participantIds: [currentUser.id, targetUserId],
      otherUser: {
        id: targetUserId,
        name: targetUser?.name || 'Usuario CONEXA',
        avatar: targetUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
        profession: targetUser?.professionName,
        isIdentityVerified: targetUser?.isIdentityVerified,
        isProfessionalVerified: targetUser?.isProfessionalVerified
      },
      lastMessage: 'Conversación iniciada',
      lastMessageTime: 'Ahora',
      unreadCount: 0,
      sharedPhoneBySender: false,
      sharedPhoneByReceiver: false,
      sharedAddressBySender: false,
      sharedAddressByReceiver: false
    };

    setConversations(prev => [newConv, ...prev]);
    setMessages(prev => ({
      ...prev,
      [newConvId]: [
        {
          id: `m-init-${Date.now()}`,
          conversationId: newConvId,
          senderId: 'system',
          senderName: 'CONEXA',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'SYSTEM',
          content: '🔒 CONEXA PRIVACIDAD: La conversación está protegida. Tu número telefónico y domicilio exacto NO son visibles hasta que los compartas voluntariamente.'
        }
      ]
    }));

    return newConvId;
  };

  const createServiceRequest = (reqData: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt' | 'status' | 'quotesCount'>) => {
    const newReq: ServiceRequest = {
      ...reqData,
      id: `req-${Date.now()}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      createdAt: 'Recién publicado',
      status: 'REQUEST_CREATED',
      quotesCount: 0
    };
    setRequests(prev => [newReq, ...prev]);
  };

  const submitQuote = (quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      createdAt: 'Recién enviado',
      status: 'PENDING'
    };
    setQuotes(prev => [newQuote, ...prev]);

    // Update request status & count
    setRequests(prev => prev.map(r => {
      if (r.id === quoteData.requestId) {
        return {
          ...r,
          quotesCount: r.quotesCount + 1,
          status: 'QUOTES_RECEIVED'
        };
      }
      return r;
    }));

    // Find request to open chat with client
    const targetReq = requests.find(r => r.id === quoteData.requestId);
    if (targetReq) {
      const convId = createConversation(targetReq.clientId);
      sendMessage(convId, `Hola! Te envío un presupuesto formal para tu solicitud "${targetReq.title}".`, 'QUOTE_PROPOSAL', newQuote);
    }
  };

  const acceptQuote = (quoteId: string) => {
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'ACCEPTED' } : q));
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (targetQuote) {
      setRequests(prev => prev.map(r => r.id === targetQuote.requestId ? { ...r, status: 'PROFESSIONAL_SELECTED' } : r));
    }
  };

  const completeJob = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REVIEW_PENDING' } : r));
  };

  const addReview = (reviewData: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'>) => {
    const newRev: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: 'Recién publicado',
      isVerifiedJob: true
    };
    setReviews(prev => [newRev, ...prev]);

    // Recalculate target professional rating
    setUsers(prev => prev.map(u => {
      if (u.id === reviewData.professionalId) {
        const newCount = u.reviewCount + 1;
        const newRating = Number(((u.rating * u.reviewCount + reviewData.overallRating) / newCount).toFixed(1));
        return {
          ...u,
          reviewCount: newCount,
          rating: newRating,
          jobsCompleted: u.jobsCompleted + 1
        };
      }
      return u;
    }));
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

  const approveVerification = (verificationId: string) => {
    const req = verifications.find(v => v.id === verificationId);
    if (!req) return;

    setVerifications(prev => prev.map(v => v.id === verificationId ? { ...v, status: 'VERIFIED' } : v));

    setUsers(prev => prev.map(u => {
      if (u.id === req.userId) {
        if (req.type === 'IDENTITY') {
          return { ...u, isIdentityVerified: true, identityVerificationStatus: 'VERIFIED' };
        } else {
          return { ...u, isProfessionalVerified: true, professionalVerificationStatus: 'VERIFIED' };
        }
      }
      return u;
    }));
  };

  const reportUser = (reportedUserId: string, reason: UserReport['reason'], description: string) => {
    const reportedUser = users.find(u => u.id === reportedUserId);
    const newReport: UserReport = {
      id: `rep-${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId,
      reportedUserName: reportedUser?.name || 'Usuario',
      reason,
      description,
      createdAt: 'Hace un momento',
      status: 'PENDING'
    };
    setReports(prev => [newReport, ...prev]);
  };

  const blockUser = (userIdToBlock: string) => {
    setUsers(prev => prev.map(u => u.id === userIdToBlock ? { ...u, isBlocked: true } : u));
  };

  const resolveReport = (reportId: string, action: 'DISMISSED' | 'ACTION_TAKEN') => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action } : r));
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

  const createInviteCode = (code: string, maxUses: number, role: UserProfile['role'], note?: string) => {
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
    setInviteCodes(prev => [newCode, ...prev]);
  };

  const toggleInviteCode = (codeId: string) => {
    setInviteCodes(prev => prev.map(c => c.id === codeId ? { ...c, isActive: !c.isActive } : c));
  };

  const updateBetaConfig = (updates: Partial<BetaConfig>) => {
    setBetaConfig(prev => ({ ...prev, ...updates }));
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  // CONEXA RADAR System State
  const [radarOpportunities, setRadarOpportunities] = useState<RadarOpportunity[]>(() => {
    const saved = localStorage.getItem('conexa_radar_opportunities');
    return saved ? JSON.parse(saved) : initialRadarOpportunities;
  });

  const [radarStats, setRadarStats] = useState<RadarStats>(initialRadarStats);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('ASISTIDO');

  useEffect(() => {
    localStorage.setItem('conexa_radar_opportunities', JSON.stringify(radarOpportunities));
  }, [radarOpportunities]);

  const addRadarOpportunity = (opp: RadarOpportunity) => {
    setRadarOpportunities(prev => [opp, ...prev]);
    setRadarStats(prev => ({
      ...prev,
      totalDetected: prev.totalDetected + 1,
      newOpportunities: prev.newOpportunities + 1,
      highIntentCount: opp.intentScore >= 80 ? prev.highIntentCount + 1 : prev.highIntentCount,
      byCategory: {
        ...prev.byCategory,
        [opp.category]: (prev.byCategory[opp.category] || 0) + 1
      }
    }));
    trackEvent('radar_opportunity_detected', { category: opp.category, source: opp.source });
  };

  const updateRadarOpportunity = (id: string, updates: Partial<RadarOpportunity>) => {
    setRadarOpportunities(prev => prev.map(o => o.id === id ? { ...o, ...updates, lastUpdated: 'Hace un instante' } : o));
  };

  const deleteRadarOpportunity = (id: string) => {
    setRadarOpportunities(prev => prev.filter(o => o.id !== id));
  };

  const convertRadarOpportunity = (opportunityId: string, userId?: string) => {
    setRadarOpportunities(prev => prev.map(o => {
      if (o.id === opportunityId) {
        return {
          ...o,
          status: 'CONVERTED',
          conversionStatus: 'CONVERTED',
          lastUpdated: 'Hace un instante'
        };
      }
      return o;
    }));

    setRadarStats(prev => {
      const newConverted = prev.convertedUsers + 1;
      return {
        ...prev,
        convertedUsers: newConverted,
        conversionRate: Number(((newConverted / (prev.totalDetected || 1)) * 100).toFixed(1))
      };
    });

    trackEvent('radar_opportunity_converted', { opportunityId, userId });
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, switchUserRole, switchActiveMode,
      users, categories, professions, reviews, requests, quotes, 
      conversations, messages, reports, verifications, notifications, favorites,
      betaConfig, inviteCodes, feedbacks, analyticsEvents,
      radarOpportunities, radarStats, approvalMode, setApprovalMode,
      addRadarOpportunity, updateRadarOpportunity, deleteRadarOpportunity, convertRadarOpportunity,
      searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
      selectedProfession, setSelectedProfession, selectedCity, setSelectedCity,
      maxDistanceKm, setMaxDistanceKm, onlyVerified, setOnlyVerified,
      toggleFavorite, sharePhoneWithUser, shareAddressWithUser, sendMessage,
      createConversation, createServiceRequest, submitQuote, acceptQuote, completeJob,
      addReview, submitVerification, approveVerification, reportUser, blockUser,
      resolveReport, markNotificationRead,
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
