const express = require("express");
const app = express();
require("dotenv").config();

const cors = require("cors");
const bodyParser = require("body-parser");
var crypto = require("crypto");
const html = require("./tagSchema");
const users = require("./userSchema");
const posts = require("./postSchema");
const quiz = require("./quizSchema");
const TagsObj = require("./tagsObject");
const quizOBJ = require("./quizObject");

app.use(cors());
app.use(express.json());

const heroku = process.env.MONGODB;

//new connection to no SQL Mongo DB
const mongo = require("mongodb").MongoClient;
const herokuURL = process.env.MONGODB;
const localURL = process.env.myConnection;
const mongoose = require("mongoose");
const { response } = require("express");

mongoose
  .connect(herokuURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => console.log("connected to Mongose"))
  .catch((error) => console.log(error));

app.get("/resample", (req, res) => {
  html
    .insertMany(TagsObj)
    .then(function () {
      console.log("Data inserted"); // Success
      res.send(TagsObj);
    })
    .catch(function (error) {
      console.log(error); // Failure
    });
});

app.get("/", (req, res) => {
  res.send("welcome to HTML tutorial backend");
});

app.get("/home", async (req, res) => {
  try {
    const justTags = await html.find({});
    res.json(justTags);
  } catch (err) {
    console.log(err);
  }
});

app.get("/home/:tag", async (req, res) => {
  const tag = req.params.tag;
  var query = { tagName: tag };
  try {
    const find = await html.find(query).exec();
    res.json(find);
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  var user = req.body.user;
  var userPassword = req.body.userPassword;
  var email = req.body.email;

  var encript = crypto.createCipher("aes-128-cbc", "mypassword");
  var pw = encript.update(userPassword, "utf8", "hex");
  pw += encript.final("hex");

  var obj = { userName: user, userPwd: pw, userEmail: email };

  const createAccount = new users(obj);

  try {
    await createAccount.save();
    res.send("Account created!");
  } catch (error) {
    console.log(error);
    res.send("Something went wrong");
  }
});

app.post("/enter", async (req, res) => {
  var email = req.body.Email;
  var userPassword = req.body.Password;

  var encript = crypto.createCipher("aes-128-cbc", "mypassword");
  var encrypted = encript.update(userPassword, "utf8", "hex");
  encrypted += encript.final("hex");

  var decript = crypto.createDecipher("aes-128-cbc", "mypassword");
  var decripted = decript.update(encrypted, "hex", "utf8");
  decripted += decript.final("utf8");

  var person = { userPwd: encrypted, userEmail: email };

  try {
    const q = await users.find(person, "userName _id").exec();
    res.json(q);
  } catch (error) {
    console.log(error);
  }
});

app.post("/addpost", async (req, res) => {
  var question = req.body;
  const ask = new posts(question);
  try {
    await ask.save();
    res.send("posted");
  } catch (error) {
    console.log(error);
  }
});

app.get("/getquiz", async (req, res) => {
  const aquiz = await quiz.find({});
  try {
    res.json(aquiz);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.post("/resamplequiz", (req, res) => {
  try {
    quiz.create(quizOBJ);
    console.log("Data inserted"); // Success
    res.json(quizOBJ);
  } catch (error) {
    console.log(error);
  }
});

app.post("/findposts", async (req, res) => {
  const query = req.body.search;
  const findings = await posts.find({
    postQuestion: { $regex: ".*" + query + ".*", $options: "i" },
  });
  try {
    res.json(findings);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.get("/getposts", async (req, res) => {
  const communityPost = await posts.find({});
  try {
    res.json(communityPost);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.get("/getuserposts/:authorID", async (req, res) => {
  const communityPost = await posts.find({ postAuthorID: req.params.authorID });
  try {
    res.json(communityPost);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
});

app.get("/myanswers/:id", async (req, res) => {
  try {
    const filtered = [];
    const query = await posts.find({}, "postAnswer");
    var map = query.map((x) =>
      x.postAnswer.map((y) => {
        if (y.userID == req.params.id) {
          filtered.push({
            postID: x._id,
            commentID: y._id,
            userID: y.userID,
            user: y.user,
            answer: y.answer,
            date: y.answerDate,
          });
        }
      })
    );

    res.json(filtered);
  } catch (error) {
    res.send(error);
  }
});

app.delete("/deletecomment/:id/:commentID", async (req, res) => {
  console.log(req.params.id, "comment ", req.params.commentID);

  try {
    await posts.updateOne(
      { _id: req.params.commentID },
      { $pull: { postAnswer: { _id: req.params.id } } }
    );
    res.send("deleted");
  } catch (error) {
    console.log(error);
  }
});

app.delete("/deletequestion/:authorID", async (req, res) => {
  console.log("author ", req.params.authorID);

  try {
    await posts.findByIdAndRemove({ _id: req.params.authorID });
    res.send("deleted");
  } catch (error) {
    console.log(error);
  }
});

app.post("/replypost", async (req, res) => {
  console.log(req.body);
  var obj = {
    userID: req.body.userID,
    user: req.body.user,
    answer: req.body.message,
    answerDate: req.body.answerDate,
    code: req.body.code,
  };

  try {
    console.log(obj);
    await posts.findOne({ _id: req.body.id }).then(function (comment) {
      comment.postAnswer.push(obj);
      comment.save();
      // res.json(comment);
      res.send("comment posted");
    });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port: 5000 ${heroku}`);
});
