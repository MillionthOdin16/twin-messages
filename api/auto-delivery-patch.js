/**
 * Auto-delivery patch for GET /messages/:agentId
 *
 * Replace the existing endpoint with this version
 */

// GET /messages/:agentId - Poll for messages (GENERIC route - must be LAST)
// AUTO-DELIVER: Messages are automatically marked as delivered when fetched
app.get('/messages/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await redisClient.lRange(`messages:${agentId}`, 0, parseInt(limit) - 1);
    const parsedMessages = messages.map(m => JSON.parse(m));
    
    // Auto-mark messages as delivered when fetched
    let markedCount = 0;
    for (const message of parsedMessages) {
      const messageId = message.messageId;
      if (messageId) {
        const existingReceipt = await redisClient.hGet(`receipts:${messageId}`, agentId);
        if (!existingReceipt) {
          const receipt = {
            messageId,
            agentId,
            status: 'delivered',
            timestamp: new Date().toISOString()
          };
          await redisClient.hSet(`receipts:${messageId}`, agentId, JSON.stringify(receipt));
          await redisClient.expire(`receipts:${messageId}`, 86400);
          markedCount++;
        }
      }
    }
    
    // Invalidate undelivered cache if we marked any messages
    if (markedCount > 0) {
      await redisClient.del(`undelivered:${agentId}`);
      console.log(`Auto-marked ${markedCount} messages as delivered for ${agentId}`);
    }
    
    res.json({ 
      messages: parsedMessages,
      _meta: {
        fetched: parsedMessages.length,
        autoDelivered: markedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
