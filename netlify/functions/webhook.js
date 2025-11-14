/**
 * Formspree Webhook Handler for Netlify Functions
 * 
 * Supports both:
 * - Simple Webhook: Direct POST requests with form data
 * - REST Hook: GET request for handshake verification, POST for webhook data
 */

const fetch = require('node-fetch');

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
      const challenge = event.queryStringParameters?.challenge;
      
      if (challenge) {
        // REST Hook verification: return the challenge value
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
      let formData;

      try {
        // Parse the request body
        const body = event.body || '{}';
        formData = typeof body === 'string' ? JSON.parse(body) : body;

        // Formspree sends data in different formats:
        // Simple Webhook: Direct form data in body
        // REST Hook: Wrapped in a 'data' property or 'payload'
        if (formData.data) {
          formData = formData.data;
        } else if (formData.payload) {
          formData = formData.payload;
        }

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

      // Return success response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Webhook received and processed',
          receivedAt: new Date().toISOString(),
          slackSent: slackResult && !slackResult.skipped,
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

