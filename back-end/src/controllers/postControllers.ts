const Post = require("../entities/Post");
const User = require("../entities/User");
const Comment = require("../entities/Comment");
const PostLike = require("../entities/PostLike");
const paginate = require("../util/paginate");
const cooldown = new Set();
import { Request, Response } from "express";
import dataSource from "../data-source";
const USER_LIKES_PAGE_SIZE = 9;

async function createPost(req: Request, res: Response) {
  try {
    const { title, content, userId } = req.body as any;

    if (!(title && content)) {
      throw new Error("All input required");
    }

    // Assuming `cooldown` is a Set or something similar
    if (cooldown.has(userId)) {
      throw new Error(
        "You are posting too frequently. Please try again shortly."
      );
    }

    cooldown.add(userId);
    setTimeout(() => {
      cooldown.delete(userId);
    }, 60000);

    // Creating a new Post instance
    const postRepository = dataSource.getRepository(Post);
    const post = postRepository.create({
      title,
      content,
      poster: userId,
    });

    // Saving the created post
    const savedPost = await postRepository.save(post);

    // res.json({
    //   data: savedPost,
    // });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const getPost = async (req: Request, res: Response) => {
  try {
    const postId: number = parseInt(req.params.id) as any;
    const { userId }: { userId?: number } = req.body as any;

    // Check if postId is a valid number
    if (isNaN(postId)) {
      throw new Error("Invalid post ID");
    }

    // Fetch post with poster details
    const postRepository = dataSource.getRepository(Post);
    const post = await postRepository.findOne({
      where: { id: postId },
      relations: ["poster"],
    });

    // Check if post exists
    if (!post) {
      throw new Error("Post not found");
    }

    // Set liked status if userId is provided
    if (userId) {
      await setLiked([post], userId);
    }

    // Enrich post with user like preview
    await enrichWithUserLikePreview([post]);

    return res.json(post);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const updatePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const { content, userId, isAdmin } = req.body;

    const postRepository = dataSource.getRepository(Post) as any;
    const post = await postRepository.findOne(postId);

    if (!post) {
      throw new Error("Post does not exist");
    }

    if (post.poster !== userId && !isAdmin) {
      throw new Error("Not authorized to update post");
    }

    post.content = content;
    post.edited = true;

    await postRepository.save(post);

    return res.json(post);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const deletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const { userId, isAdmin } = req.body;

    const postRepository = dataSource.getRepository(Post) as any;
    const post = await postRepository.findOne(postId);

    if (!post) {
      throw new Error("Post does not exist");
    }

    if (post.poster !== userId && !isAdmin) {
      throw new Error("Not authorized to delete post");
    }

    await postRepository.remove(post);

    const commentRepository = dataSource.getRepository(Comment);
    await commentRepository.delete({ post: postId });

    return res.json(post);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

const setLiked = async (posts: any[], userId: number) => {
  // Fetch user post likes based on userId
  const userPostLikes = await PostLike.find({ where: { userId } });

  // Loop through posts and check if the user has liked each post
  posts.forEach((post) => {
    // Check if the user has liked the current post
    const likedPost = userPostLikes.find((like) => like.postId === post.id);
    post.liked = !!likedPost; // Set liked property based on the presence of likedPost
  });
};

const enrichWithUserLikePreview = async (posts) => {
  try {
    // Extract post IDs from the posts array
    const postIds = posts.map((post) => post._id);

    // Build the SQL query to fetch post likes
    const query = `
      SELECT pl.*, u.username
      FROM PostLike pl
      INNER JOIN User u ON pl.userId = u.id
      WHERE pl.postId IN (${postIds.map(() => "?").join(",")})
      LIMIT 200;
    `;

    // Execute the SQL query
    const postLikes = await dataSource.query(query, postIds);

    // Map post likes to their respective posts
    const postMap = {};
    posts.forEach((post) => {
      postMap[post._id] = post;
    });

    // Enrich posts with user like previews
    postLikes.forEach((postLike) => {
      const post = postMap[postLike.postId];
      if (!post.userLikePreview) {
        post.userLikePreview = [];
      }
      post.userLikePreview.push({ username: postLike.username });
    });

    return posts;
  } catch (error) {
    throw new Error(
      "Error enriching posts with user like previews: " + error.message
    );
  }
};

const getUserLikedPosts = async (req: Request, res: Response) => {
  try {
    const likerId = req.params.id;
    const { userId } = req.body;

    // CHECK PAGE HAS NUMBER OR STRING VALUE IF STRING THEN MIGHT BE CAUSED ERROR
    let { page, sortBy } = req.query as any;
    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    const likedPostLikes = await dataSource.query(
      `
      SELECT pl.*, p.* 
      FROM post_like pl
      INNER JOIN post p ON p.id = pl."postId"
      WHERE pl."userId" = $1
      ORDER BY pl."createdAt" ${sortBy === "-createdAt" ? "DESC" : "ASC"}
      LIMIT 10 OFFSET ${(page - 1) * 10}
    `,
      [likerId]
    );

    const likedPosts = likedPostLikes.map((like) => like.post);

    if (userId) {
      await setLiked(likedPosts, userId);
    }

    await enrichWithUserLikePreview(likedPosts);

    return res.json({ data: likedPosts, count: likedPosts.length });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const { userId } = req.body;
    let { page, sortBy, author, search, liked } = req.query;

    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    // Construct the SQL query based on the provided parameters
    let sqlQuery = `
      SELECT p.*, u.username as poster_username 
      FROM posts p 
      JOIN users u ON p.poster_id = u.id
      WHERE 1 = 1`;

    if (author) {
      sqlQuery += ` AND u.username = '${author}'`;
    }

    if (search) {
      sqlQuery += ` AND LOWER(p.title) LIKE LOWER('%${search}%')`;
    }

    sqlQuery += ` ORDER BY p.${sortBy}`;

    // Execute the SQL query
    const posts = await dataSource.query(sqlQuery);

    // Paginate the results
    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;
    const paginatedPosts = posts.slice(startIndex, startIndex + pageSize);

    const count = posts.length;

    // Add additional processing if needed, like setting liked status

    return res.json({ data: paginatedPosts, count });
  } catch (err) {
    console.log(err.message);
    return res.status(400).json({ error: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    // Check if the post exists
    const postQuery = `
      SELECT * FROM posts WHERE id = $1
    `;
    const postResult = await dataSource.query(postQuery, [postId]);
    const post = postResult.rows[0];

    if (!post) {
      throw new Error("Post does not exist");
    }

    // Check if the user has already liked the post
    const existingLikeQuery = `
      SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2
    `;
    const existingLikeResult = await dataSource.query(existingLikeQuery, [
      postId,
      userId,
    ]);
    const existingPostLike = existingLikeResult.rows[0];

    if (existingPostLike) {
      throw new Error("Post is already liked");
    }

    // Create a new like for the post
    const createLikeQuery = `
      INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
    `;
    await dataSource.query(createLikeQuery, [postId, userId]);

    // Update the like count for the post
    const updateLikeCountQuery = `
      SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = $1
    `;
    const updateLikeCountResult = await dataSource.query(updateLikeCountQuery, [
      postId,
    ]);
    const likeCount = updateLikeCountResult.rows[0].like_count;

    // Update the post with the new like count
    const updatePostQuery = `
      UPDATE posts SET like_count = $1 WHERE id = $2
    `;
    await dataSource.query(updatePostQuery, [likeCount, postId]);

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    // Check if the post exists
    const postQuery = `
      SELECT * FROM posts WHERE id = $1
    `;
    const postResult = await dataSource.query(postQuery, [postId]);
    const post = postResult.rows[0];

    if (!post) {
      throw new Error("Post does not exist");
    }

    // Check if the user has already liked the post
    const existingLikeQuery = `
      SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2
    `;
    const existingLikeResult = await dataSource.query(existingLikeQuery, [
      postId,
      userId,
    ]);
    const existingPostLike = existingLikeResult.rows[0];

    if (!existingPostLike) {
      throw new Error("Post is already not liked");
    }

    // Remove the like for the post
    const removeLikeQuery = `
      DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2
    `;
    await dataSource.query(removeLikeQuery, [postId, userId]);

    // Update the like count for the post
    const updateLikeCountQuery = `
      SELECT COUNT(*) AS like_count FROM post_likes WHERE post_id = $1
    `;
    const updateLikeCountResult = await dataSource.query(updateLikeCountQuery, [
      postId,
    ]);
    const likeCount = updateLikeCountResult.rows[0].like_count;

    // Update the post with the new like count
    const updatePostQuery = `
      UPDATE posts SET like_count = $1 WHERE id = $2
    `;
    await dataSource.query(updatePostQuery, [likeCount, postId]);

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getUserLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { anchor } = req.query;

    // Construct the SQL query to fetch post likes
    let postLikesQuery = `
      SELECT pl.id, u.username
      FROM post_likes pl
      INNER JOIN users u ON pl.user_id = u.id
      WHERE pl.post_id = $1
      ORDER BY pl.id
      LIMIT $2
    `;
    const queryParams = [postId, USER_LIKES_PAGE_SIZE + 1];

    // If an anchor is provided, add a condition to fetch likes greater than the anchor
    if (anchor) {
      postLikesQuery += `
        AND pl.id > $3
      `;
      queryParams.push(anchor);
    }

    // Execute the query
    const { rows: postLikes } = await dataSource.query(
      postLikesQuery,
      queryParams
    );

    // Check if there are more pages
    const hasMorePages = postLikes.length > USER_LIKES_PAGE_SIZE;
    if (hasMorePages) postLikes.pop(); // Remove the extra record used for pagination

    // Map the results to the desired format
    const userLikes = postLikes.map((like) => ({
      id: like.id,
      username: like.username,
    }));

    return res.json({ userLikes, hasMorePages, success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getPost,
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getUserLikedPosts,
  getUserLikes,
};
