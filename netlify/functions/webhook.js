/**
 * Formspree Webhook Handler for Netlify Functions
 * 
 * Supports both:
 * - Simple Webhook: Direct POST requests with form data
 * - REST Hook: GET request for handshake verification, POST for webhook data
 */

const fetch = require('node-fetch');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

/**
 * Load website to phone number mapping
 * @returns {Object} Map of websiteUrl -> phone number
 */
function loadWebsiteNumberMap() {
  try {
    // Try to read from the webnumber_map file in the functions directory
    const mapPath = path.join(__dirname, 'webnumber_map');
    const mapContent = fs.readFileSync(mapPath, 'utf8');
    
    const mapping = {};
    const lines = mapContent.split('\n').filter(line => line.trim());
    
    // Skip header row (first line)
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const parts = line.split(',').map(s => s.trim());
      // Format: Website URL, Client number, Twilio number
      if (parts.length >= 3) {
        const websiteUrl = parts[0];
        const clientNumber = parts[1]; // Business/client number to receive form contents
        const twilioNumber = parts[2]; // Twilio number (if different from default)
        
        if (websiteUrl && clientNumber) {
          mapping[websiteUrl] = {
            clientNumber: clientNumber,
            twilioNumber: twilioNumber || null
          };
        }
      }
    });
    
    console.log('Loaded website number mapping:', mapping);
    return mapping;
  } catch (error) {
    console.log('Could not load webnumber_map file, using empty mapping:', error.message);
    return {};
  }
}

/**
 * Get phone number for a website URL
 * @param {string} websiteUrl - The website URL from form submission
 * @returns {Object|null} Object with clientNumber and twilioNumber, or null if not found
 */
function getPhoneForWebsite(websiteUrl) {
  const mapping = loadWebsiteNumberMap();
  return mapping[websiteUrl] || null;
}

/**
 * Send SMS via Twilio
 * @param {string} message - The message content
 * @param {string} toPhone - Recipient phone number (E.164 format)
 * @param {string} fromPhoneOverride - Optional Twilio number override (from mapping)
 * @returns {Promise<Object>} Response from Twilio
 */
async function sendTwilioSMS(message, toPhone, fromPhoneOverride = null) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = fromPhoneOverride || process.env.TWILIO_PHONE_NUMBER;
  
  // Skip if Twilio credentials are not configured
  if (!accountSid || !authToken || !fromPhone) {
    console.log('Twilio credentials not configured, skipping SMS notification');
    return { skipped: true };
  }

  // Skip if no recipient phone number provided
  if (!toPhone) {
    console.log('No recipient phone number provided, skipping SMS notification');
    return { skipped: true };
  }

  // Validate phone number format (must start with +)
  if (!toPhone.startsWith('+')) {
    console.error('Invalid phone number format (must start with +):', toPhone);
    return { skipped: true, error: 'Invalid phone number format' };
  }

  try {
    const client = twilio(accountSid, authToken);

    console.log('Sending SMS - From:', fromPhone, 'To:', toPhone);

    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: toPhone,
    });

    console.log('SMS sent successfully:', result.sid, 'to:', toPhone);
    return {
      success: true,
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      from: fromPhone,
      to: toPhone
    });
    throw error;
  }
}

/**
 * Format phone number to E.164 format
 * @param {string} phone - Phone number in various formats
 * @returns {string} Phone number in E.164 format
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all spaces and dashes
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // If it starts with 0, replace with country code (UK: +44)
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+')) {
    // If no + prefix, assume UK and add +44
    cleaned = '+44' + cleaned.replace(/^44/, '');
  }
  
  return cleaned;
}

/**
 * Format form data into SMS message
 * @param {Object} formData - The form submission data
 * @returns {string} Formatted message
 */
function formatFormDataMessage(formData) {
  const parts = [];
  
  // Add a header to make it clear this is form submission data
  parts.push('📝 New Form Submission');
  
  // Handle name fields (support both 'name' and 'firstName'/'lastName')
  if (formData.name) {
    parts.push(`Name: ${formData.name}`);
  } else if (formData.firstName || formData.lastName) {
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ');
    if (fullName) {
      parts.push(`Name: ${fullName}`);
    }
  }
  
  // Handle email
  if (formData.email) {
    parts.push(`Email: ${formData.email}`);
  }
  
  // Handle phone
  if (formData.phone) {
    parts.push(`Phone: ${formData.phone}`);
  }
  
  // Handle service/type
  if (formData.service) {
    parts.push(`Service: ${formData.service}`);
  }
  
  // Handle message
  if (formData.message) {
    parts.push(`Message: ${formData.message}`);
  }
  
  // Handle website URL
  if (formData.websiteUrl) {
    parts.push(`Website: ${formData.websiteUrl}`);
  }
  
  // Include any other fields (except internal ones starting with _)
  Object.keys(formData).forEach(key => {
    if (!key.startsWith('_') && 
        !['name', 'firstName', 'lastName', 'email', 'phone', 'service', 'message', 'websiteUrl'].includes(key)) {
      parts.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${formData[key]}`);
    }
  });
  
  const message = parts.join('\n');
  console.log('Formatted form data message:', message);
  return message;
}

/**
 * Send data to Slack webhook (placeholder implementation)
 * @param {Object} formData - The form submission data
 * @returns {Promise<Object>} Response from Slack
 */
async function sendToSlack(formData) {
  // Replace with your actual Slack webhook URL
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
  
  // Skip if no Slack URL is configured
  if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL.includes('YOUR/WEBHOOK/URL')) {
    console.log('Slack webhook URL not configured, skipping Slack notification');
    return { skipped: true };
  }

  try {
    const slackPayload = {
      text: `New Formspree Submission`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📝 New Form Submission'
          }
        },
        {
          type: 'section',
          fields: Object.entries(formData).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}:*\n${String(value)}`
          }))
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Received at: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending to Slack:', error);
    throw error;
  }
}

