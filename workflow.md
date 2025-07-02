# Clippr Booking Workflows Documentation

## Overview
This document outlines all the booking and appointment workflows in the Clippr application, including client booking processes, barber appointment creation, SMS confirmations, and status management.

## Current Workflow Status
- ✅ Public client booking workflow (implemented)
- ✅ Direct barber appointment creation (implemented)
- ✅ Appointment status system (pending/confirmed/cancelled/no show)
- ✅ Dashboard filtering (only confirmed appointments in current/next cards)
- ✅ Overlap detection system (ignores cancelled appointments)
- ✅ Appointment deletion with SMS cancellation notifications
- 🔄 SMS confirmation workflow (to be implemented)
- 🔄 Pending appointment with SMS confirmation (to be implemented)
- 🔄 Client SMS cancellation workflow (to be implemented)

---

## Workflow 1: Public Client Booking Request

**Trigger**: Client visits public booking link (e.g., book.clippr.com/6467891820-jaythebarber)

### Steps:
1. **Client selects services and time**
   - Client browses available services
   - Client selects date and time from available slots
   - Client fills out contact information

2. **Time slot temporarily locked**
   - System soft-locks slot for 30 minutes on client booking request page
   - Slot marked as "held" to prevent duplicate requests

3. **Booking request creation**
   - System creates a message in barber's inbox
   - Message contains: client name, phone, email, requested services, date/time, notes
   - Message type: "booking_request"

4. **Barber notification**
   - Message appears in barber's messages page
   - Unread count increases
   - Barber can view details and choose to book or decline

### Current Status: ✅ Implemented
- Public booking pages working
- Message creation working
- Barber can view booking requests

---

## Workflow 2: Barber Books Appointment from Message

**Trigger**: Barber clicks "Book Appointment" button on a booking request message

### Steps:
1. **Client lookup/creation**
   - System checks if client exists by phone number
   - If client doesn't exist: creates new client record
   - If client exists: updates address and email if provided

2. **Schedule appointment modal**
   - Pre-fills appointment form with message data
   - Client name, phone, email auto-populated
   - Services, date, time pre-selected
   - Address and notes pre-filled

3. **Appointment creation** (Modified workflow needed)
   - Creates appointment with "pending" status
   - Slot is locked
   - Shows in "Pending Confirmations"
   - Auto-expiry timer started (30 min)

4. **SMS sent to client for confirmation**

### Current Status: ✅ Partially implemented (needs SMS confirmation)
- Client lookup/creation working
- Modal pre-filling working
- Need to modify to create pending appointments with SMS confirmation

---

## Workflow 3: Direct Barber Appointment Creation

**Trigger**: Barber goes to calendar and manually creates appointment

### Steps:
1. **Manual appointment creation**
   - Barber navigates to calendar page
   - Clicks "Book Appointment" button
   - Manually fills out all details (client, services, time, etc.)

2. **Appointment creation** (Modified workflow needed)
   - Creates appointment with "pending" status
   - Auto-expires if no reply in 30 mins 
   - Sends SMS confirmation request to client

### Current Status: ✅ Partially implemented (needs SMS confirmation)
- Manual creation form working
- Need to modify to create pending appointments with SMS confirmation

---

## Workflow 4: SMS Confirmation System (To Be Implemented)

**Trigger**: Appointment created (from message booking or manual creation)

### Steps:
1. **SMS sent to client**
   - Message: "Hi [Name]! Your appointment for [Service] on [Date] at [Time] is pending. Reply YES to confirm or NO to cancel."
   - 30-minute expiration timer starts
   - Appointment status: "pending"

2. **Client confirms (YES)**
   - Appointment status changes to "confirmed"
   - Moves from "Pending Reservations" to "Current/Next" cards
   - Bell notification for barber
   - Message sent to barber: "[Client] confirmed their appointment"
   - SMS to client: "You're confirmed! See you at [Appointment Time]."

3. **Client cancels (NO)**
   - Appointment deleted from system
   - Bell notification for barber
   - Message sent to barber: "[Client] cancelled their appointment"
   - SMS to client: "Your appointment has been canceled. You're welcome to rebook any time!"

4. **Timeout (30 minutes no response)**
   - Appointment automatically deleted
   - Bell notification for barber
   - Slot becomes available
   - Message sent to barber: "[Client] appointment expired (no response)"

### Current Status: 🔄 To be implemented

---

## Workflow 5: Client SMS Cancellation (To Be Implemented)

**Trigger**: Client sends "CANCEL" via SMS (for any confirmed appointment)

### Steps:
1. **SMS processing**
   - System receives "CANCEL" SMS from client
   - Looks up client's active appointments by phone number

