import { Request, Response } from "express";
import AppDataSource from "../data-source";
import { User } from "../entities/User";

const sendMessage = async (req: Request, res: Response) => {
  try {
    const recipientId = req.params.id as any;
    const { content, userId } = req.body;

    // Check if recipient exists
    const recipient = await AppDataSource.getRepository(User).findOne(
      recipientId
    );
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    // Check if conversation already exists
    let conversation = await AppDataSource.query(
      `
        SELECT * 
        FROM conversation 
        WHERE recipients @> ARRAY[$1, $2]::uuid[]
      `,
      [userId, recipientId]
    );

    // Create conversation if it doesn't exist
    if (!conversation.length) {
      const result = await AppDataSource.query(
        `
          INSERT INTO conversation (recipients)
          VALUES (ARRAY[$1, $2]::uuid[])
          RETURNING *
        `,
        [userId, recipientId]
      );
      conversation = result.rows;
    }

    // Create message
    await AppDataSource.query(
      `
        INSERT INTO message (conversation_id, sender_id, content)
        VALUES ($1, $2, $3)
      `,
      [conversation[0].id, userId, content]
    );

    // Update lastMessageAt
    await AppDataSource.query(
      `
        UPDATE conversation
        SET last_message_at = NOW()
        WHERE id = $1
      `,
      [conversation[0].id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const getMessages = async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    // Execute raw SQL query to fetch messages for the conversation
    const messages = await AppDataSource.query(
      `
        SELECT m.*, u.*
        FROM message m
        INNER JOIN "user" u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT 12
      `,
      [conversationId]
    );

    return res.json(messages);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const getConversations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Execute raw SQL query to fetch conversations
    const conversations = await AppDataSource.query(
      `
      SELECT c.*, u.*
      FROM conversation c
      INNER JOIN conversation_recipient cr ON c.id = cr.conversation_id
      INNER JOIN "user" u ON cr.recipient_id = u.id
      WHERE cr.recipient_id = $1
      ORDER BY c.updated_at DESC
    `,
      [userId]
    );

    // Modify the conversation object to include recipient
    conversations.forEach((conversation: any) => {
      conversation.recipient = conversation.recipients.find(
        (recipient: any) => recipient.id !== userId
      );
    });

    return res.json(conversations);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

export { getConversations, getMessages, sendMessage };
