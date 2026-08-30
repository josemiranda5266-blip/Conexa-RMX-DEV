import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  ServiceRequest,
  Quote,
  Transaction,
  Review,
  Conversation,
  Message,
  CategoryInfo
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_REQUESTS,
  INITIAL_QUOTES,
  INITIAL_TRANSACTIONS,
  INITIAL_REVIEWS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES
} from '../data/mockData';

interface AppContextType {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchRole: (role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN') => void;
  
  categories: CategoryInfo[];
  requests: ServiceRequest[];
  quotes: Quote[];
  transactions: Transaction[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  
  activeView: 'home' | 'requests' | 'professionals' | 'quotes' | 'messages' | 'transactions' | 'audit' | 'profile';
  setActiveView: (view: 'home' | 'requests' | 'professionals' | 'quotes' | 'messages' | 'transactions' | 'audit' | 'profile') => void;
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;

  createRequest: (data: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'quotesCount' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<ServiceRequest>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  
  submitQuote: (quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => Promise<Quote>;
  connectMercadoPago: () => Promise<boolean>;
  acceptQuote: (quoteId: string, paymentMethod?: string) => Promise<{ quote: Quote; transaction: Transaction }>;
  completeJob: (requestId: string) => Promise<boolean>;
  releasePayment: (transactionId: string) => Promise<boolean>;
  
  addReview: (reviewData: Omit<Review, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt'>) => Promise<Review>;
  
  createConversation: (targetUserId: string, requestId?: string) => string;
  sendMessage: (conversationId: string, text: string, type?: 'TEXT' | 'QUOTE_PROPOSAL' | 'SYSTEM', quoteData?: Quote) => Promise<Message>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'conexa_rmx_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('users', INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUsers = loadFromStorage('users', INITIAL_USERS);
    return savedUsers[0] || INITIAL_USERS[0];
  });
  
  const [categories] = useState<CategoryInfo[]>(INITIAL_CATEGORIES);
  const [requests, setRequests] = useState<ServiceRequest[]>(() => loadFromStorage('requests', INITIAL_REQUESTS));
  const [quotes, setQuotes] = useState<Quote[]>(() => loadFromStorage('quotes', INITIAL_QUOTES));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('transactions', INITIAL_TRANSACTIONS));
  const [reviews, setReviews] = useState<Review[]>(() => loadFromStorage('reviews', INITIAL_REVIEWS));
  const [conversations, setConversations] = useState<Conversation[]>(() => loadFromStorage('conversations', INITIAL_CONVERSATIONS));
  const [messages, setMessages] = useState<Message[]>(() => loadFromStorage('messages', INITIAL_MESSAGES));
  
  const [activeView, setActiveView] = useState<'home' | 'requests' | 'professionals' | 'quotes' | 'messages' | 'transactions' | 'audit' | 'profile'>('home');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>('conv-1');

  useEffect(() => { saveToStorage('users', users); }, [users]);
  useEffect(() => { saveToStorage('requests', requests); }, [requests]);
  useEffect(() => { saveToStorage('quotes', quotes); }, [quotes]);
  useEffect(() => { saveToStorage('transactions', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('reviews', reviews); }, [reviews]);
  useEffect(() => { saveToStorage('conversations', conversations); }, [conversations]);
  useEffect(() => { saveToStorage('messages', messages); }, [messages]);

  const switchRole = (role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN') => {
    const targetUser = users.find(u => u.role === role) || users[0];
    setCurrentUser(targetUser);
  };

  const createRequest = async (data: Omit<ServiceRequest, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'quotesCount' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const newId = `req-${Date.now()}`;
    const newReq: ServiceRequest = {
      ...data,
      id: newId,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      quotesCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Attempt backend sync
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq)
      });
    } catch {
      // In-memory / client fallback
    }

    setRequests(prev => [newReq, ...prev]);
    return newReq;
  };