2. **Appointment cancellation**
   - Deletes appointment from calendar
   - Bell notification for barber
   - Message sent to barber: "[Client] cancelled their [Service] appointment on [Date]"

3. **Confirmation to client**
   - SMS reply: "Your appointment has been cancelled. Thanks, and feel free to rebook!"

### Current Status: 🔄 To be implemented

---

## Workflow 6: Appointment Status Management (✅ Implemented)

**Current Implementation**: Comprehensive status-based appointment system

### Appointment Statuses:
| Status | Meaning | Affects Availability | Should Auto-Delete? |
|--------|---------|---------------------|-------------------|
| **pending** | Awaiting client confirmation | ✅ Blocks time slot | No |
| **confirmed** | Client confirmed | ✅ Blocks time slot | No |
| **cancelled** | Client or barber cancelled | ❌ Frees slot | ✅ Yes (after 1-2 hours) |
| **expired** | No confirmation within hold window | ❌ Frees slot | ✅ Yes (after 1 hour) |
| **no_show** | Client missed without canceling | ❌ Frees slot (logged) | ❌ No (keep for history) |

### Dashboard Behavior:
1. **Current/Next appointment cards**: Only show appointments with "confirmed" status
2. **Pending confirmations card**: Shows only appointments with "pending" status  
3. **Cancelled/expired appointments**: Do not appear in any dashboard cards
4. **No show appointments**: Do not appear in dashboard cards but kept in database

### Calendar Behavior:
1. **All appointments visible**: Shows pending, confirmed, cancelled, expired, and no show appointments
2. **Visual distinction**: Different styling for different statuses
3. **Deletion allowed**: Cancelled and expired appointments can be safely deleted
4. **No show appointments**: Hidden from main calendar view but accessible in history

### Overlap Detection:
1. **Ignores non-blocking statuses**: Cancelled, expired, and no show appointments don't block new bookings
2. **Considers pending and confirmed**: Both pending and confirmed appointments prevent overlaps
3. **Detailed conflict reporting**: Shows specific conflicting appointments with times

### Auto-Cleanup Rules:
1. **Expired appointments**: Auto-delete after 1 hour to prevent calendar clutter
2. **Cancelled appointments**: Auto-delete after 1-2 hours (optional delay for reschedules)
3. **No show appointments**: Keep in database for client history and reports

---

## Technical Implementation Requirements

### Database Changes Needed:
1. **Appointments table**
   - Modify default status from "scheduled" to "pending"
   - Add SMS confirmation tracking fields

2. **Reservations table**
   - Link reservations to appointments
   - Track SMS confirmation status

3. **Notifications table** (new)
   - Store bell notifications for barber
   - Track read/unread status

### API Endpoints Needed:
1. **SMS webhook endpoint**
   - `/api/sms/webhook` - Receive SMS responses
   - Process YES/NO/CANCEL responses

2. **Notification endpoints**
   - `GET /api/notifications` - Get barber notifications
   - `PATCH /api/notifications/:id/read` - Mark notification as read

### SMS Integration:
- Twilio SMS API integration
- SMS template management
- Phone number validation and formatting

---

## User Experience Changes

### Dashboard Changes:
1. **Pending Reservations card**
   - Shows all appointments with "pending" status
   - Displays countdown timer for 30-minute expiration
   - Shows SMS confirmation status

2. **Current/Next appointment cards**
   - Only show "confirmed" appointments
   - Filter out pending appointments

3. **Bell notifications**
   - New notification icon with unread count
   - Dropdown showing recent confirmations/cancellations

### Calendar Changes:
- Visual distinction between pending and confirmed appointments
- Pending appointments shown with different styling/color

---

## Testing Scenarios

### Happy Path:
1. Client books through public link
2. Barber clicks "Book Appointment" from message
3. SMS sent to client
4. Client replies "YES"
5. Appointment confirmed and appears in Current/Next cards

### Cancellation Path:
1. Appointment confirmed
2. Client sends "CANCEL" SMS
3. Appointment deleted, barber notified

### Timeout Path:
1. Appointment created, SMS sent
2. Client doesn't respond within 30 minutes
3. Appointment automatically deleted, barber notified

---

## Next Steps for Implementation:

1. ✅ Document workflows (this file)
2. 🔄 Set up Twilio SMS integration
3. 🔄 Create notifications system
4. 🔄 Modify appointment creation to use pending status
5. 🔄 Implement SMS webhook processing
6. 🔄 Update dashboard to handle pending appointments
7. 🔄 Add bell notification system
8. 🔄 Test all workflows end-to-end