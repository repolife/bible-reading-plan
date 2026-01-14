import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dzttlilteotxgaonnajy.supabase.co';
  // Use Service Role Key if available to bypass RLS in the backend
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;

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
      console.log(`Received message: "${text}" from chat: ${incomingChatId}`);

      // Handle commands (e.g., /host, /host@YourBotName)
      if (text.startsWith('/')) {
        const command = text.split(' ')[0].split('@')[0].toLowerCase();
        console.log(`Parsed command: "${command}"`);

        if (command === '/host' || command === '/hsot') {
          console.log('Handling /host command');
          
          const now = new Date();
          const dayOfWeek = now.getDay();
          
          // Start of week (Sunday)
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startOfWeek.setHours(0, 0, 0, 0);
          
          // End of week (Sunday next week)
          // We go to Sunday to ensure Saturday evening events (UTC shift) are caught
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + (7 - dayOfWeek)); 
          endOfWeek.setHours(23, 59, 59, 999);

          console.log(`Querying ALL events between ${startOfWeek.toISOString()} and ${endOfWeek.toISOString()}`);

          // Query Supabase using REST API - Fetch all events for the week to debug
          const queryUrl = `${SUPABASE_URL}/rest/v1/family_calendar?select=*,family_groups(family_last_name)&event_start=gte.${startOfWeek.toISOString()}&event_start=lte.${endOfWeek.toISOString()}&order=event_start.asc`;
          
          console.log(`Supabase Query URL: ${queryUrl}`);

          const supabaseResponse = await fetch(queryUrl, {
            headers: {
              'apikey': SUPABASE_KEY || '',
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (!supabaseResponse.ok) {
            const errorText = await supabaseResponse.text();
            console.error(`Supabase error (${supabaseResponse.status}):`, errorText);
            
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: incomingChatId,
                text: "⚠️ Error querying host information. Please check logs.",
                parse_mode: 'Markdown'
              })
            });
            return { statusCode: 200, body: JSON.stringify({ message: 'Error handled' }) };
          }

          const allEvents = await supabaseResponse.json() as any[];
          console.log(`Found ${allEvents?.length || 0} total events this week`);

          // Filter for Shabbat events in JS (more reliable for debugging)
          const shabbatEvents = allEvents.filter(e => 
            e.event_title?.toLowerCase().includes('shabbat') || 
            e.event_description?.toLowerCase().includes('shabbat')
          );

          console.log(`Found ${shabbatEvents.length} Shabbat events`);

          let responseMessage = '';
          if (shabbatEvents.length === 0) {
            if (allEvents.length > 0) {
              responseMessage = `No event with "Shabbat" in the title found. I found ${allEvents.length} other events this week (e.g., "${allEvents[0].event_title}").`;
            } else {
              responseMessage = "No events found for this week. This might be a permission (RLS) issue or there are truly no events in the database.";
            }
          } else {
            const shabbatEvent = shabbatEvents[0];
            const familyName = shabbatEvent.family_groups?.family_last_name || 'Unknown';
            const eventTitle = shabbatEvent.event_title;
            const eventDate = new Date(shabbatEvent.event_start).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            });
            const foodTheme = shabbatEvent.food_theme || 'None';
            const eventUrl = `https://ozark-fellowship.netlify.app/events/${shabbatEvent.id}`;

            responseMessage = `🏠 *Shabbat Host for this week:*\n\n*The ${familyName} family* is hosting *${eventTitle}*.\n\n📅 *Date:* ${eventDate}\n🍲 *Food Theme:* ${foodTheme}\n🔗 [View Details](${eventUrl})`;
          }

          console.log(`Sending response to Telegram: ${responseMessage}`);

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
        } else {
          // Unknown command - respond to verify webhook is working
          console.log(`Unknown command: ${command}`);
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: incomingChatId,
              text: `I received your command: ${command}, but I don't know how to handle it yet. Try /host!`,
              parse_mode: 'Markdown'
            })
          });
          return { statusCode: 200, body: JSON.stringify({ message: 'Unknown command handled' }) };
        }
      }
      
      // If it's a message but not a command, just return OK
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
    const origin = data.origin || 'https://ozark-fellowship.netlify.app';
    
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

