const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const { getUserByEmail } = require('./helpers');
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ['boomer', 'humor'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

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
  if (!req.session['user_id']) {
    res.redirect('/login');
  } else {
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  let templateVars = {
    user: users[req.session['user_id']],
    urls: urlsForUser(req.session['user_id']),
    error: req.session['user_id'] ? "" : "Log in to see your URLs."
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (!req.session['user_id']) {
    res.redirect('/login');
  } else {
    let templateVars = {
      user: users[req.session['user_id']],
      error: ""
    };
    res.render("urls_new", templateVars);
  }
});

app.get("/register", (req, res) => {
  if (req.session['user_id']) {
    res.redirect('/urls');
  } else {
    let templateVars = {
      user: users[req.session['user_id']],
      error: ""
    };
    res.render("register", templateVars);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    user: users[req.session['user_id']],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL] ? urlDatabase[req.params.shortURL].longURL : "",
    error: urlDatabase[req.params.shortURL] ? "" : "Invalid tiny link."
  };
  if (!urlDatabase[req.params.shortURL]) {
    templateVars.error = "Invalid tiny link.";
  } else if (!req.session['user_id']) {
    templateVars.error = "User not logged in.";
  } else if (urlDatabase[req.params.shortURL].userID !== req.session['user_id']) {
    templateVars.error = "You do not own this URL!";
  }
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL] ? res.redirect(urlDatabase[req.params.shortURL].longURL) : res.status(404).send("<p>Invalid URL</p>");
});

app.get("/login", (req, res) => {
  if (req.session['user_id']) {
    res.redirect('/urls');
  } else {
    let templateVars = {
      user: users[req.session['user_id']],
      error: ""
    };
    res.render("login", templateVars);
  }
});

app.post("/urls", (req, res) => {
  if (req.session['user_id']) {
    let formattedHTTP = formatHTTP(req.body.longURL);
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: formattedHTTP,
      userID: req.session['user_id']
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.send("<p>User not logged in<p>");
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (!req.session['user_id']) {
    res.send("<p>User not logged in<p>");
  } else if (urlDatabase[req.params.shortURL].userID === req.session['user_id']) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.send("<p>You don't own this URL or it no longer exsits.");
  }
});

app.post("/urls/:shortURL/edit", (req, res) => {
  res.redirect(`/urls/${req.params.shortURL}`);
});

app.post("/urls/:shortURL/update", (req, res) => {
  if (!req.session['user_id']) {
    res.send("<p>User not logged in<p>");
  } else if (urlDatabase[req.params.shortURL].userID === req.session['user_id']) {
    let formattedHTTP = formatHTTP(req.body.longURL);
    urlDatabase[req.params.shortURL].longURL = formattedHTTP;
    res.redirect('/urls');
  } else {
    res.send("<p>You don't own this URL or it no longer exsits.");
  }
});

app.post("/login", (req, res) => {
  let user = getUserByEmail(req.body.email, users);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
    let templateVars = {
      user: users[req.session['user_id']],
      error: "User does not exist or incorrect password"
    };
    res.render("login", templateVars);
  } else {
    req.session['user_id'] = user.id;
    res.redirect('/urls');
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

app.post("/register", (req, res) => {
  if (getUserByEmail(req.body.email, users)) {
    let templateVars = {
      user: users[req.session['user_id']],
      error: "Email already taken."
    };
    res.render("register", templateVars);
  } else if (req.body.email === "" || req.body.password === "") {
    let templateVars = {
      user: users[req.session['user_id']],
      error: "Please fill in the both boxes."
    };
    res.render("register", templateVars);
  } else {
    let userId = generateRandomString();
    users[userId] = {
      id: userId,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session['user_id'] = userId;
    res.redirect('/urls');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});