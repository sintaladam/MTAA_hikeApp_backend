import fetch from 'node-fetch';

/**
 * Sends a push notification to a single Expo push token
 * @param {string} pushToken - Expo push token (must start with 'ExponentPushToken')
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
export async function sendPushNotification(pushToken, title, body) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.warn('Invalid push token:', pushToken);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: { withSome: 'data' },
  };

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const json = await res.json();
    console.log('Push sent:', json);
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}
