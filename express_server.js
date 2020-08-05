const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(cookieParser());

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

const generateRandomString = () => {
  return Math.random().toString(36).substring(7);
};

const checkEmail = (email) => {
  for (const user in users) {
    if (users[user].email === email) {
      return users[user];
    }
  }
  return false;
};

const urlsForUser = (id) => {
  let result = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      result[url] = urlDatabase[url];
    }
  }
  return result;
};

const formatHTTP = function(address) {
  if (!address.match(/^http/))
    address = `http://${address}`;
  return address;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls", (req, res) => {
  if (!req.cookies['user_id']) {
    res.redirect('/login');
  } else {
    let templateVars = {
      user: users[req.cookies['user_id']],
      urls: urlsForUser(req.cookies['user_id'])
    };
    res.render("urls_index", templateVars);
  }
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls/new", (req, res) => {
  if (!req.cookies['user_id']) {
    res.redirect('/login');
  } else {
    let templateVars = {
      user: users[req.cookies['user_id']]
    };
    res.render("urls_new", templateVars);
  }
});

app.get("/register", (req, res) => {
  let templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render("register", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    user: users[req.cookies['user_id']],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/login", (req, res) => {
  let templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render("login", templateVars);
});

app.post("/urls", (req, res) => {
  let formattedHTTP = formatHTTP(req.body.longURL);
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: formattedHTTP,
    userID: req.cookies['user_id']
  };
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === req.cookies['user_id']) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect('/urls');
});

app.post("/urls/:shortURL/edit", (req, res) => {
  res.redirect(`/urls/${req.params.shortURL}`);
});

app.post("/urls/:shortURL/update", (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === req.cookies['user_id']) {
    let formattedHTTP = formatHTTP(req.body.longURL);
    urlDatabase[req.params.shortURL].longURL = formattedHTTP;
  }
  res.redirect('/urls');
});

app.post("/login", (req, res) => {
  let user = checkEmail(req.body.email);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
    res.status(403).redirect('/login');
  } else {
    res.cookie('user_id', user.id);
    res.redirect('/urls');
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.post("/register", (req, res) => {
  if (checkEmail(req.body.email) || req.body.email === "" || req.body.password === "") {
    res.status(400).redirect('/register');
  } else {
    let userId = generateRandomString();
    users[userId] = {
      id: userId,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    res.cookie('user_id', userId);
    res.redirect('/urls');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});