import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import { sendTestNotificationToUser } from '@/app/api/services/notificationService';

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await sendTestNotificationToUser(currentUser.id);
    return NextResponse.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('[API /push/test] Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