  const cancelRequest = async (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'CANCELLED' } : r));
    return true;
  };

  const submitQuote = async (quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>) => {
    if (!currentUser) throw new Error('Debés iniciar sesión como profesional.');
    
    try {
      const response = await fetch('/api/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteData,
          professionalId: currentUser.id,
          professionalName: currentUser.name,
          professionalAvatar: currentUser.avatar,
          professionalRating: currentUser.rating,
          professionalVerified: currentUser.isProfessionalVerified
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.quote) {
        const savedQuote = data.quote as Quote;
        setQuotes(prev => [savedQuote, ...prev.filter(q => q.id !== savedQuote.id)]);
        setRequests(prev => prev.map(r => r.id === savedQuote.requestId ? { ...r, quotesCount: (r.quotesCount || 0) + 1, status: 'QUOTES_RECEIVED' } : r));
        const targetReq = requests.find(r => r.id === savedQuote.requestId);
        if (targetReq) {
          const convId = createConversation(targetReq.clientId, targetReq.id);
          sendMessage(convId, `Hola! Te envío un presupuesto formal para tu solicitud "${targetReq.title}".`, 'QUOTE_PROPOSAL', savedQuote);
        }
        return savedQuote;
      }
    } catch {
      // Local fallback below
    }

    const quoteId = `quote-${Date.now()}`;
    const savedQuote: Quote = {
      ...quoteData,
      id: quoteId,
      professionalId: currentUser.id,
      professionalName: currentUser.name,
      professionalAvatar: currentUser.avatar,
      professionalRating: currentUser.rating || 5.0,
      professionalVerified: currentUser.isProfessionalVerified ?? true,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    setQuotes(prev => [savedQuote, ...prev.filter(q => q.id !== savedQuote.id)]);
    setRequests(prev => prev.map(r => r.id === savedQuote.requestId ? { ...r, quotesCount: (r.quotesCount || 0) + 1, status: 'QUOTES_RECEIVED' } : r));
    const targetReq = requests.find(r => r.id === savedQuote.requestId);
    if (targetReq) {
      const convId = createConversation(targetReq.clientId, targetReq.id);
      sendMessage(convId, `Hola! Te envío un presupuesto formal para tu solicitud "${targetReq.title}".`, 'QUOTE_PROPOSAL', savedQuote);
    }
    return savedQuote;
  };

  const connectMercadoPago = async () => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, mpConnected: true } : u));
    setCurrentUser(prev => ({ ...prev, mpConnected: true }));
    return true;
  };

  const acceptQuote = async (quoteId: string, paymentMethod = 'Mercado Pago (Tarjeta de Crédito)') => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Presupuesto no encontrado');

    const updatedQuote: Quote = { ...quote, status: 'ACCEPTED' };
    const platformFee = Math.round(quote.priceArs * 0.10);
    const netProfessional = quote.priceArs - platformFee;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      serviceRequestId: quote.requestId,
      quoteId: quote.id,
      clientId: currentUser.id,
      professionalId: quote.professionalId,
      amountArs: quote.priceArs,
      platformFeeArs: platformFee,
      netProfessionalArs: netProfessional,
      status: 'PAYMENT_HELD',
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    setQuotes(prev => prev.map(q => q.id === quoteId ? updatedQuote : (q.requestId === quote.requestId ? { ...q, status: 'REJECTED' } : q)));
    setRequests(prev => prev.map(r => r.id === quote.requestId ? { ...r, status: 'PROFESSIONAL_SELECTED', assignedProfessionalId: quote.professionalId, assignedQuoteId: quote.id } : r));
    setTransactions(prev => [newTx, ...prev]);

    const convId = createConversation(quote.professionalId, quote.requestId);
    sendMessage(convId, `¡He aceptado tu presupuesto de $${quote.priceArs.toLocaleString('es-AR')}! El pago fue retenido en Garantía Escrow CONEXA.`, 'SYSTEM');

    return { quote: updatedQuote, transaction: newTx };
  };

  const completeJob = async (requestId: string) => {
    if (!currentUser) throw new Error('Debés iniciar sesión para completar el trabajo.');
    
    try {
      const response = await fetch('/api/jobs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, professionalId: currentUser.id })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REVIEW_PENDING' } : r));
        if (data.transaction) {
          const transaction = data.transaction as Transaction;
          setTransactions(prev => [transaction, ...prev.filter(t => t.id !== transaction.id)]);
        }
        return true;
      }
    } catch {
      // Local fallback
    }

    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REVIEW_PENDING' } : r));
    setTransactions(prev => prev.map(t => t.serviceRequestId === requestId ? { ...t, status: 'SERVICE_COMPLETED', completedAt: new Date().toISOString() } : t));
    return true;
  };

  const releasePayment = async (transactionId: string) => {
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'RELEASED', completedAt: t.completedAt || new Date().toISOString() } : t));
    const tx = transactions.find(t => t.id === transactionId);
    if (tx) {
      setRequests(prev => prev.map(r => r.id === tx.serviceRequestId ? { ...r, status: 'COMPLETED' } : r));
    }
    return true;
  };

  const addReview = async (reviewData: Omit<Review, 'id' | 'clientId' | 'clientName' | 'clientAvatar' | 'createdAt'>) => {
    const newRev: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      createdAt: new Date().toISOString()
    };

    setReviews(prev => [newRev, ...prev]);
    setRequests(prev => prev.map(r => r.id === reviewData.serviceRequestId ? { ...r, status: 'COMPLETED' } : r));
    
    // Update professional rating
    setUsers(prev => prev.map(u => {
      if (u.id === reviewData.professionalId) {
        const count = (u.reviewCount || 0) + 1;
        const currentRating = u.rating || 5.0;
        const newRating = Number(((currentRating * (count - 1) + reviewData.rating) / count).toFixed(2));
        return { ...u, rating: newRating, reviewCount: count, completedJobs: (u.completedJobs || 0) + 1 };
      }
      return u;
    }));

    return newRev;
  };

  const createConversation = (targetUserId: string, requestId?: string): string => {
    const existing = conversations.find(c =>
      c.participantIds.includes(currentUser.id) &&
      c.participantIds.includes(targetUserId) &&
      (!requestId || c.serviceRequestId === requestId)
    );
    if (existing) return existing.id;

    const newConvId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      serviceRequestId: requestId,
      participantIds: [currentUser.id, targetUserId],
      lastMessage: 'Conversación iniciada',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0
    };
    setConversations(prev => [newConv, ...prev]);
    return newConvId;
  };

  const sendMessage = async (conversationId: string, text: string, type: 'TEXT' | 'QUOTE_PROPOSAL' | 'SYSTEM' = 'TEXT', quoteData?: Quote) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text,
      type,
      quoteData,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setConversations(prev => prev.map(c => c.id === conversationId ? {
      ...c,
      lastMessage: text,
      lastMessageAt: new Date().toISOString()
    } : c));

    return newMsg;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        switchRole,
        categories,
        requests,
        quotes,
        transactions,
        reviews,
        conversations,
        messages,
        activeView,
        setActiveView,
        selectedRequestId,
        setSelectedRequestId,
        selectedConversationId,
        setSelectedConversationId,
        createRequest,
        cancelRequest,
        submitQuote,
        connectMercadoPago,
        acceptQuote,
        completeJob,
        releasePayment,
        addReview,
        createConversation,
        sendMessage
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
