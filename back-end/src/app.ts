import bodyParser from "body-parser";
import express from "express";
import "reflect-metadata";
import AppDataSource from "./data-source";
const userRouter = require("./routers/users");
const app = express();
const PORT = process.env.PORT || 3000;

require("dotenv").config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});
// app.use(errorHandler);
app.use("/api/users", userRouter);

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
