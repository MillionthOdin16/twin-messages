const request = require('supertest');
const { createClient } = require('redis');

// Mock redis
const mockRedisClient = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(),
  ping: jest.fn().mockResolvedValue('PONG'),
  lPush: jest.fn().mockResolvedValue(1),
  lTrim: jest.fn().mockResolvedValue('OK'),
  lRange: jest.fn().mockResolvedValue([]),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1)
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Mock process.env
process.env.A2A_API_KEY = 'test-api-key';

// Load app AFTER mocking
const app = require('../app');

describe('A2A Bridge API', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'healthy', redis: 'connected' });
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return 500 if redis ping fails', async () => {
      mockRedisClient.ping.mockRejectedValueOnce(new Error('Redis error'));
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(500);
      expect(res.body.status).toBe('unhealthy');
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 if no API key provided', async () => {
      const res = await request(app).get('/messages/badger-1');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should return 401 if invalid API key provided', async () => {
      const res = await request(app)
        .get('/messages/badger-1')
        .set('X-API-Key', 'wrong-key');
      expect(res.statusCode).toBe(401);
    });

    it('should allow access with valid API key in header', async () => {
      mockRedisClient.lRange.mockResolvedValueOnce([]);
      const res = await request(app)
        .get('/messages/badger-1')
        .set('X-API-Key', 'test-api-key');
      expect(res.statusCode).toBe(200);
    });

    it('should allow access with valid API key in query param', async () => {
      mockRedisClient.lRange.mockResolvedValueOnce([]);
      const res = await request(app)
        .get('/messages/badger-1?apiKey=test-api-key');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /messages', () => {
    const validMessage = {
      from: 'badger-1',
      to: 'ratchet',
      content: { text: 'Hello' }
    };

    it('should successfully send a message', async () => {
      const res = await request(app)
        .post('/messages')
        .set('X-API-Key', 'test-api-key')
        .send(validMessage);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBeDefined();

      // Verify Redis interactions
      expect(mockRedisClient.lPush).toHaveBeenCalledTimes(2); // Recipient + Observer
      expect(mockRedisClient.lTrim).toHaveBeenCalledTimes(2);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.lPush.mockRejectedValueOnce(new Error('Redis error'));

      const res = await request(app)
        .post('/messages')
        .set('X-API-Key', 'test-api-key')
        .send(validMessage);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Redis error');
    });
  });

  describe('GET /messages/:agentId', () => {
    it('should return messages for an agent', async () => {
      const mockMessages = [
        JSON.stringify({
          messageId: '1',
          timestamp: new Date().toISOString(),
          content: { text: 'Test' }
        })
      ];
      mockRedisClient.lRange.mockResolvedValueOnce(mockMessages);

      const res = await request(app)
        .get('/messages/badger-1')
        .set('X-API-Key', 'test-api-key');

      expect(res.statusCode).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].messageId).toBe('1');
    });

    it('should filter messages by timestamp if "since" param provided', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);

      const mockMessages = [
        JSON.stringify({ timestamp: now.toISOString(), content: 'recent' }),
        JSON.stringify({ timestamp: past.toISOString(), content: 'old' })
      ];
      mockRedisClient.lRange.mockResolvedValueOnce(mockMessages);

      const sinceTime = new Date(now.getTime() - 5000).toISOString();
      const res = await request(app)
        .get(`/messages/badger-1?apiKey=test-api-key&since=${sinceTime}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].content).toBe('recent');
    });
  });

  describe('GET /agents', () => {
    it('should list active agents', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['messages:badger-1', 'messages:ratchet', 'messages:all']);

      const res = await request(app)
        .get('/agents')
        .set('X-API-Key', 'test-api-key');

      expect(res.statusCode).toBe(200);
      expect(res.body.agents).toEqual(['badger-1', 'ratchet']); // Should filter out 'all'
    });
  });
});
