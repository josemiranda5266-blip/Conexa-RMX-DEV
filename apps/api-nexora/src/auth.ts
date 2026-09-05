import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getDb } from './firebaseAdmin.js';

export interface AuthenticatedRequest extends Request { userId?: string; }

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const decoded = await getAuth().verifyIdToken(token);
    const user = await getDb().collection('users').doc(decoded.uid).get();
    if (user.exists && user.data()?.isBlocked === true) return res.status(403).json({ error: 'User is blocked' });
    req.userId = decoded.uid;
    next();
  } catch { return res.status(401).json({ error: 'Invalid authentication token' }); }
}
