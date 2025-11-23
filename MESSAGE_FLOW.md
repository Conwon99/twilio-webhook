# 📱 SMS Message Flow Map

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SUBMITS FORM                            │
│              (via Formspree form on website)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FORMSPREE PROCESSES                          │
│  • Validates form submission                                     │
│  • Stores submission data                                        │
│  • Triggers webhook                                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ POST Request
                            │ JSON Payload:
                            │ {
                            │   "form": "xyznpaog",
                            │   "submission": {
                            │     "name": "John Doe",
                            │     "phone": "07792145329",
                            │     "message": "Test message",
                            │     "websiteUrl": "https://scautodetailing.co.uk"
                            │   }
                            │ }
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         NETLIFY FUNCTION: webhook.js                            │
│         https://formspree-webhook.netlify.app/                  │
│         /.netlify/functions/webhook                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Step 1: Parse & Extract Data
                            ▼
                    ┌───────────────┐
                    │ Extract       │
                    │ submission    │
                    │ object        │
                    └───────┬───────┘
                            │
                            │ Step 2: Lookup Mapping
                            ▼
                    ┌───────────────────────────────┐
                    │ Read webnumber_map            │
                    │ Find: websiteUrl → clientNumber│
                    │ https://scautodetailing.co.uk  │
                    │   → +447418335312              │
                    └───────┬───────────────────────┘
                            │
                            │ Step 3: Format Messages
                            ▼
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────────────┐         ┌──────────────────────────┐
│   MESSAGE 1           │         │   MESSAGE 2              │
│   Form Contents       │         │   Customer Confirmation  │
│                       │         │                          │
│ To: Client Number     │         │ To: Customer Phone       │
│ +447418335312         │         │ +447792145329            │
│                       │         │                          │
│ From: Twilio Number   │         │ From: Twilio Number      │
│ +447414130199         │         │ +447414130199            │
│                       │         │                          │
│ Content:              │         │ Content:                  │
│ 📝 New Form           │         │ Thanks for your          │
│ Submission            │         │ message! We've received  │
│ Name: John Doe        │         │ your contact form        │
│ Phone: 07792145329    │         │ submission and will      │
│ Message: Test message │         │ reply as soon as         │
│ Website: https://...  │         │ possible - keep on the   │
│                       │         │ lookout for a text       │
│                       │         │ message or a call.       │
└───────────┬───────────┘         └──────────┬───────────────┘
            │                                │
            │ Send via Twilio API            │ Send via Twilio API
            ▼                                ▼
┌───────────────────────┐         ┌──────────────────────────┐
│   TWILIO API          │         │   TWILIO API             │
│                       │         │                          │
│ • Validates numbers   │         │ • Validates numbers      │
│ • Routes SMS          │         │ • Routes SMS             │
│ • Sends message       │         │ • Sends message         │
└───────────┬───────────┘         └──────────┬───────────────┘
            │                                │
            │ SMS Delivery                   │ SMS Delivery
            ▼                                ▼
┌───────────────────────┐         ┌──────────────────────────┐
│   CLIENT RECEIVES     │         │   CUSTOMER RECEIVES      │
│   Form Contents SMS   │         │   Confirmation SMS       │
│                       │         │                          │
│ Phone: +447418335312  │         │ Phone: +447792145329     │
│                       │         │                          │
│ Message:              │         │ Message:                 │
│ 📝 New Form           │         │ Thanks for your          │
│ Submission            │         │ message! We've received  │
│ Name: John Doe        │         │ your contact form        │
│ Phone: 07792145329    │         │ submission and will      │
│ Message: Test message │         │ reply as soon as         │
│ Website: https://...  │         │ possible - keep on the   │
│                       │         │ lookout for a text       │
│                       │         │ message or a call.       │
└───────────────────────┘         └──────────────────────────┘
```

## Detailed Step-by-Step Flow

### 1. Form Submission
- **User** fills out form on website
- Form submits to **Formspree**
- Formspree processes and validates submission

### 2. Webhook Trigger
- Formspree sends POST request to:
  ```
  https://formspree-webhook.netlify.app/.netlify/functions/webhook
  ```
- Payload includes form data wrapped in `submission` object

### 3. Netlify Function Processing

#### 3a. Parse Data
```javascript
// Extract submission object
formData = {
  name: "John Doe",
  phone: "07792145329",
  message: "Test message",
  websiteUrl: "https://scautodetailing.co.uk"
}
```

#### 3b. Lookup Client Number
```javascript
// Read webnumber_map file
// Match websiteUrl → get clientNumber
websiteUrl: "https://scautodetailing.co.uk"
  ↓
clientNumber: "+447418335312"
twilioNumber: "+447414130199"
```

#### 3c. Format Phone Numbers
```javascript
// Customer phone formatting
"07792145329" → "+447792145329" (E.164 format)
```

### 4. Message Preparation

#### Message 1: Form Contents (to Client)
```
To: +447418335312
From: +447414130199
Message:
📝 New Form Submission
Name: John Doe
Phone: 07792145329
Message: Test message
Website: https://scautodetailing.co.uk
```

#### Message 2: Confirmation (to Customer)
```
To: +447792145329
From: +447414130199
Message:
Thanks for your message! We've received your contact form submission and will reply as soon as possible - keep on the lookout for a text message or a call.
```

### 5. Twilio API Calls
- Both messages sent asynchronously (non-blocking)
- Uses Twilio SDK with credentials from environment variables
- Returns success/failure status

### 6. SMS Delivery
- **Message 1** → Delivered to client number (`+447418335312`)
- **Message 2** → Delivered to customer number (`+447792145329`)

## Key Components

### Files Involved
1. **webnumber_map** - Maps website URLs to client/Twilio numbers
2. **netlify/functions/webhook.js** - Main webhook handler
3. **netlify/functions/webnumber_map** - Deployed mapping file

### Environment Variables
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Default Twilio sender number (`+447414130199`)

### Mapping File Format
```
websiteUrl, clientNumber, twilioNumber
https://scautodetailing.co.uk,+447418335312,+447414130199
```

## Error Handling

- SMS failures are logged but don't block webhook response
- Phone number validation ensures E.164 format
- Detailed error logging for debugging
- Webhook always returns success to Formspree

## Timing

- Both SMS messages sent **asynchronously**
- Messages sent **in parallel** (not sequential)
- Webhook responds immediately (doesn't wait for SMS delivery)
- Typical SMS delivery: 1-5 seconds





