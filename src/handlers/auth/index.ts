import { NextFunction, Request, Response } from "express";
import { isValid } from "../../utils/validationUtils";
import { matchedData } from "express-validator";
import "dotenv/config";
import jwt from "jsonwebtoken";
import UserModel from "../../models/UserModel";
const bcrypt = require("bcrypt");
const secret = process.env.SECRET_KEY as string;

declare module "express" {
  export interface Request {
    user?: any; // Add your custom property here
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  console.log(req.body);
  const { valid, message } = isValid(req);
  if (!valid) {
    const m = message.email || message.password;
    console.error(`Log Error: ${message}`);
    return res.status(400).send({
      message: m.msg,
      redirect: { canNavigate: false, route: "" },
    });
  }
  try {
    const {
      email,
      password,
    }: { email: string; password: string; UserID: string } = matchedData(req);
    let user = null;
    try {
      user = await UserModel.findOne({ email });
    } catch (err) {
      throw new Error("Something went wrong.");
    }
    if (user === null) {
      throw new Error("User does not exist.");
    }
    const isPassSame = await bcrypt.compare(password, user.password);
    if (!isPassSame) {
      throw new Error("Password incorrect.");
    }
    try {
      await jwt.verify(req.cookies["token"], secret);
    } catch (err: any) {
      console.log("Cookie has expired creating a new session.");
      req.user = user;
      next();
      return;
    }
    res.json({
      message: "Login success",
      userData: user,
      redirect: { canNavigate: true, route: "/app" },
    });
  } catch (err: any) {
    console.error("Log Error: " + err.message);
    res.json({
      message: err.message,
      redirect: { canNavigate: false, route: "" },
    });
  }
}
async function register(req: Request, res: Response) {
  // both email and password should not be empty
  const { valid, message } = isValid(req);
  console.error(message);
  if (!valid) {
    const m = message.email || message.password;
    return res.status(400).send({
      message: m.msg,
      redirect: { canNavigate: false, route: "" },
    });
  }
  try {
    const { email, password }: { email: string; password: string } =
      matchedData(req);
    console.log({ email, password });
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new UserModel({
      email,
      username: "",
      password: hashedPassword,
      role: "user",
      dateCreated: new Date(),
    });
    const jwtToken = jwt.sign({ email, hashedPassword, role: "user" }, secret);
    const saveUser = await newUser.save();
    console.log({
      token: jwtToken,
      userID: saveUser._id,
    });
    res.cookie("token", jwtToken, {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      maxAge: 5000,
    });
    res.json({
      message: "Register success.",
      userData: newUser,
      redirect: { canNavigate: true, route: "/auth/register/username" },
    });
  } catch (err: any) {
    console.error(`Log Error: ${err.message}`);
    res.status(400).send({ ErrorMessage: err.message });
  }
}

async function renewToken(req: Request, res: Response) {
  const jwtToken = jwt.sign(
    { email: req.user.email, password: req.user.password, role: "user" },
    secret,
  );
  res.cookie("token", jwtToken, {
    sameSite: "none",
    secure: true,
    httpOnly: true,
    maxAge: 5000,
  });
  res.json({
    message: "New session",
    redirect: { canNavigate: true, userData: req.user, route: "/app" },
  });
}

export default { login, register };