/**
 * Log form submission (console + structured logging)
 * @param {Object} data - The form submission data
 * @param {Object} headers - Request headers
 */
function logSubmission(data, headers) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    submission: data,
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'x-formspree-email': headers['x-formspree-email'],
      'x-formspree-site': headers['x-formspree-site'],
    }
  };

  console.log('=== Formspree Webhook Received ===');
  console.log(JSON.stringify(logEntry, null, 2));
  console.log('==================================');
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // CORS headers for browser requests (optional, useful for testing)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // REST Hook Handshake: Formspree sends GET request to verify endpoint
    if (event.httpMethod === 'GET') {
      // Check for X-Hook-Secret header (REST Hook verification)
      // Netlify Functions lowercase all headers, so check lowercase
      const hookSecret = event.headers['x-hook-secret'] || 
                        event.headers['X-Hook-Secret'];
      
      if (hookSecret) {
        // REST Hook verification: mirror the X-Hook-Secret header
        console.log('REST Hook handshake received via GET, X-Hook-Secret:', hookSecret);
        const responseHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Hook-Secret': hookSecret, // Mirror the secret header (exact case as received)
        };
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: '', // Empty body for handshake
        };
      }
      
      // Check for challenge query parameter (alternative verification method)
      const challenge = event.queryStringParameters?.challenge;
      if (challenge) {
        console.log('REST Hook handshake received, challenge:', challenge);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            challenge: challenge,
            message: 'REST Hook endpoint verified',
          }),
        };
      }

      // Regular GET request (health check)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Formspree webhook endpoint is active',
          method: 'GET',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Handle POST requests (both Simple Webhook and REST Hook payloads)
    if (event.httpMethod === 'POST') {
      // Check for X-Hook-Secret header first (REST Hook handshake via POST)
      // Netlify Functions lowercase all headers, so check lowercase
      const hookSecret = event.headers['x-hook-secret'] || 
                        event.headers['X-Hook-Secret'];
      
      if (hookSecret) {
        // REST Hook handshake via POST: mirror the X-Hook-Secret header
        console.log('REST Hook handshake received via POST, X-Hook-Secret:', hookSecret);
        const responseHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Hook-Secret': hookSecret, // Mirror the secret header (exact case as received)
        };
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: '', // Empty body for handshake
        };
      }
      
      let formData;

      try {
        // Parse the request body
        const body = event.body || '{}';
        const rawBody = typeof body === 'string' ? JSON.parse(body) : body;
        
        // Log raw body for debugging
        console.log('=== Raw Webhook Body ===');
        console.log(JSON.stringify(rawBody, null, 2));
        console.log('========================');

        formData = rawBody;

        // Formspree sends data in different formats:
        // Simple Webhook: Direct form data in body (e.g., {name: "...", email: "..."})
        // REST Hook: May be wrapped in 'data', 'payload', or 'submission'
        // Check if we need to unwrap the data
        if (formData.submission && typeof formData.submission === 'object') {
          console.log('Found submission wrapper, unwrapping...');
          formData = formData.submission;
        } else if (formData.data && typeof formData.data === 'object') {
          console.log('Found data wrapper, unwrapping...');
          formData = formData.data;
        } else if (formData.payload && typeof formData.payload === 'object') {
          console.log('Found payload wrapper, unwrapping...');
          formData = formData.payload;
        }
        // If neither exists, formData is already the correct object

        // Log parsed form data for debugging
        console.log('=== Parsed Form Data ===');
        console.log(JSON.stringify(formData, null, 2));
        console.log('Form fields:', Object.keys(formData));
        console.log('========================');

      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON in request body',
            details: parseError.message,
          }),
        };
      }

      // Validate that we have data
      if (!formData || Object.keys(formData).length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'No form data received',
          }),
        };
      }

      // Log the submission
      logSubmission(formData, event.headers);

      // Store log entry (async, don't block response)
      try {
        // Store log by calling logs function
        const logsUrl = event.headers['x-forwarded-proto'] 
          ? `${event.headers['x-forwarded-proto']}://${event.headers.host}/.netlify/functions/logs`
          : 'http://localhost:8888/.netlify/functions/logs';
        
        // Use node-fetch to store log (fire and forget, don't await)
        fetch(logsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'webhook',
            method: 'POST',
            submission: formData,
            headers: {
              'user-agent': event.headers['user-agent'],
              'content-type': event.headers['content-type'],
              'x-formspree-email': event.headers['x-formspree-email'],
              'x-formspree-site': event.headers['x-formspree-site'],
            },
          }),
        }).catch(err => console.log('Log storage failed (non-blocking):', err));
      } catch (logError) {
        console.log('Log storage error (non-blocking):', logError);
      }

      // Send to Slack (async, don't block response)
      let slackResult = null;
      try {
        slackResult = await sendToSlack(formData);
      } catch (slackError) {
        // Log but don't fail the webhook if Slack fails
        console.error('Slack notification failed (non-blocking):', slackError);
      }

      // Send multiple SMS messages:
      // 1. Form contents to mapped number based on websiteUrl
      // 2. Form contents to additional number (+447862139959)
      // 3. Confirmation message to customer's phone
      
      let smsResult1 = null; // Form contents to mapped client
      let smsResult1b = null; // Form contents to additional number
      let smsResult2 = null; // Confirmation to customer
      
      // Prepare form message once
      const formMessage = formatFormDataMessage(formData);
      
      try {
        // Message 1a: Send form contents to mapped client number based on websiteUrl
        // Try to find websiteUrl in form data, or use a default mapping
        const websiteUrl = formData.websiteUrl || formData.website || formData.siteUrl;
        
        if (websiteUrl) {
          const websiteMapping = getPhoneForWebsite(websiteUrl);
          
          if (websiteMapping && websiteMapping.clientNumber) {
            // Format client phone number to E.164 format
            let clientPhone = websiteMapping.clientNumber;
            if (!clientPhone.startsWith('+')) {
              clientPhone = formatPhoneNumber(clientPhone);
            }
            // Use Twilio number from mapping if provided, otherwise use default
            const twilioFromNumber = websiteMapping.twilioNumber || null;
            console.log('=== MESSAGE 1a: Form Contents (Mapped Client) ===');
            console.log('From:', twilioFromNumber || 'default');
            console.log('To:', clientPhone);
            console.log('Message:', formMessage);
            console.log('==================================');
            smsResult1 = await sendTwilioSMS(formMessage, clientPhone, twilioFromNumber);
          } else {
            console.log('No client number mapped for website:', websiteUrl);
            smsResult1 = { skipped: true, reason: 'No mapping found for websiteUrl' };
          }
        } else {
          console.log('No websiteUrl in form data, skipping mapped client SMS');
          smsResult1 = { skipped: true, reason: 'No websiteUrl in form data' };
        }
      } catch (smsError) {
        console.error('Business SMS (mapped client) failed (non-blocking):', smsError);
        console.error('SMS Error details:', smsError.message, smsError.code);
      }
      
      try {
        // Message 1b: Send form contents to additional number
        const additionalNumber = '+447862139959';
        console.log('=== MESSAGE 1b: Form Contents (Additional Number) ===');
        console.log('To:', additionalNumber);
        console.log('Message:', formMessage);
        console.log('==================================');
        smsResult1b = await sendTwilioSMS(formMessage, additionalNumber);
      } catch (smsError) {
        console.error('Business SMS (additional number) failed (non-blocking):', smsError);
        console.error('SMS Error details:', smsError.message, smsError.code);
      }
      
      try {
        // Message 2: Send confirmation to customer
        const customerPhone = formatPhoneNumber(formData.phone);
        
        if (customerPhone) {
          const confirmationMessage = "Thanks for your message! We've received your contact form submission and will reply as soon as possible - keep on the lookout for a text message or a call.";
          console.log('=== MESSAGE 2: Customer Confirmation ===');
          console.log('To:', customerPhone);
          console.log('Message:', confirmationMessage);
          console.log('========================================');
          smsResult2 = await sendTwilioSMS(confirmationMessage, customerPhone);
        } else {
          console.log('No customer phone number in form data, skipping confirmation SMS');
          smsResult2 = { skipped: true, reason: 'No phone number in form data' };
        }
      } catch (smsError) {
        console.error('Customer confirmation SMS failed (non-blocking):', smsError);
      }

      // Return success response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Webhook received and processed',
          receivedAt: new Date().toISOString(),
          slackSent: slackResult && !slackResult.skipped,
          businessSmsSent: smsResult1 && !smsResult1.skipped,
          additionalSmsSent: smsResult1b && !smsResult1b.skipped,
          customerSmsSent: smsResult2 && !smsResult2.skipped,
        }),
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
      }),
    };

  } catch (error) {
    // Handle unexpected errors
    console.error('Webhook handler error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

