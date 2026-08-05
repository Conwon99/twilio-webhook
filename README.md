# Formspree Webhook Handler for Netlify

A production-ready Netlify project that handles Formspree webhooks using serverless functions. Supports both Simple Webhooks and REST Hooks with automatic handshake verification.

## 🚀 Features

- ✅ **Simple Webhook Support**: Direct POST requests with form data
- ✅ **REST Hook Support**: Automatic handshake verification (GET challenge/response)
- ✅ **Slack Integration**: Send form submissions to Slack (optional)
- ✅ **Twilio SMS Integration**: Send SMS notifications via Twilio (optional)
- ✅ **Structured Logging**: Console logging with timestamps and metadata
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **CORS Support**: Ready for browser-based testing
- ✅ **Production Ready**: Clean, commented code with best practices

## 📁 Project Structure

```
.
├── netlify/
│   └── functions/
│       └── webhook.js          # Main webhook handler
├── public/
│   └── index.html              # Test page
├── netlify.toml                # Netlify configuration
├── package.json                # Dependencies
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ installed
- Netlify account (free tier works)
- Netlify CLI installed: `npm install -g netlify-cli`

### Installation

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Slack (Optional)**
   
   To enable Slack notifications, set the `SLACK_WEBHOOK_URL` environment variable:
   
   - Get a Slack webhook URL from: https://api.slack.com/messaging/webhooks
   - Add it to your Netlify environment variables (see deployment section)
   - Or set it locally: create a `.env` file with:
     ```
     SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
     ```

4. **Configure Twilio SMS (Optional)**
   
   To enable SMS notifications via Twilio, set the following environment variables:
   
   - Get Twilio credentials from: https://console.twilio.com/
   - You'll need:
     - Account SID
     - Auth Token
     - Twilio Phone Number (sender number)
   - Add these to your Netlify environment variables:
     ```
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     TWILIO_PHONE_NUMBER=+1234567890 (your Twilio number)
     TWILIO_TO_PHONE=+1234567890 (recipient number, optional - can use form data)
     ```
   - Or set locally in `.env` file
   - **Note**: If `TWILIO_TO_PHONE` is not set, the function will use the `phone` field from the form submission

## 🧪 Local Testing

1. **Start the Netlify development server**
   ```bash
   netlify dev
   ```

2. **Access the test page**
   - Open: `http://localhost:8888`
   - The page will display your webhook endpoint URL

3. **Test the webhook endpoint**
   
   **Simple GET test:**
   ```bash
   curl http://localhost:8888/.netlify/functions/webhook
   ```

   **POST test (simulating Formspree):**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/webhook \
     -H "Content-Type: application/json" \
     -d '{"name":"John Doe","email":"john@example.com","message":"Hello!"}'
   ```

   **REST Hook handshake test:**
   ```bash
   curl "http://localhost:8888/.netlify/functions/webhook?challenge=test123"
   ```

## 📦 Deployment

### Option 1: Deploy via Netlify CLI (Recommended)

1. **Login to Netlify**
   ```bash
   netlify login
   ```

2. **Initialize site (first time only)**
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Select your team
   - Site name (optional, or use auto-generated)
   - Build command: Leave empty or use `npm run build`
   - Publish directory: `public`

3. **Set environment variables (if using Slack)**
   ```bash
   netlify env:set SLACK_WEBHOOK_URL "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via GitHub

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Formspree webhook handler"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: Leave empty
     - Publish directory: `public`
   - Click "Deploy site"

3. **Add environment variables**
   - Go to Site settings → Environment variables
   - Add `SLACK_WEBHOOK_URL` (if using Slack)

## 🔗 Connecting to Formspree

