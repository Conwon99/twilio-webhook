/**
 * Logs Viewer Endpoint for Netlify Functions
 * Returns recent webhook submissions stored in memory
 * Note: This is a simple in-memory solution. For production, consider using a database.
 */

// In-memory log storage (resets on function restart)
// Note: For true persistence across restarts, consider using Netlify Blobs or a database
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
  
  // Removed limit - keep all logs in memory
  // Note: In production with high volume, consider implementing pagination or external storage
  
  return logEntry;
}

/**
 * Get recent logs
 * @param {number} limit - Maximum number of logs to return (0 = all logs)
 */
function getLogs(limit = 0) {
  if (limit === 0) {
    return logStorage; // Return all logs
  }
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
      // Default to 0 (all logs) unless limit is explicitly specified
      const limitParam = event.queryStringParameters?.limit;
      const limit = limitParam ? parseInt(limitParam, 10) : 0;
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


