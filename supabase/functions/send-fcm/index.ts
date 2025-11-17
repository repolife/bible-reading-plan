import { createClient } from '@supabase/supabase-js'
import { JWT } from 'google-auth-library'
import serviceAccount from '../service-account.json' with { type: 'json' }

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('=== FULL WEBHOOK PAYLOAD ===')
    console.log(JSON.stringify(payload, null, 2))
    console.log('=== END PAYLOAD ===')

    // Extract user_id from the created_by field
    const userId = payload.record?.created_by

    console.log('Extracted user_id (created_by):', userId)

    if (!userId) {
      console.error('No created_by found in payload')
      return new Response(JSON.stringify({ 
        error: 'No created_by found in payload',
        received_payload: payload
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if this is a multi-device test with specific target tokens
    const targetTokens = payload.record?.target_tokens
    
    let fcmTokens: string[] = []
    
    if (targetTokens && Array.isArray(targetTokens)) {
      // Use provided target tokens (for multi-device testing)
      fcmTokens = targetTokens
      console.log('Using provided target tokens for multi-device test:', fcmTokens.length)
    } else {
      // Get FCM tokens from user_fcm_tokens table (multi-device support)
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (tokenError) {
        console.error('Database error fetching tokens:', tokenError)
        return new Response(JSON.stringify({ error: 'Database error', details: tokenError.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (!tokenData || tokenData.length === 0) {
        // Fallback to old single token system
        const { data: oldData, error: oldError } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', userId)
          .single()

        if (oldError || !oldData?.fcm_token) {
          console.error('No FCM tokens found for user:', userId)
          return new Response(JSON.stringify({ error: 'No FCM tokens found for user', user_id: userId }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        fcmTokens = [oldData.fcm_token as string]
        console.log('Using fallback single FCM token for user:', userId)
      } else {
        fcmTokens = tokenData.map(t => t.fcm_token as string)
        console.log('Found', fcmTokens.length, 'FCM tokens for user:', userId)
      }
    }

    if (fcmTokens.length === 0) {
      console.error('No FCM tokens available for user:', userId)
      return new Response(JSON.stringify({ error: 'No FCM tokens available', user_id: userId }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getAccessToken({
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    })

    // Send notifications to all tokens
    const results = []
    let successCount = 0
    let failureCount = 0
    const invalidTokens: string[] = []

    for (const fcmToken of fcmTokens) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: fcmToken,
                notification: {
                  title: `Calendar Event: ${payload.record?.event_title || 'New Event'}`,
                  body: payload.record?.event_description || 'A calendar event has been updated',
                },
              },
            }),
          }
        )

        const resData = await res.json()
        
        if (res.status >= 200 && res.status <= 299) {
          successCount++
          results.push({ token: fcmToken.substring(0, 20) + '...', status: 'success' })
          console.log('FCM notification sent successfully to token:', fcmToken.substring(0, 20) + '...')
        } else {
          failureCount++
          results.push({ token: fcmToken.substring(0, 20) + '...', status: 'failed', error: resData })
          console.error('FCM API error for token:', fcmToken.substring(0, 20) + '...', resData)
          
          // Handle specific FCM errors
          if (resData.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
            console.log('FCM token is invalid/unregistered:', fcmToken.substring(0, 20) + '...')
            invalidTokens.push(fcmToken)
          }
        }
      } catch (error) {
        failureCount++
        results.push({ token: fcmToken.substring(0, 20) + '...', status: 'error', error: error.message })
        console.error('Error sending to token:', fcmToken.substring(0, 20) + '...', error)
      }
    }

    // Remove invalid tokens from database
    if (invalidTokens.length > 0) {
      console.log('Removing invalid tokens from database:', invalidTokens.length)
      
      // Remove from user_fcm_tokens table
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .in('fcm_token', invalidTokens)
      
      // Also remove from profiles table (fallback)
      await supabase
        .from('profiles')
        .update({ fcm_token: null })
        .eq('id', userId)
        .in('fcm_token', invalidTokens)
    }

    console.log(`FCM notifications completed: ${successCount} successful, ${failureCount} failed`)
    
    return new Response(JSON.stringify({
      success: successCount > 0,
      results: results,
      summary: {
        total: fcmTokens.length,
        successful: successCount,
        failed: failureCount,
        invalidTokensRemoved: invalidTokens.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

const getAccessToken = ({
  clientEmail,
  privateKey,
}: {
  clientEmail: string
  privateKey: string
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err)
        return
      }
      resolve(tokens!.access_token!)
    })
  })
}