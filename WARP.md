# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A React-based Bible reading plan web application with PWA capabilities. The app provides song lyrics, Bible study tools, reading plans, calendar events, prayer requests, and family group features. Built with Vite, React Router, Tailwind CSS, and integrates with Contentful CMS and Supabase for backend services.

## Common Commands

### Development
```bash
# Install dependencies (use pnpm)
pnpm install --frozen-lockfile

# Start development server (runs on port 5174)
pnpm run dev

# Preview production build (runs on port 5714)
pnpm run preview

# Build for production
pnpm run build

# Run linter
pnpm run lint

# Update Firebase service worker with environment variables
pnpm run update-firebase-sw
```

### Docker
```bash
# Build and start Docker containers
docker compose up -d --build
```

### Contentful
```bash
# Import Contentful content (replace spaceid with actual space ID)
contentful import --space-id "spaceid" --content-file "contentful-export-4nna61ii9z37-master-2024-11-04T09-42-40.json"
```

## Setup Requirements

### Environment Configuration
Copy `env.example` to `.env` and populate all required values:

**Contentful Variables:**
- `VITE_CONTENT_URL` - Contentful CDN URL
- `VITE_SPACE_ID` - Contentful space ID
- `VITE_CONTENT_ID` - Contentful content access token
- `VITE_CONTENT_PREVIEW` - Preview API token
- `VITE_ACCESS_TOKEN` - Content delivery API token

**Supabase Variables:**
- `VITE_SUPABASE_API_KEY` - Supabase API key

**Firebase Configuration (for FCM notifications):**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`

**Sentry:**
- `VITE_SENTRY_AUTH_TOKEN` - For error tracking

### Firebase Service Worker
After configuring Firebase environment variables, run `pnpm run update-firebase-sw` to update `public/firebase-messaging-sw.js` with actual configuration values.

## Architecture

### Technology Stack
- **Frontend:** React 18 with JSX
- **Routing:** React Router v6
- **State Management:** Zustand (stores in `src/store/`)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with Material Tailwind components
- **Data Fetching:** React Query
- **Content Management:** Contentful CMS
- **Backend:** Supabase (authentication, database)
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Error Tracking:** Sentry
- **PWA:** Service workers for offline functionality

### Project Structure
```
src/
├── components/        # React components organized by feature
│   ├── Bible/        # Bible study components
│   ├── Songs/        # Song lyrics and list views
│   ├── Calendar/     # Event calendar and RSVP features
│   ├── PrayerRequest/# Prayer request management
│   ├── Form/         # Profile and family group forms
│   ├── auth/         # Login/signup components
│   ├── Shared/       # Shared UI components (Nav, Layout, etc.)
│   ├── ProtectedRoute/# Route guards
│   ├── ErrorBoundary/# Error handling components
│   └── ThemeProvider/# Theme management
├── store/            # Zustand state stores
│   ├── useAuthStore.js           # Authentication state
│   ├── useProfileStore.js        # User profile management
│   ├── useFamilyGroupStore.js    # Family group data
│   ├── useFamilyCalendarStore.js # Calendar events
│   ├── usePrayerRequestStore.js  # Prayer requests
│   └── useEventAttendeesStore.js # Event RSVP tracking
├── hooks/            # Custom React hooks (e.g., useFCMSubscription)
├── utils/            # Utility functions
│   ├── fcmNotificationService.js # FCM notification utilities
│   ├── notificationService.js    # Notification helpers
│   └── pwa.js                    # PWA initialization
├── main.jsx          # Application entry point
└── supabaseClient.js # Supabase client configuration
```

### State Management with Zustand
All global state is managed with Zustand stores located in `src/store/`:

- **useAuthStore**: Handles user authentication state via Supabase Auth
  - Initializes auth listener on app start
  - Tracks `user`, `isAuthenticated`, `loading` state
  
- **useProfileStore**: Manages user profile data from Supabase
  - Methods: `fetchAllUserProfiles()`, `fetchAndSetUserProfile(userId)`
  
- **useFamilyGroupStore**: Family group membership and management
- **useFamilyCalendarStore**: Calendar events with automatic FCM notifications on creation
- **usePrayerRequestStore**: Prayer requests with FCM notifications on add/update
- **useEventAttendeesStore**: RSVP tracking for calendar events

### Routing Architecture
Uses React Router v6 with nested routes defined in `src/main.jsx`:
- Root layout includes `<Nav />`, `<ToastContainer />`, and `<Layout />`
- Protected routes wrap components requiring authentication
- Special routes: `/study/:book/:chapter/:verse` for Bible verses

### Path Aliases
Configured in `vite.config.js`:
- `@` → `src/`
- `@components` → `src/components/`
- `@store` → `src/store/`
- `@hooks` → `src/hooks/`
- `shared` → `src/components/Shared/`
- `data` → `data/`

### Contentful CMS Integration
The app fetches dynamic content (song lyrics, reading plans) from Contentful:
- Client created with `createClient()` from `contentful` package
- Requires `VITE_SPACE_ID` and `VITE_CONTENT_ID` environment variables
- Used primarily in Songs and Bible Reading Plan components
- Content types include: `song` (with `title`, `lyrics`, `isShabbat` fields)

### Supabase Backend
Supabase provides authentication and database:
- Client initialized in `src/supabaseClient.js`
- Hardcoded URL: `https://dzttlilteotxgaonnajy.supabase.co`
- Requires `VITE_SUPABASE_API_KEY`
- Database tables include: `profiles`, `family_groups`, `events`, `prayer_requests`, `event_attendees`, `notification_logs`
- Auth state changes are monitored in `useAuthStore.initAuthListener()`

