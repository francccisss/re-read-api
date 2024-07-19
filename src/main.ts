import express, {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  Response,
} from "express";
import authRoutes from "./routes/auth";
import mongoose from "mongoose";
import "dotenv/config";
import apiv1 from "./routes/api/v1";
import authorizeUser from "./middlewares/auth/authorization";
import fs from "fs";
const cookieParser = require("cookie-parser");
const https = require("https");
const cors = require("cors");
const app: Express = express();
const uri = process.env.MONGODB_URI as string;
const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

mongoose.set("strictQuery", false);
async function startMongooseServer(uri: string): Promise<void> {
  await mongoose.connect(uri);
}
startMongooseServer(uri)
  .then((data) => console.log("Database Connected"))
  .catch((err) => console.log(err));

app.use(cookieParser());
app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded());

https.createServer(options, app).listen({ port: 8080 }, () => {
  console.log(`Server running on https://localhost:${8080}`);
});

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).send("Hello Re:read API");
});
app.use("/auth", authRoutes);
app.use("/app", authorizeUser, apiv1);
app.use(
  (
    err: ErrorRequestHandler,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    // improve error handling
    console.log("Error handler");
    console.error(err);
    if (err.name === "JsonWebTokenError")
      res.json({
        sessionExpired: true,
        message: "Session Expired.",
      });
    res.json({ ErrorMessage: err });
  },
);
