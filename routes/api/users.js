const express = require("express");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();

// load input validation
const validateRegisterInput = require("../../validation/register");

// load keys
const keys = require("../../config/keys");

// load User model
const User = require("../../models/User");

// @route GET api/users/test
// @dsc Test user route
// @acces Public
router.get("/test", (req, res) => res.json({ msg: "Users works" }));

// @route POST api/users/register
// @dsc Register user
// @acces Public
router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  // check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = "Email already exists";
      return res.status(400).json(errors);
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: "200", //size
        r: "pg", //rating
        d: "mm" //default
      });
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        avatar,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => {
              res.json(user);
            })
            .catch(err => {
              console.log("Error thrown when saving user to DB: " + err);
            });
        });
      });
    }
  });
});

// @route POST api/users/login
// @dsc Login user / Return JWT token
// @acces Public
router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // find user by email
  User.findOne({ email }).then(user => {
    // check for user
    if (!user) {
      return res.status(404).json({
        email: "User not found"
      });
    }

    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // user found -> create jwt payload
        const payload = {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        };
        // sign the token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 3600
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res.status(400).json({
          password: "Password incorect"
        });
      }
    });
  });
});

// @route POST api/users/current
// @dsc Return current user
// @acces Private

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    });
  }
);

module.exports = router;
