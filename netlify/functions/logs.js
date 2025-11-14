/**
 * Logs Viewer Endpoint for Netlify Functions
 * Returns recent webhook submissions stored in memory
 * Note: This is a simple in-memory solution. For production, consider using a database.
 */

// In-memory log storage (resets on function restart)
// In production, use a database like Fauna, MongoDB, or Netlify's built-in storage
let logStorage = [];

/**
 * Store a log entry
 * Called by the webhook handler
 */
function addLog(entry) {
  const logEntry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...entry
  };
  
  logStorage.unshift(logEntry); // Add to beginning
  
  // Keep only last 100 entries
  if (logStorage.length > 100) {
    logStorage = logStorage.slice(0, 100);
  }
  
  return logEntry;
}

/**
 * Get recent logs
 */
function getLogs(limit = 50) {
  return logStorage.slice(0, limit);
}

/**
 * Clear all logs
 */
function clearLogs() {
  logStorage = [];
  return { success: true, message: 'Logs cleared' };
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // GET - Retrieve logs
    if (event.httpMethod === 'GET') {
      const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
      const logs = getLogs(limit);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          count: logs.length,
          logs: logs,
        }),
      };
    }

    // DELETE - Clear logs
    if (event.httpMethod === 'DELETE') {
      const result = clearLogs();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // POST - Add a log entry (for testing)
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON' }),
        };
      }

      const logEntry = addLog(body);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          log: logEntry,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

// Export helper functions for use by webhook handler
exports.addLog = addLog;
exports.getLogs = getLogs;

