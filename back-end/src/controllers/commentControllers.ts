import { Request, Response } from "express";

import AppDataSource from "../data-source";
import { Post } from "../entities/Post";
const cooldown = new Set();

const createComment = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id as any;
    const { content, parentId, userId } = req.body as any;

    // Check if the post exists
    const post = await AppDataSource.getRepository(Post).findOne(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (cooldown.has(userId)) {
      throw new Error(
        "You are commenting too frequently. Please try again shortly."
      );
    }

    cooldown.add(userId);
    setTimeout(() => {
      cooldown.delete(userId);
    }, 30000);
    // Execute raw SQL query to insert a new comment
    const newComment = await AppDataSource.query(
      `INSERT INTO comment (content, parent_id, post_id, commenter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [content, parentId, postId, userId]
    );

    // Update comment count in the post
    await AppDataSource.query(
      `UPDATE post
       SET comment_count = comment_count + 1
       WHERE id = $1`,
      [postId]
    );

    // Populate commenter information
    // Implement if necessary

    return res.json(newComment[0]);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const getPostComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    // Execute raw SQL query to fetch comments for the post
    const comments = await AppDataSource.query(
      `SELECT * FROM comment
       WHERE post_id = $1
       ORDER BY created_at DESC`,
      [postId]
    );

    // Initialize an object to store comment parents
    const commentParents: { [key: number]: any } = {};
    // Initialize an array to store root comments
    const rootComments: any[] = [];

    // Iterate through comments to build the comment tree
    comments.forEach((comment: any) => {
      comment.children = [];
      commentParents[comment.id] = comment;
      if (comment.parent_id) {
        const parent = commentParents[comment.parent_id];
        parent.children.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    return res.json(rootComments);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const getUserComments = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as any;
    let { page, sortBy } = req.query as any;

    if (!sortBy) sortBy = "created_at DESC"; // Default sort by createdAt in descending order
    if (!page) page = 1;

    // Execute raw SQL query to fetch user comments
    const comments = await AppDataSource.query(
      `SELECT * FROM comment
         WHERE commenter_id = $1
         ORDER BY ${sortBy}
         LIMIT 10 OFFSET $2`,
      [userId, (page - 1) * 10] // Assuming 10 comments per page
    );

    return res.json(comments);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const updateComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const { userId, content, isAdmin } = req.body;

    if (!content) {
      throw new Error("All input required");
    }

    // Check if the comment exists
    const commentExists = await AppDataSource.query(
      `SELECT * FROM comment WHERE id = $1`,
      [commentId]
    );

    if (!commentExists.length) {
      throw new Error("Comment not found");
    }

    const comment = commentExists[0];

    // Check if the user is authorized to update the comment
    if (comment.commenter !== userId && !isAdmin) {
      throw new Error("Not authorized to update comment");
    }

    // Update the comment content and mark it as edited
    await AppDataSource.query(
      `UPDATE comment SET content = $1, edited = true WHERE id = $2`,
      [content, commentId]
    );

    // Fetch the updated comment
    const updatedComment = await AppDataSource.query(
      `SELECT * FROM comment WHERE id = $1`,
      [commentId]
    );

    return res.status(200).json(updatedComment[0]);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const deleteComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const { userId, isAdmin } = req.body;

    // Check if the comment exists
    const commentExists = await AppDataSource.query(
      `SELECT * FROM comment WHERE id = $1`,
      [commentId]
    );

    if (!commentExists.length) {
      throw new Error("Comment not found");
    }

    const comment = commentExists[0];

    // Check if the user is authorized to delete the comment
    if (comment.commenter !== userId && !isAdmin) {
      throw new Error("Not authorized to delete comment");
    }

    // Remove the comment
    await AppDataSource.query(`DELETE FROM comment WHERE id = $1`, [commentId]);

    // Update post comment count
    await AppDataSource.query(
      `UPDATE post SET comment_count = (SELECT COUNT(*) FROM comment WHERE post_id = $1) WHERE id = $1`,
      [comment.post]
    );

    return res.status(200).json(comment);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  createComment,
  getPostComments,
  getUserComments,
  updateComment,
  deleteComment,
};
