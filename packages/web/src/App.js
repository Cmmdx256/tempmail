import React, { useState, useEffect } from 'react';

// GitHub Pages API configuration for cmmdx256.github.io
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://cmmdx256.github.io/api';
const GITHUB_USERNAME = process.env.REACT_APP_GITHUB_USERNAME || 'cmmdx256';
const GITHUB_REPO = process.env.REACT_APP_GITHUB_REPO || 'cmmdx256.github.io';
const GITHUB_BRANCH = process.env.REACT_APP_GITHUB_BRANCH || 'main';

// API Endpoints (appearing as part of the domain)
const NEW_ADDRESS_API = `${API_BASE_URL}/new.json`;
const STATS_API = `${API_BASE_URL}/stats.json`;
const MESSAGES_API = (address) => `${API_BASE_URL}/messages/${address}.json`;

function App() {
  const [currentAddress, setCurrentAddress] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [stats, setStats] = useState({ total_addresses: 0, total_messages: 0 });
  const [lastRefresh, setLastRefresh] = useState(null);

  // Generate random local part for email address
  const generateLocalPart = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // Create new temporary email address
  const createAddress = async () => {
    setLoading(true);
    try {
      // Fetch new address from API
      const response = await fetch(`${NEW_ADDRESS_API}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to create address');
      }

      const addressData = await response.json();

      // Generate a local version for immediate use
      const localPart = generateLocalPart();
      const domain = process.env.REACT_APP_DOMAIN || 'cmmdxmail.xyz';
      const fullAddress = `${localPart}@${domain}`;

      const localAddressData = {
        address: fullAddress,
        local_part: localPart,
        domain: domain,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        token: Math.random().toString(36).substring(2, 15)
      };

      setCurrentAddress(localAddressData);
      localStorage.setItem('tempMailAddress', JSON.stringify(localAddressData));

      // Clear any existing messages
      setMessages([]);
      setLastRefresh(new Date());

    } catch (error) {
      console.error('Error creating address:', error);
      alert('Failed to create email address. Please try again.');
    }
    setLoading(false);
  };

  // Load messages for current address from external APIs
  const loadMessages = async () => {
    if (!currentAddress) return;

    try {
      let apiMessages = [];

      if (currentAddress.provider === '1secmail' || currentAddress.domain.includes('1secmail')) {
        // Poll 1secmail API
        const messagesUrl = `https://www.1secmail.com/api/v1/?action=getMessages&login=${currentAddress.local_part}&domain=${currentAddress.domain}`;
        const messagesResponse = await fetch(messagesUrl);

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();

          // Convert to our format
          apiMessages = await Promise.all(messages.map(async (msg) => {
            // Get message details
            const detailUrl = `https://www.1secmail.com/api/v1/?action=readMessage&login=${currentAddress.local_part}&domain=${currentAddress.domain}&id=${msg.id}`;
            const detailResponse = await fetch(detailUrl);
            const detail = detailResponse.ok ? await detailResponse.json() : {};

            return {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              from: detail.from || msg.from || 'unknown@example.com',
              subject: detail.subject || msg.subject || '(No subject)',
              received_at: new Date().toISOString()
            };
          }));
        }
      } else if (currentAddress.provider === 'mailtm' || ['mail.tm', 'firemail.cc', 'chickenkiller.com'].includes(currentAddress.domain)) {
        // Poll Mail.tm API
        try {
          // Get auth token
          const tokenResponse = await fetch('https://api.mail.tm/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: currentAddress.address,
              password: 'temppassword123'
            })
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const token = tokenData.token;

            // Get messages
            const messagesResponse = await fetch('https://api.mail.tm/messages', {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json();
              const messages = messagesData['hydra:member'] || [];

              // Convert to our format
              apiMessages = messages.map(msg => ({
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                from: msg.from || 'unknown@example.com',
                subject: msg.subject || '(No subject)',
                received_at: new Date().toISOString()
              }));
            }
          }
        } catch (error) {
          console.log('Mail.tm polling failed:', error.message);
        }
      }

      // Check if there are new messages
      if (apiMessages.length > messages.length) {
        const newCount = apiMessages.length - messages.length;
        if (newCount > 0 && messages.length > 0) {
          showNotification(`📧 ${newCount} new message(s) received!`);
        }
      }

      setMessages(apiMessages);
      setLastRefresh(new Date());

      // Also try to load from our "API" as backup
      try {
        const response = await fetch(`${MESSAGES_API(currentAddress.local_part)}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          const jsonMessages = data.messages || [];
          if (jsonMessages.length > apiMessages.length) {
            setMessages(jsonMessages);
          }
        }
      } catch (error) {
        // Ignore JSON API errors, we have direct API data
      }

    } catch (error) {
      console.error('Error loading messages:', error);
      // Try fallback to JSON API
      try {
        const response = await fetch(`${MESSAGES_API(currentAddress.local_part)}?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
          setLastRefresh(new Date());
        }
      } catch (fallbackError) {
        console.log('All message loading methods failed');
      }
    }
  };

  // Generate new random address from external APIs
  const generateNewAddress = async () => {
    setLoading(true);
    try {
      let address = null;
      let provider = 'unknown';

      // Try 1secmail first
      try {
        console.log('Generating address from 1secmail...');
        const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        if (response.ok) {
          const emails = await response.json();
          if (emails && emails.length > 0) {
            address = emails[0];
            provider = '1secmail';
          }
        }
      } catch (error) {
        console.log('1secmail failed, trying Mail.tm...');
      }

      // Fallback to Mail.tm
      if (!address) {
        try {
          const domainsResponse = await fetch('https://api.mail.tm/domains');
          if (domainsResponse.ok) {
            const domainsData = await domainsResponse.json();
            const domains = domainsData['hydra:member'] || [];

            if (domains.length > 0) {
              const domain = domains[0].domain;
              const localPart = Math.random().toString(36).substring(2, 15);
              address = `${localPart}@${domain}`;
              provider = 'mailtm';
            }
          }
        } catch (error) {
          console.log('Mail.tm failed, using fallback...');
        }
      }

      // Ultimate fallback
      if (!address) {
        const localPart = Math.random().toString(36).substring(2, 15);
        address = `${localPart}@1secmail.com`;
        provider = 'fallback';
      }

      const [localPart, domain] = address.split('@');

      const addressData = {
        address: address,
        local_part: localPart,
        domain: domain,
        provider: provider,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        token: Math.random().toString(36).substring(2, 15)
      };

      setCurrentAddress(addressData);
      localStorage.setItem('tempMailAddress', JSON.stringify(addressData));
      setMessages([]);
      setLastRefresh(new Date());

      // Also update the "API" by triggering GitHub Actions
      try {
        await fetch('https://api.github.com/repos/cmmdx256/cmmdx256.github.io/dispatches', {
          method: 'POST',
          headers: {
            'Authorization': `token ${process.env.REACT_APP_GITHUB_TOKEN || ''}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'generate_address',
            client_payload: { address_data: addressData }
          })
        });
      } catch (error) {
        console.log('GitHub Actions notification failed, but address generated locally');
      }

    } catch (error) {
      console.error('Error generating address:', error);
      alert('Failed to generate email address. Please try again.');
    }
    setLoading(false);
  };

  // Show notification
  const showNotification = (message) => {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  // Load system statistics
  const loadStats = async () => {
    try {
      const response = await fetch(`${STATS_API}?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load saved address on component mount
  useEffect(() => {
    const saved = localStorage.getItem('tempMailAddress');
    if (saved) {
      try {
        const addressData = JSON.parse(saved);
        // Check if address is still valid
        const expiresAt = new Date(addressData.expires_at);
        if (expiresAt > new Date()) {
          setCurrentAddress(addressData);
        } else {
          localStorage.removeItem('tempMailAddress');
        }
      } catch (error) {
        localStorage.removeItem('tempMailAddress');
      }
    }

    // Load system stats
    loadStats();
  }, []);

  // Auto-refresh messages every 15 seconds for near real-time experience
  useEffect(() => {
    if (currentAddress) {
      loadMessages();
      const interval = setInterval(loadMessages, 15000); // 15 seconds
      return () => clearInterval(interval);
    }
  }, [currentAddress]);

  // Load individual message details
  const loadMessageDetail = async (messageId) => {
    if (!currentAddress) return null;

    try {
      // First try to load from external API directly
      if (currentAddress.provider === '1secmail' || currentAddress.domain.includes('1secmail')) {
        // Extract message ID from our format
        const originalId = messageId.replace('msg_', '').split('_')[2];

        const detailUrl = `https://www.1secmail.com/api/v1/?action=readMessage&login=${currentAddress.local_part}&domain=${currentAddress.domain}&id=${originalId}`;
        const detailResponse = await fetch(detailUrl);

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          return {
            id: messageId,
            from: detail.from || 'unknown@example.com',
            subject: detail.subject || '(No subject)',
            body_text: detail.text || '',
            body_html: detail.html || '',
            attachments: detail.attachments || [],
            received_at: new Date().toISOString()
          };
        }
      } else if (currentAddress.provider === 'mailtm' || ['mail.tm', 'firemail.cc', 'chickenkiller.com'].includes(currentAddress.domain)) {
        // For Mail.tm, we'd need to get the message by ID from their API
        // This is more complex as we need to maintain message ID mapping
        console.log('Mail.tm message detail loading not fully implemented yet');
      }

      // Fallback to our JSON API
      const response = await fetch(`${API_BASE_URL}/message/${currentAddress.local_part}/${messageId}.json?t=${Date.now()}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error loading message detail:', error);
    }
    return null;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m remaining`;
    } else {
      return `${diffMins}m remaining`;
    }
  };

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  const isAdmin = adminKey === (process.env.REACT_APP_ADMIN_KEY || 'admin123');

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Temp-Mail</h1>
          <p className="text-gray-600">Secure disposable email service powered by GitHub</p>
          <div className="mt-4 text-sm text-gray-500">
            System Status: {stats.total_addresses} addresses, {stats.total_messages} messages
          </div>
        </div>

        {/* Admin Toggle */}
        <div className="text-center mb-4">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {showAdmin ? 'Hide' : 'Show'} Admin Panel
          </button>
        </div>

        {/* Admin Panel */}
        {showAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>
            {!isAdmin ? (
              <div>
                <input
                  type="password"
                  placeholder="Enter admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="border rounded px-3 py-2 mr-2"
                />
                <button
                  onClick={() => setAdminKey(adminKey)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Access
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold">Total Addresses</h3>
                  <p className="text-2xl">{stats.total_addresses}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold">Total Messages</h3>
                  <p className="text-2xl">{stats.total_messages}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded">
                  <h3 className="font-semibold">System Health</h3>
                  <p className="text-green-600">Operational</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Address Section */}
        {!currentAddress ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Create Temporary Email</h2>
            <p className="text-gray-600 mb-6">
              Get a temporary email address that expires automatically. Perfect for signups and privacy.
              Messages are processed via GitHub Actions and stored as JSON files.
            </p>
            <button
              onClick={generateNewAddress}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Random Email Address'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Temporary Email</h2>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <p className="text-lg font-mono bg-gray-100 p-3 rounded border">
                  {currentAddress.address}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(currentAddress.address)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Copy
              </button>
            </div>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={createAddress}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                New Address
              </button>
              <button
                onClick={loadMessages}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Refresh Inbox
              </button>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Expires: {new Date(currentAddress.expires_at).toLocaleString()}
              </span>
              <span className={`font-semibold ${new Date(currentAddress.expires_at) > new Date() ? 'text-green-600' : 'text-red-600'}`}>
                {formatTimeRemaining(currentAddress.expires_at)}
              </span>
            </div>
            {lastRefresh && (
              <p className="text-xs text-gray-400 mt-2">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Messages Section */}
        {currentAddress && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Inbox ({messages.length} messages)
            </h2>

            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 text-lg mb-2">
                  No messages yet
                </p>
                <p className="text-gray-400 text-sm">
                  Send an email to <strong>{currentAddress.address}</strong> to see it here
                </p>
                <p className="text-gray-400 text-xs mt-4">
                  Messages are processed via GitHub Actions and may take 1-2 minutes to appear
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={async () => {
                      const detail = await loadMessageDetail(message.id);
                      setSelectedMessage(detail || message);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {message.subject || '(No subject)'}
                        </h3>
                        <p className="text-gray-600 text-sm">From: {message.from}</p>
                        <p className="text-gray-500 text-sm">
                          {new Date(message.received_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          New
                        </span>
                        {message.attachments && message.attachments.length > 0 && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                            📎 {message.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold pr-4">
                      {selectedMessage.subject || '(No subject)'}
                    </h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <p><strong>From:</strong> {selectedMessage.from}</p>
                      <p><strong>Received:</strong> {new Date(selectedMessage.received_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Attachments */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-semibold mb-2">Attachments:</h4>
                    <div className="space-y-1">
                      {selectedMessage.attachments.map((attachment, index) => (
                        <div key={index} className="text-sm">
                          📎 {attachment.filename || `Attachment ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="border-t pt-4">
                  <div className="prose max-w-none">
                    {selectedMessage.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {selectedMessage.body_text}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by GitHub Pages & Actions • Messages processed automatically</p>
          <p className="mt-1">This service is for legitimate use only. Please respect the terms of service.</p>
        </div>
      </div>
    </div>
  );
}

export default App;