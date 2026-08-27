import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import { getUserRepository } from '@inithium/db';
import { hashPassword, comparePassword, signAccessToken, requireAuth } from '@inithium/auth';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router: RouterType = Router();

router.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { email, password, firstName, lastName } = parsed.data;
  const userRepository = getUserRepository();

  try {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ email, firstName, lastName, passwordHash });
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

    res.status(201).json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      accessToken,
    });
  } catch (error) {
    console.error('❌ Registration failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await getUserRepository().findByEmail(email);
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    res.status(200).json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      accessToken,
    });
  } catch (error) {
    console.error('❌ Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/auth/me', requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({ user: req.user });
});

export default router;
