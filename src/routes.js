const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const middleware = require("./middleware");
const database = require("./db");

router.get("/", (req, res) => {
  res.send("The API service works!");
});

//getting users
router.get("/users", (req, res) => {
  database((db) =>
    db.query(`SELECT * FROM users`, (err, result) => {
      if (err) console.log(err);
      res.json(result);
    })
  );
});

router.get("/tvseries", (req, res) => {
  database((db) =>
    db.query(`SELECT * FROM tv_series`, (err, result) => {
      if (err) console.log(err);
      res.json(result);
    })
  );
});

router.get("/tvseries/:id", (req, res) => {
  database((db) =>
    db.query(
      `SELECT * FROM tv_series WHERE id = ${mysql.escape(req.params.id)} `,
      (err, result) => {
        if (err) console.log(err);
        res.json(result);
      }
    )
  );
});

router.post("/addtvseries", (req, res) => {
  if (
    req.body.title &&
    req.body.creator &&
    req.body.premiere &&
    req.body.poster &&
    req.body.wallpaper &&
    req.body.description &&
    req.body.network
  ) {
    database((db) =>
      db.query(
        `INSERT INTO tv_series (title, creator, premiere, poster, wallpaper, description, network) VALUES (
        ${mysql.escape(req.body.title)},
        ${mysql.escape(req.body.creator)},
        ${mysql.escape(req.body.premiere)},
        ${mysql.escape(req.body.poster)},
        ${mysql.escape(req.body.wallpaper)},
        ${mysql.escape(req.body.description)},
        ${mysql.escape(req.body.network)}
      )`,
        (err, result) => {
          if (err) {
            console.log(err);
            return res
              .status(400)
              .json({ msg: "Server error adding new TV Show" });
          } else {
            console.log(result);
            return res
              .status(201)
              .json({ msg: `TV Show ${req.body.title} succesfully added!` });
          }
        }
      )
    );
  } else {
    return res.status(400).json({ msg: "Passed values are incorrect" });
  }
});

//POST to add new users to db (register)
router.post("/register", middleware.userValidation, (req, res) => {
  const email = req.body.email;
  database((db) =>
    db.query(
      `SELECT * FROM users WHERE email = ${mysql.escape(email)}`,
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(400)
            .json({ msg: "Internal server error checking email validity" });
        } else if (result.length !== 0) {
          return res
            .status(400)
            .json({ msg: "This email already registered!" });
        } else {
          bcrypt.hash(req.body.password, 7, (err, hash) => {
            if (err) {
              console.log(err);
              return res
                .status(400)
                .json({ msg: "Internal server error hashing email details" });
            } else {
              db.query(
                `INSERT INTO users (email, password, username) VALUES (
                ${mysql.escape(email)},
               ${mysql.escape(hash)},
               'anonymous'
               )`,
                (err, result) => {
                  if (err) {
                    console.log(err);
                    return res.status(400).json({
                      msg: "Internal server error saving your details",
                    });
                  } else {
                    return res
                      .status(201)
                      .json({ msg: "User has been succesfully registered" });
                  }
                }
              );
            }
          });
        }
      }
    )
  );
});

//POST for login (jwt token expires in 7 days)
router.post("/login", middleware.userValidation, (req, res) => {
  const email = req.body.email;
  database((db) =>
    db.query(
      `SELECT * FROM users WHERE email = ${mysql.escape(email)}`,
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(400)
            .json({ msg: "Internal server error gathering user details" });
        } else if (result.length !== 1) {
          return res.status(400).json({
            msg:
              "The provided details are incorrect or the user does not exist",
          });
        } else {
          bcrypt.compare(
            req.body.password,
            result[0].password,
            (bErr, bResult) => {
              if (bErr || !bResult) {
                return res.status(400).json({
                  msg:
                    "The provided details are incorrect or the user does not exist",
                });
              } else if (bResult) {
                const token = jwt.sign(
                  {
                    userId: result[0].id,
                    email: result[0].email,
                  },
                  process.env.SECRET_KEY,
                  {
                    expiresIn: "7d",
                  }
                );

                return res.status(200).json({
                  msg: "Logged In",
                  token,
                  userData: {
                    userId: result[0].id,
                    email: result[0].email,
                  },
                });
              }
            }
          );
        }
      }
    )
  );
});

module.exports = router;
