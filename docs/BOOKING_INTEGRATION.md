# Field Booking Integration

## Overview

This document describes the integration of field booking availability from **migrashim.org.il** into the Soccer Team Maker application. The feature allows users to view available field slots directly within the app.

---

## Target Booking System

### Website
- **URL:** https://www.migrashim.org.il/PickSlot?roka
- **Facility:** National Sports Center Rokach-Strelit, Tel Aviv
- **Complex ID:** 74

### Available Fields
| Field | Hebrew Name | Dimensions | Surface |
|-------|-------------|------------|---------|
| Southwest | מגרש דרום-מערבי | 32x55m | Synthetic grass |
| Northeast | מגרש צפון-מזרחי | 32x55m | Synthetic grass |

Both fields have 3 goals (5x2m) and lighting. Suitable for 6v6 matches.

### Pricing Tiers
| Code | Type | Duration | Price (ILS) |
|------|------|----------|-------------|
| C | Daytime | 1.5 hrs | 150 |
| O | Evening | 30 min | 165 |
| S | Saturday | 1.5 hrs | 200 |
| T | Standard | 1 hr | 230 |
| U | Standard | 1.5 hrs | 350 |
| A | Premium | 1.5 hrs | 500 |
| B | Clubs | 2 hrs | 432 |
| Z | Evening | 2 hrs | 665 |

Cancellation: 15 ILS fee, up to 24 hours before booking.

---

## Technical Architecture

### Backend System
- **Platform:** ASP.NET WebForms
- **Session:** Server-side session management
- **Authentication:** Phone-based OTP (One-Time Password)

### API Endpoints

#### Get Available Slots
```
GET /Handlers/setUnitData.ashx?dw=dayt&sd=[params]&callback=?
```

**Parameters (pipe-delimited in `sd`):**
1. Date (DD/MM/YYYY)
2. Facility ID (fid)
3. Unit ID (uid)
4. Hour filter
5. Language (he-IL)
6. Complex ID (74)
7. Order by

**Example:**
```
/Handlers/setUnitData.ashx?dw=dayt&sd=23/12/2025||0|0|he-IL|74|0&callback=?
```

#### Get Available Days
```
GET /Handlers/setUnitData.ashx?dw=daysel&sd=[fid]|[hour]|[cid]&callback=?
```

#### Get Player Count
```
GET /Handlers/setUnitData.ashx?dw=getpn&sd=[slotid]&callback=?
```

#### Save Reservation
```
GET /Handlers/setUnitData.ashx?dw=save_unit&sd=[params]&callback=?
```

### Authentication

#### Required Cookie
- **Name:** `ASP.NET_SessionId`
- **Expiration:** ~20-30 minutes (server-controlled)
- **Scope:** Session-based, expires on inactivity

#### Login Flow
1. User enters phone number (972 country code)
2. System sends OTP via SMS
3. User enters OTP code
4. Server creates session cookie

---

## Implementation Approach

### Chosen Method: Manual Cookie Input

Since the API requires authentication and CORS blocks direct requests:
1. User logs into migrashim.org.il in their browser
2. User extracts session cookie from DevTools
3. User pastes cookie into Soccer Team Maker app
4. App uses CORS proxy to make API requests

### Why Not Other Methods?

| Method | Reason Not Used |
|--------|-----------------|
| Direct API | CORS blocks cross-origin requests |
| Iframe | X-Frame-Options blocks embedding |
| Automated Auth | OTP requires user phone verification |
| Backend Proxy | App is client-side only, no server |
| Browser Extension | More complex, requires separate development |

### CORS Proxy

Using public CORS proxy: `https://api.allorigins.win/raw?url=`

**Privacy Note:** Session cookie passes through third-party proxy. Cookie expires in ~20-30 minutes, limiting exposure window.

---

## User Flow

### Initial Setup
```
1. User clicks "Field Bookings" in navigation
2. App shows "Not Connected" status
3. User clicks "Enter Session Cookie"
4. Modal displays step-by-step instructions:
   a. Open migrashim.org.il
   b. Log in with phone
   c. Open DevTools (F12)
   d. Go to Application > Cookies
   e. Copy ASP.NET_SessionId value
5. User pastes cookie and clicks Save
6. App validates cookie by making test API call
```

### Viewing Slots
```
1. App shows "Connected" status with expiry warning
2. User selects date from dropdown
3. App fetches available slots for that date
4. Slots displayed in grid format:
   - Available: Green with "Book" button
   - Booked: Gray, disabled
5. "Book" button opens migrashim.org.il in new tab
```

### Session Expiry
```
1. API returns auth error
2. App shows "Session Expired" message
3. User repeats cookie input process
```

---

## Data Structures

### TypeScript Interfaces

