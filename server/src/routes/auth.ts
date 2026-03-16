/**
 * Auth routes — /api/auth/register and /api/auth/login
 */

import { Router } from 'express';
import { registerUser, loginUser } from '../services/authService.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen';
    res.status(400).json({ error: message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await loginUser({ login: username ?? email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login fehlgeschlagen';
    res.status(401).json({ error: message });
  }
});
