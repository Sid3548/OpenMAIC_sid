/**
 * POST /api/auth/signup
 *
 * Creates a new user with email, password, name, and mobile number.
 * Grants 1 free trial credit on signup.
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export async function POST(req: NextRequest) {
  try {
    const { name, email, mobile, password } = (await req.json()) as {
      name?: string;
      email?: string;
      mobile?: string;
      password?: string;
    };

    if (!email || !password || !name || !mobile) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'name, email, mobile and password are required',
      );
    }

    // Basic mobile validation (10 digits, optional +91 prefix)
    const mobileClean = mobile.replace(/\D/g, '');
    if (mobileClean.length < 10) {
      return apiError('INVALID_REQUEST', 400, 'Enter a valid mobile number');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('INVALID_REQUEST', 409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + grant 1 signup credit in a transaction
    const user = await prisma.$transaction(
      async (
        tx: Omit<
          typeof prisma,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >,
      ) => {
        const newUser = await tx.user.create({
          data: {
            name,
            email,
            mobile,
            passwordHash,
            credits: 1,
          },
        });

        await tx.creditLedger.create({
          data: {
            userId: newUser.id,
            delta: 1,
            balance: 1,
            reason: 'signup_bonus',
            note: 'Free trial credit on signup',
          },
        });

        return newUser;
      },
    );

    return apiSuccess({ id: user.id, email: user.email, credits: user.credits });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Signup failed',
    );
  }
}
