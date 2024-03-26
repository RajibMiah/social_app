import express from "express";
import { getRepository } from "typeorm";
import { User } from "../entity/User";
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// USER SIGN UP CONTROLLER FUNCTION

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email) {
    res.status(400).json({ error: "Name and email are required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRepository = getRepository(User);
    const newUser = userRepository.create({
      username,
      email,
      password: hashedPassword,
    });
    await userRepository.save(newUser);

    console.log("User created successfully:", newUser);

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error occured", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// LOGIN IN CONTROLLER FUNCTION
router.post("/login", async (req, res) => {
  try {
    // Replace this with your actual User model and query
    const user = "found"; //await User.find({ username: req.body.username });

    if (!user || user.length === 0) {
      return res.status(401).json({
        error: "Authentication failed",
      });
    }

    const isValidPassword = await bcrypt.compare(
      req.body.password
      // Replace this with the hashed password stored in your User model
      // user[0].password
    );

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Authentication failed",
      });
    }

    const token = jwt.sign(
      {
        // Replace these with actual user details if needed
        // username: user[0].username,
        // userId: user[0]._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.status(200).json({
      access_token: token,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
