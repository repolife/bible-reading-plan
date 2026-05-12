import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read environment variables from .env file
const envPath = path.join(__dirname, '..', '.env')
const swPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js')

function readEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, value] = trimmedLine.split('=')
        if (key && value) {
          envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.error('Error reading .env file:', error.message)
    return {}
  }
}

function updateServiceWorker() {
  console.log('🔥 Updating Firebase Service Worker...')
  
  // Read environment variables
  const envVars = readEnvFile(envPath)
  
  // Check if required Firebase variables exist
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ]
  
  const missingVars = requiredVars.filter(varName => !envVars[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.error('\nPlease add these to your .env file before running this script.')
    process.exit(1)
  }
  
  // Read the current service worker file
  let swContent
  try {
    swContent = fs.readFileSync(swPath, 'utf8')
  } catch (error) {
    console.error('❌ Error reading service worker file:', error.message)
    process.exit(1)
  }
  
  // Replace the placeholder values with actual environment variables
  const updatedContent = swContent
    .replace(/apiKey: ".*?"/, `apiKey: "${envVars.VITE_FIREBASE_API_KEY}"`)
    .replace(/authDomain: ".*?"/, `authDomain: "${envVars.VITE_FIREBASE_AUTH_DOMAIN}"`)
    .replace(/projectId: ".*?"/, `projectId: "${envVars.VITE_FIREBASE_PROJECT_ID}"`)
    .replace(/storageBucket: ".*?"/, `storageBucket: "${envVars.VITE_FIREBASE_STORAGE_BUCKET}"`)
    .replace(/messagingSenderId: ".*?"/, `messagingSenderId: "${envVars.VITE_FIREBASE_MESSAGING_SENDER_ID}"`)
    .replace(/appId: ".*?"/, `appId: "${envVars.VITE_FIREBASE_APP_ID}"`)
    .replace(/measurementId: ".*?"/, `measurementId: "${envVars.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX'}"`)
  
  // Write the updated content back to the file
  try {
    fs.writeFileSync(swPath, updatedContent, 'utf8')
    console.log('✅ Firebase Service Worker updated successfully!')
    console.log(`📄 Updated file: ${swPath}`)
    
    // Show what was updated
    console.log('\n🔧 Updated configuration:')
    console.log(`   API Key: ${envVars.VITE_FIREBASE_API_KEY?.substring(0, 10)}...`)
    console.log(`   Project ID: ${envVars.VITE_FIREBASE_PROJECT_ID}`)
    console.log(`   Sender ID: ${envVars.VITE_FIREBASE_MESSAGING_SENDER_ID}`)
    
  } catch (error) {
    console.error('❌ Error writing service worker file:', error.message)
    process.exit(1)
  }
}

// Run the update
updateServiceWorker() 