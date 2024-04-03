import bodyParser from "body-parser";
import express from "express";
import "reflect-metadata";
import AppDataSource from "./data-source";
const app = express();
const PORT = process.env.PORT || 3000;
const users = require("./routers/users");
const posts = require("./routers/posts");
const cors = require("cors");
require("dotenv").config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(express.json());
app.use(cors());
app.use("/api/users", users);
app.use("/api/posts", posts);

// app.use("/api/comments", comments);
// app.use("/api/messages", messages);

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    app.listen(PORT, () => {
      console.log(`Server is running on port http:localhost:${PORT}`);
    });
  })
  .catch((err: any) => {
    console.error("Error during Data Source initialization", err);
  });
