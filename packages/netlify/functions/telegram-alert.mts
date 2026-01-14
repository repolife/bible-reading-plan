import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dzttlilteotxgaonnajy.supabase.co';
  const SUPABASE_KEY = process.env.VITE_SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Missing Telegram credentials');
    return { statusCode: 500, body: 'Server Error: Missing credentials' };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: 'Missing body' };
    }
    const data = JSON.parse(event.body);
    console.log('Incoming Payload:', JSON.stringify(data, null, 2));

    // 1. Handle Telegram Webhook Commands
    if (data.message && data.message.text) {
      const text = data.message.text as string;
      const incomingChatId = data.message.chat.id;

      if (text.startsWith('/host')) {
        console.log('Handling /host command');
        
        const now = new Date();
        const dayOfWeek = now.getDay();
        
        // Start of week (Sunday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        
        // End of week (Saturday)
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - dayOfWeek));
        endOfWeek.setHours(23, 59, 59, 999);

        // Query Supabase using REST API
        const queryUrl = `${SUPABASE_URL}/rest/v1/family_calendar?select=*,family_groups(family_last_name)&event_start=gte.${startOfWeek.toISOString()}&event_start=lte.${endOfWeek.toISOString()}&event_title=ilike.*Shabbat*`;
        
        const supabaseResponse = await fetch(queryUrl, {
          headers: {
            'apikey': SUPABASE_KEY || '',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const events = await supabaseResponse.json() as any[];

        let responseMessage = '';
        if (!events || events.length === 0) {
          responseMessage = "No Shabbat event found for this week.";
        } else {
          const shabbatEvent = events[0];
          const familyName = shabbatEvent.family_groups?.family_last_name || 'Unknown';
          const eventTitle = shabbatEvent.event_title;
          const eventDate = new Date(shabbatEvent.event_start).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          const foodTheme = shabbatEvent.food_theme || 'None';
          const eventUrl = `https://bible-reading-plan.netlify.app/events/${shabbatEvent.id}`;

          responseMessage = `🏠 *Shabbat Host for this week:*\n\n*The ${familyName} family* is hosting *${eventTitle}*.\n\n📅 *Date:* ${eventDate}\n🍲 *Food Theme:* ${foodTheme}\n🔗 [View Details](${eventUrl})`;
        }

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: incomingChatId,
            text: responseMessage,
            parse_mode: 'Markdown'
          })
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Command handled' }) };
      }
      
      // If it's a message but not a command we handle, just return OK
      return { statusCode: 200, body: JSON.stringify({ message: 'Message received' }) };
    }

    // 2. Handle Frontend Alerts (Existing Logic)
    const { action, event: eventDetails } = data;
    if (!action || !eventDetails) {
        return { statusCode: 200, body: JSON.stringify({ message: 'No action or event details' }) };
    }
    
    let message = '';
    const eventTitle = eventDetails.event_title || eventDetails.title || 'Untitled Event';
    const eventDate = new Date(eventDetails.event_start || eventDetails.start).toLocaleDateString();
    
    const familyName = data.familyName || eventDetails.familyName || 'Unknown';
    const foodTheme = eventDetails.food_theme || 'None';
    const eventType = eventDetails.event_type || 'Unknown';
    const origin = data.origin || 'https://bible-reading-plan.netlify.app';
    
    const eventId = eventDetails.id || eventDetails.event_id;
    const eventUrl = `${origin}/events/${eventId}`;
      
    const hostText = familyName && familyName !== 'Unknown' && familyName !== 'Family' 
      ? `*The ${familyName} family is hosting:*` 
      : `*New Event Alert:*`;

    const maxCapValue = data.max_capacity || eventDetails.max_capacity;
    const maxCapacity = maxCapValue ? `\nMax Capacity: ${maxCapValue}` : '';

    message = `${hostText}\n\n*${eventTitle}*\nDate: ${eventDate}\nEvent Type: ${eventType}\nFood Theme: ${foodTheme}\n${maxCapacity}\nLink: ${eventUrl}`;
    
    if (action === 'delete') {
       message = `🗑️ *Event Deleted*\n\n*${eventTitle}*\nDate: ${eventDate}`;
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