### Firebase Cloud Messaging (FCM)
Comprehensive push notification system for events and prayer requests:
- **Service Worker**: `public/firebase-messaging-sw.js` handles background notifications
- **Hook**: `useFCMSubscription(userId, userEmail)` manages subscriptions
- **Service**: `src/utils/fcmNotificationService.js` provides notification sending functions
- **Automatic Triggers**: Event creation and prayer request updates automatically send notifications
- **User Preferences**: Stored in `profiles.notification_preferences` JSONB column
- **Token Storage**: FCM tokens stored in `profiles.fcm_token`

See `FCM_NOTIFICATION_SYSTEM_README.md` for detailed FCM setup, API reference, and troubleshooting.

### Progressive Web App (PWA)
- Service worker registration in `public/sw.js`
- Offline page: `public/offline.html`
- PWA initialization in `src/utils/pwa.js`
- Manifest: `public/manifest.json`

## Important Development Notes

### Authentication Flow
1. Auth listener initialized once in `RootLayout` via `useAuthStore.getState().initAuthListener()`
2. Checks initial session with `supabase.auth.getSession()`
3. Subscribes to auth state changes with `supabase.auth.onAuthStateChange()`
4. Sets `user`, `isAuthenticated`, and `loading` state accordingly

### Protected Routes
Components requiring authentication must be wrapped with `<ProtectedRoute>`:
```jsx
<ProtectedRoute>
  <Calendar />
</ProtectedRoute>
```

Profile completeness check uses `<ProfileGuard>`.

### Notification System
When creating events or prayer requests, notifications are automatically sent through the store actions. Do not manually call FCM notification functions unless implementing new notification types.

### Error Handling
- Global error boundary wraps the entire app (`GlobalErrorBoundary`)
- Sentry integration initialized in `main.jsx` with `VITE_SENTRY_AUTH_TOKEN`
- Test error boundary available at `/test-error-boundary`

### Styling
- Tailwind CSS classes used throughout
- Theme management via `ThemeProvider` component
- Material Tailwind components (`@material-tailwind/react`) for complex UI elements
- Custom theme configuration in `tailwind.config.js`

### Package Manager
This project uses **pnpm** (version 9.4.0). Always use `pnpm` commands, not `npm` or `yarn`.

### Database Schema Updates
When modifying Supabase schema (e.g., adding columns for notifications), ensure SQL migrations are documented and RLS policies are updated accordingly.

### Contentful Content Types
When adding new content types or fields, update the Contentful space and re-export the schema using `contentful export` for team consistency.
