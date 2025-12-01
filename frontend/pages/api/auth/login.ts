import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, phoneNumber } = req.body;

  if (!email || !phoneNumber) {
    return res.status(400).json({ message: 'Email and phone number are required' });
  }

  try {
    const services = getServiceContainer();
    const userRepo = services.getUserRepository();
    
    const user = await userRepo.getByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check phone number (acting as password)
    // Note: In a real application, phone numbers should be hashed or verified securely.
    // This is a simplified implementation as requested.
    if (user.phoneNumber !== phoneNumber) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a simple token (base64 of user ID + timestamp)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return res.status(200).json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