### Step 1: Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://YOUR-SITE-NAME.netlify.app/.netlify/functions/webhook
```

### Step 2: Configure Formspree

#### For Simple Webhook:

1. Go to your [Formspree Dashboard](https://formspree.io/dashboard)
2. Select your form
3. Go to "Settings" → "Integrations"
4. Click "Add Integration" → "Webhook"
5. Enter your webhook URL:
   ```
   https://YOUR-SITE-NAME.netlify.app/.netlify/functions/webhook
   ```
6. Save and test!

#### For REST Hook:

1. Go to your Formspree Dashboard
2. Select your form
3. Go to "Settings" → "Integrations"
4. Click "Add Integration" → "REST Hook"
5. Enter your webhook URL (same as above)
6. Formspree will automatically verify the endpoint via GET request
7. Once verified, you'll receive POST requests for each submission

### Step 3: Test Your Integration

1. Submit a test form on Formspree
2. Check Netlify function logs:
   ```bash
   netlify functions:log
   ```
   Or in Netlify Dashboard: Functions → webhook → View logs

3. Check your Slack channel (if configured)

## 📊 Function Logs

View logs via:
- **CLI**: `netlify functions:log`
- **Dashboard**: Netlify Dashboard → Functions → webhook → View logs
- **Local**: Check your terminal where `netlify dev` is running

Logs include:
- Timestamp
- Form submission data
- Request headers
- Processing status

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL for notifications | No | None (logs only) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | No | None (SMS disabled) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | No | None (SMS disabled) |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (sender) | No | None (SMS disabled) |
| `TWILIO_TO_PHONE` | Recipient phone number (E.164 format) | No | Uses `phone` field from form |
| `SUPABASE_URL` | Supabase project URL, for LeadTrackerCRM recording | No | None (CRM recording disabled) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, for LeadTrackerCRM recording | No | None (CRM recording disabled) |

### LeadTrackerCRM integration

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, each incoming
submission is also checked against LeadTrackerCRM's `client_websites` table.
If the submitting website has been explicitly opted into tracking there
(and isn't paused), the lead is recorded permanently for that client to view
in their dashboard. Websites that haven't been opted in are unaffected —
this is purely additive and never changes the SMS/Slack/GoHighLevel
behavior above. See the LeadTrackerCRM repo for onboarding a client.

### Customizing the Handler

Edit `netlify/functions/webhook.js` to:
- Add additional integrations (email, database, etc.)
- Modify Slack message format
- Add custom validation
- Transform form data

## 🧩 How It Works

### Simple Webhook Flow:
```
Formspree → POST → Netlify Function → Process → Log + Slack
```

### REST Hook Flow:
```
1. Formspree → GET with challenge → Netlify Function → Returns challenge
2. Formspree → POST with data → Netlify Function → Process → Log + Slack
```

### Request/Response Examples

**GET (Health Check):**
```json
// Request: GET /.netlify/functions/webhook
// Response:
{
  "message": "Formspree webhook endpoint is active",
  "method": "GET",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**GET (REST Hook Handshake):**
```json
// Request: GET /.netlify/functions/webhook?challenge=abc123
// Response:
{
  "challenge": "abc123",
  "message": "REST Hook endpoint verified"
}
```

**POST (Form Submission):**
```json
// Request: POST /.netlify/functions/webhook
// Body: {"name":"John","email":"john@example.com"}
// Response:
{
  "success": true,
  "message": "Webhook received and processed",
  "receivedAt": "2024-01-01T12:00:00.000Z",
  "slackSent": true
}
```

## 🐛 Troubleshooting

### Webhook not receiving data
- ✅ Verify the URL is correct in Formspree settings
- ✅ Check Netlify function logs for errors
- ✅ Ensure the function is deployed (not just local)

### REST Hook handshake failing
- ✅ Verify GET requests work: `curl https://YOUR-SITE.netlify.app/.netlify/functions/webhook?challenge=test`
- ✅ Check that the function returns the challenge value

### Slack not working
- ✅ Verify `SLACK_WEBHOOK_URL` is set correctly
- ✅ Test the Slack webhook URL separately
- ✅ Check function logs for Slack API errors

### CORS errors
- ✅ CORS headers are included in the function response
- ✅ For production, restrict `Access-Control-Allow-Origin` to specific domains

## 📝 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

This is a template project. Feel free to fork and customize for your needs!

---

**Deployment Time**: < 5 minutes ⚡

**Ready to deploy?** Run `netlify deploy --prod` and you're done! 🚀


