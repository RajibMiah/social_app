import { Request, Response } from "express";
import dataSource from "../data-source";
import { User } from "../entities/User";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const getUserDict = (token: string, user: any) => {
  return {
    token,
    username: user.username,
    userId: user.id,
    isAdmin: user.isAdmin,
  };
};

const buildToken = (user: any) => {
  return {
    userId: user.id,
    isAdmin: user.isAdmin,
  };
};

const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!(username && email && password)) {
      throw new Error("All input required");
    }

    const saltRounds = 10;
    const normalizedEmail = email.toLowerCase();

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query =
      'SELECT username , email FROM "User" WHERE email = $1 LIMIT 1' as any;
    const existingUser = await dataSource.query(query, [email]);

    console.log("existing user", existingUser);
    if (existingUser.length > 0) {
      throw new Error("Email and username must be unique");
    }

    const user = await dataSource.getRepository(User).create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
    });

    console.log("user", user);

    const token = jwt.sign(
      buildToken(user),
      "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQ"
    );

    return res.json(getUserDict(token, user));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      throw new Error("All input required");
    }

    const normalizedEmail = email.toLowerCase();

    const userRepository = <any>await dataSource.getRepository(User);

    const user = await userRepository.find({
      username: req.body.username,
      email: normalizedEmail,
    });

    if (!user) {
      throw new Error("Email or password incorrect");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Email or password incorrect");
    }

    const token = jwt.sign(
      buildToken(user),
      "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQ"
    );

    return res.json(getUserDict(token, user));
  } catch (err: any) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

const follow = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const followingId = req.params.id;

    const query = `
        SELECT * 
        FROM Follow 
        WHERE userId = $1 AND followingId = $2;
      `;
    const existingFollow = await dataSource.query(query, [userId, followingId]);

    if (existingFollow.length > 0) {
      throw new Error("Already following this user");
    }

    const insertQuery = `
        INSERT INTO Follow (userId, followingId)
        VALUES ($1, $2);
      `;
    const result = await dataSource.query(insertQuery, [userId, followingId]);

    return res.status(200).json({ data: result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId, biography } = req.body;

    const query = `
      UPDATE User
      SET biography = $1
      WHERE id = $2;
    `;

    const result = await dataSource.query(query, [biography, userId]);

    if (result.affectedRows === 0) {
      throw new Error("User does not exist");
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const unfollow = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const followingId = req.params.id;

    const query = `
        SELECT * 
        FROM Follow 
        WHERE userId = $1 AND followingId = $2;
      `;
    const existingFollow = await dataSource.query(query, [userId, followingId]);

    if (existingFollow.length === 0) {
      throw new Error("Not already following user");
    }

    const deleteQuery = `
        DELETE FROM Follow
        WHERE userId = $1 AND followingId = $2;
      `;
    await dataSource.query(deleteQuery, [userId, followingId]);

    return res.status(200).json({ data: existingFollow });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const query = `
        SELECT * 
        FROM Follow 
        WHERE followingId = $1;
      `;
    const followers = await dataSource.query(query, [userId]);

    return res.status(200).json({ data: followers });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const query = `
        SELECT * 
        FROM Follow 
        WHERE userId = $1;
      `;
    const following = await dataSource.query(query, [userId]);

    return res.status(200).json({ data: following });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const getUser = async (req: Request, res: Response) => {
  try {
    const username = req.params.username;

    const query = `
        SELECT * 
        FROM User 
        WHERE username = $1;
      `;
    const userResult = await dataSource.query(query, [username]);

    if (userResult.length === 0) {
      throw new Error("User does not exist");
    }

    const userId = userResult[0].id;

    const postsQuery = `
        SELECT * 
        FROM Post 
        WHERE poster = $1;
      `;
    const posts = await dataSource.query(postsQuery, [userId]);

    let likeCount = 0;
    posts.forEach((post: any) => {
      likeCount += post.likeCount;
    });

    const data = {
      user: userResult[0],
      posts: {
        count: posts.length,
        likeCount,
        data: posts,
      },
    };

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

const getRandomUsers = async (req: Request, res: Response) => {
  try {
    let { size } = req.query as any;

    // Ensure size is a number
    size = parseInt(size);

    // Construct the SQL query to retrieve random users
    const query = `
        SELECT * 
        FROM User 
        ORDER BY RANDOM() 
        LIMIT $1;
      `;

    // Execute the query to fetch random users
    const randomUsers = await dataSource.query(query, [size]);

    // Return the retrieved random users in the response
    return res.status(200).json(randomUsers);
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

const getRandomIndices = (size: number, sourceSize: number) => {
  const randomIndices: any = [];
  while (randomIndices.length < size) {
    const randomNumber = Math.floor(Math.random() * sourceSize);
    if (!randomIndices.includes(randomNumber)) {
      randomIndices.push(randomNumber);
    }
  }
  return randomIndices;
};

export {
  follow,
  getFollowers,
  getFollowing,
  getRandomUsers,
  getUser,
  login,
  register,
  unfollow,
  updateUser,
};
