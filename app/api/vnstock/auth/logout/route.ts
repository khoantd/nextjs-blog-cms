import { NextResponse } from 'next/server';
import { logoutVnstock } from '@/lib/vnstock-auth';

/**
 * DELETE /api/vnstock/auth/logout
 * Logout from vnstock API
 */
export async function DELETE() {
  try {
    await logoutVnstock();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Vnstock logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
