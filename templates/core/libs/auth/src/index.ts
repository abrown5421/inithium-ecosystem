import type { Request, Response, NextFunction } from 'express';
import './types/express';
import { AuthProvider, AuthTokenPayload } from './contracts/auth-provider.contract';
import { activeProvider as defaultProvider } from './providers/active-provider';

let activeProvider: AuthProvider = defaultProvider;

export const setAuthProvider = (provider: AuthProvider): void => {
  activeProvider = provider;
};

export const getAuthProvider = (): AuthProvider => activeProvider;

export const hashPassword = (plain: string): Promise<string> => activeProvider.hashPassword(plain);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  activeProvider.comparePassword(plain, hash);

export const signAccessToken = (payload: AuthTokenPayload): string =>
  activeProvider.signAccessToken(payload);

export const verifyAccessToken = (token: string): AuthTokenPayload =>
  activeProvider.verifyAccessToken(token);

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export type { AuthProvider, AuthTokenPayload } from './contracts/auth-provider.contract';
export { jwtProvider } from './providers/jwt/jwt.provider';
