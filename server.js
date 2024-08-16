const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

//file imports
const userModel = require("./models/userModel");
const { isEmailValidate } = require("./utils/authUtils");
const isAuth = require("./middlewares/isAuthMiddleware");
const todoModel = require("./models/todoModel");
const { todoDataValidation } = require("./utils/todoUtils");
const rateLimiting = require("./middlewares/rateLimitingMiddleware");

//contants MVC
const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const store = new mongodbSession({
  uri: MONGO_URI,
  collection: "sessions",
});

//Middlewares
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    saveUninitialized: false,
    resave: false,
  })
);

//db connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("mongodb connected successfully"))
  .catch((err) => console.log(err));

console.log(process.env.PORT);
//Empty URL or Home URL
app.get("/", (req, res) => {
  return res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
</head>
<body>
    <form action="/login" method="GET">
        <button>Login</button>
    </form>
    <form action="/register" method="GET">
        <button>Register</button>
    </form>
</body>
</html>
  
    `);
});

//testing file
app.get("/test", (req, res) => {
  return res.render("test");
});
   
//Registration API's
app.get("/register", (req, res) => {
  return res.render("registerPage");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const { name, email, username, password } = req.body;

  try {
    //check email exist or not
    const userEmailExist = await userModel.findOne({ email });

    console.log(userEmailExist, "fineone");
    if (userEmailExist) {
      return res.status(400).json("Email already exist.");
    }

    //check username exist or not
    const userNameExist = await userModel.findOne({ username });

    console.log(userNameExist, "fineone");
    if (userNameExist) {
      return res.status(400).json("Username already exist.");
    }

    //Hashed Password
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );
    const userObj = new userModel({
      name,
      email,
      username,
      password: hashedPassword,
    });

    console.log(userObj);

    const userDB = await userObj.save();
    return res
      .status(201)
      .json({ message: "User Created Succesfully", data: userDB });
  } catch (err) {
    return res.status(500).json(err);
  }

  // return res.send("Registeration Successfull");
});

//Login API's
app.get("/login", (req, res) => {
  return res.render("loginPage");
});

app.post("/login", async (req, res) => {
  console.log(req.body);

  const { loginId, password } = req.body;

  if (!loginId || !password)
    return res.status(400).json("Missing loginId/Password");

  if (typeof loginId !== "string")
    return res.status(400).json("Login Id is not a text");

  if (typeof password !== "string")
    return res.status(400).json("Password is not a text");

  try {
    let userDb = {};

    //Check Email Validation
    if (isEmailValidate({ key: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }
    console.log(userDb);
    if (!userDb) {
      return res.status(400).json("User not found, please register first");
    }

    //Compare the Password
    const isMatch = await bcrypt.compare(password, userDb.password);
    console.log(isMatch);
    if (!isMatch) {
      return res.status(400).json("Incorrect Password");
    }

    //session init
    console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };
    return res.redirect("/dashboard");
    // return res.status(200).json("Login Successfull");
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error });
  }
  return res.send("Login Successfull");
});

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardPage");
});

//logout
app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json(err);
    } else {
      return res.status(200).json("Logout Successfull");
    }
  });
});

//logout from all devices
app.post("/logout-from-all",isAuth, async(req,res)=>{
    console.log(req.session);

    const username = req.session.user.username;

    const sessionSchema = new mongoose.Schema({_id:String},{strict:false});
    const sessionModel = mongoose.model("Session", sessionSchema);

    try{
      const deleteDb = await sessionModel.deleteMany({
        "session.user.username" : username,
      });
    
      console.log(deleteDb);

      return res
      .status(200)
      .json(`Logout from ${deleteDb.deletedCount} devices Successfull`);
    }catch(err){
        return res.status(500).json(err);
    }
});

//Todo CRED Operations

//Create todo
app.post("/create-todo", isAuth, rateLimiting , async (req, res) => {
  console.log(req.session);
  console.log(req.body);
  const username = req.session.user.username;
  const { todo } = req.body;

  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  const todoObj = new todoModel({
    todo,
    username,
  });

  try {
    const userDb = await todoObj.save();
    return res.send({
      status: 200,
      message: "Todo Entered Successfully",
      data: userDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
});

//Read todo
app.get("/read-todo", isAuth, async (req, res) => {
  console.log(req.session);
  const username = req.session.user.username;
  const SKIP = parseInt(req.query.skip) || 0;
  console.log(SKIP);
  try {
    // const todoDb = await todoModel.find({ username });
     
    const todoDb = await todoModel.aggregate([
      {
        $match: {username: username},
      },
      {
        $skip: SKIP,
      },
      {
        $limit: 5,
      }
    ])
    console.log(todoDb);

    if (todoDb.length === 0) {
      return res.send({
        status: 203,
        message: "No todo found.",
      });
    }

    return res.send({
      status: 200,
      message: "Todo Read Successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
});

//Edit todo
app.post("/edit-todo", isAuth, async (req, res) => {
  console.log(req.body,"request body edit todo");
  const newTodo = req.body.newTodo;
  const todo_id = req.body.todo_id;
  const usernameReq = req.session.user.username;

  //New Todo Data Validation
  try {
    await todoDataValidation({ todo: newTodo });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  try {
    const todoDb = await todoModel.findOne({ _id: todo_id });

    //Find the todo
    if (!todoDb) {
      return res.send({
        status: 400,
        message: "Todo not found",
      });
    }

    //Check Ownership of Todo
    if (todoDb.username !== usernameReq) {
      return res.send({
        status: 403,
        message: "Not allowed to edit the todo",
      });
    }

    //Edit todo
    const todoDbEdit = await todoModel.findOneAndUpdate(
      { _id: todo_id },
      { todo: newTodo }
    );

    return res.send({
      status: 200,
      message: "Todo Update Successfully",
      data: todoDbEdit,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server error",
      error: error,
    });
  }
});

//Delete todo
app.post("/delete-todo", isAuth, async (req,res)=>{
  console.log(req.body);
  const todo_id = req.body.todo_id;
  const usernameReq = req.session.user.username;

  try {
    const todoDb = await todoModel.findOne({ _id: todo_id });

    //Find the todo
    if (!todoDb) {
      return res.send({
        status: 400,
        message: "Todo not found",
      });
    }

    //Check Ownership of Todo
    if (todoDb.username !== usernameReq) {
      return res.send({
        status: 403,
        message: "Not allowed to delete the todo",
      });
    }

    //Delete todo
    const todoDbDelete = await todoModel.findOneAndDelete(
      { _id: todo_id },
    );

    return res.send({
      status: 200,
      message: "Todo Deleted Successfully",
      data: todoDbDelete,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server error",
      error: error,
    });
  }
});

app.listen(PORT, (req, res) => {
  console.log(`Server is running on PORT:` + `http://localhost:${PORT}`);
});
