import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, getDoc, onSnapshot, query, where, orderBy, deleteField } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { 
  UserProfile, Category, Profession, ServiceRequest, Quote, 
  Conversation, Message, Review, UserReport, VerificationRequest, 
  NotificationItem, LocationData, InviteCode, FeedbackItem, AnalyticsEvent, BetaConfig,
  RadarOpportunity, RadarStats, ApprovalMode, OpportunityStatus, Role, Transaction, PrivateUserInfo
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
  markConversationAsRead as markConversationAsReadInFirestore,
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