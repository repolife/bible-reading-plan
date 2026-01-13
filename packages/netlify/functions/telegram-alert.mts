import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Missing Telegram credentials');
    return { statusCode: 500, body: 'Server Error: Missing credentials' };
  }

  try {
    if (!event.body) {
        return { statusCode: 400, body: 'Missing body' };
    }
    const data = JSON.parse(event.body);
    const { action, event: eventDetails } = data;
    
    let message = '';
    const eventTitle = eventDetails.event_title || eventDetails.title || 'Untitled Event';
    const eventDate = new Date(eventDetails.event_start || eventDetails.start).toLocaleDateString();
    
    if (action === 'create') {
      message = `📅 *New Event Created*\n\n*${eventTitle}*\nDate: ${eventDate}\nLocation: ${eventDetails.location || 'No location'}`;
    } else if (action === 'update') {
      message = `✏️ *Event Updated*\n\n*${eventTitle}*\nDate: ${eventDate}\nLocation: ${eventDetails.location || 'No location'}`;
    } else if (action === 'delete') {
      message = `🗑️ *Event Deleted*\n\n*${eventTitle}*\nDate: ${eventDate}`;
    } else {
      message = `ℹ️ *Event Alert*: ${action}\n${eventTitle}`;
    }

    // Send to Telegram
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json() as any;

    if (!result.ok) {
      console.error('Telegram API Error:', result);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send telegram message', details: result }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Alert sent successfully' })
    };

  } catch (error: any) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};
