const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const PostLike = require("../models/PostLike");
const paginate = require("../util/paginate");
const cooldown = new Set();

const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, userId } = req.body;

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
    const postRepository = getRepository(Post);
    const post = postRepository.create({
      title,
      content,
      poster: userId,
    });

    // Saving the created post
    const savedPost = await postRepository.save(post);

    res.json(savedPost);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