```typescript
// Single booking slot
interface FieldBookingSlot {
  id: string;
  date: string;          // ISO date string
  startTime: string;     // "18:00"
  endTime: string;       // "19:00"
  fieldName: string;     // "Southwest" | "Northeast"
  available: boolean;
  price?: number;        // Price in ILS
  duration?: string;     // "1 hour", "1.5 hours"
  pricingCode?: string;  // "A", "B", "C", etc.
}

// User's session info
interface BookingSession {
  cookie: string;        // ASP.NET_SessionId value
  savedAt: string;       // ISO timestamp when saved
  lastFetchAt?: string;  // Last successful API call
}

// Cached booking data
interface BookingCache {
  slots: FieldBookingSlot[];
  fetchedAt: string;
  selectedDate: string;
}
```

---

## File Structure

### New Files
```
src/
├── pages/
│   └── Bookings/
│       ├── Bookings.tsx      # Main page component
│       └── Bookings.css      # Page styles
├── components/
│   ├── CookieInputModal/
│   │   ├── CookieInputModal.tsx
│   │   └── CookieInputModal.css
│   └── SlotCard/
│       ├── SlotCard.tsx
│       └── SlotCard.css
└── utils/
    └── bookingService.ts     # API service
```

### Modified Files
```
src/
├── types/index.ts            # Add booking types
├── utils/storage.ts          # Add booking storage
├── App.tsx                   # Add route
└── pages/Dashboard/Dashboard.tsx  # Add nav link
```

---

## UI Components

### Bookings Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Field Bookings              [Open Booking Site]     │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Session Panel                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Status: ✅ Connected                                │   │
│  │ Last updated: 2 min ago    [Refresh] [Disconnect]   │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Date Selector                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Select Date: [ December 23, 2025          ▼]        │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Slots Grid                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ 18:00-19:00│ │ 19:00-20:00│ │ 20:00-21:00│              │
│  │ Southwest  │ │ Southwest  │ │ Southwest  │              │
│  │ ₪350       │ │ ₪350       │ │ BOOKED     │              │
│  │ [Book →]   │ │ [Book →]   │ │            │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ 18:00-19:00│ │ 19:00-20:00│ │ 20:00-21:00│              │
│  │ Northeast  │ │ Northeast  │ │ Northeast  │              │
│  │ ₪350       │ │ BOOKED     │ │ ₪350       │              │
│  │ [Book →]   │ │            │ │ [Book →]   │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Cookie Input Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Enter Session Cookie                              [X]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How to get your session cookie:                            │
│                                                             │
│  1. Open migrashim.org.il in a new tab                      │
│  2. Log in with your phone number                           │
│  3. Press F12 to open Developer Tools                       │
│  4. Click "Application" tab                                 │
│  5. Expand "Cookies" in the sidebar                         │
│  6. Click on "migrashim.org.il"                             │
│  7. Find "ASP.NET_SessionId" row                            │
│  8. Copy the value (not the name)                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Paste cookie value here...                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️  Cookie expires after ~20-30 min of inactivity         │
│                                                             │
│                              [Cancel]  [Save & Connect]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| Invalid cookie | "Invalid session cookie" | Show instructions again |
| Expired session | "Session expired. Please reconnect." | Prompt for new cookie |
| CORS proxy down | "Unable to fetch data" | Show "Open Booking Site" button |
| Network error | "Connection failed" | Show cached data if available |
| No slots available | "No available slots for this date" | Allow date change |

---

## Storage

### LocalStorage Keys
```
soccerTeamMaker_bookingSession  // Session cookie data
soccerTeamMaker_bookingCache    // Cached slot data
```

### Data Persistence
- Session cookie saved until user clears it
- Slot cache updated on each fetch
- Cache shows "last updated" timestamp

---

## Security Considerations

1. **Cookie Storage:** Stored in localStorage (same as other app data)
2. **Cookie Transmission:** Passes through CORS proxy (accepted risk)
3. **Expiration:** Cookie auto-expires in ~20-30 min
4. **No Credentials:** App never stores phone numbers or passwords
5. **Clear Option:** User can disconnect/clear session anytime

---

## Future Enhancements

### Phase 2: Browser Extension
- Chrome extension to auto-capture cookie
- No manual DevTools interaction needed
- Real-time sync when user visits booking site

### Phase 3: Notifications
- Alert when preferred time slots become available
- Integration with team scheduling

### Phase 4: Direct Booking
- Complete booking flow within app (if API allows)
- Payment integration

---

## Testing

### Manual Test Cases
1. [ ] Cookie input modal opens correctly
2. [ ] Valid cookie connects successfully
3. [ ] Invalid cookie shows error
4. [ ] Expired cookie detected and handled
5. [ ] Slots load for selected date
6. [ ] Date selector works
7. [ ] "Book" button opens correct URL
8. [ ] Refresh button updates data
9. [ ] Disconnect clears session
10. [ ] Cached data displayed when offline

---

## References

- Booking Site: https://www.migrashim.org.il/PickSlot?roka
- Facility Info: National Sports Center, Rokach-Strelit, Tel Aviv
- CORS Proxy: https://api.allorigins.win/
