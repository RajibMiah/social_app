import express from "express";
import { getRepository } from "typeorm";
import { User } from "../entity/User";
const router = express.Router();
const bcrypt = require("bcrypt");
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email) {
    res.status(400).json({ error: "Name and email are required fields" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userRepository = getRepository(User);
  const newUser = userRepository.create({
    username,
    email,
    password,
  });
  await userRepository.save(newUser);
  try {
    const requestedData = {
      username,
      email,
      password: hashedPassword,
    };

    console.log("user post data:", requestedData);

    res.status(201).json({
      message: "User created Successfully",
    });
  } catch (error) {
    console.error("Error occured", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
