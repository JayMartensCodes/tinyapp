// initial set up

const express = require("express");
const app = express();

// default port 8080

const PORT = 8080;

// encrypts the cookies and allows the app to parse cookies

const cookieSession = require('cookie-session');

// allows password hashing

const bcrypt = require('bcrypt');

// bringing in the helper function

const { getUserByEmail, urlsForUser, addVisitor, formatHTTP, generateRandomString } = require('./helpers');

// allows the app to parse the form data form POST requests

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

// needed so the app can parse the ejs files

app.set("view engine", "ejs");

// importing and setting up method override which allows me to make my app more RESTful through the use of PUTs and DELETEs

const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW", visits: [], uniqueVisitors: {} },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW", visits: [], uniqueVisitors: {} }
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

// home route, redirects to log in page if not logged in, or the urls page if logged in

app.get("/", (req, res) => {
  if (!req.session['user_id']) {
    res.redirect('/login');
  } else {
    res.redirect('/urls');
  }
});

// show the urls table based on the logged in user

app.get("/urls", (req, res) => {
  let templateVars = {
    user: users[req.session['user_id']],
    urls: urlsForUser(req.session['user_id'], urlDatabase),
    error: req.session['user_id'] ? "" : "Log in to see your URLs."
  };
  res.render("urls_index", templateVars);
});

// show the creating new url UI

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

// shows the register page

app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    let templateVars = {
      user: users[req.session['user_id']],
      error: ""
    };
    res.render("register", templateVars);
  }
});

// show the specific url pages with all the data

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    user: users[req.session['user_id']],
    url: urlDatabase[req.params.shortURL],
    shortURL: req.params.shortURL,
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

// track some analytics, then redirects to the corresponding url

app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    if (!req.session.visitor_id) {
      req.session.visitor_id = generateRandomString();
    }
    addVisitor(urlDatabase[req.params.shortURL], req.session.visitor_id);
    res.redirect(urlDatabase[req.params.shortURL].longURL);
  } else {
    res.status(404).send("<p>Invalid URL</p>");
  }
});

// shows the login page

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

// adds a new url to the urlDatabase object

app.post("/urls", (req, res) => {
  if (req.session['user_id']) {
    let formattedHTTP = formatHTTP(req.body.longURL);
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: formattedHTTP,
      userID: req.session['user_id'],
      visits: [],
      uniqueVisitors: {}
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.send("<p>User not logged in<p>");
  }
});

// deletes a url from the urlDatabase

app.delete("/urls/:shortURL/delete", (req, res) => {
  if (!req.session['user_id']) {
    res.send("<p>User not logged in<p>");
  } else if (urlDatabase[req.params.shortURL].userID === req.session['user_id']) {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.send("<p>You don't own this URL or it no longer exsits.");
  }
});

// redirect to the page that lets you edit the url

app.post("/urls/:shortURL/edit", (req, res) => {
  res.redirect(`/urls/${req.params.shortURL}`);
});

// Updates the url in urlDatabase

app.put("/urls/:shortURL/update", (req, res) => {
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

// checks the login logic then if all is correct, creates a session cookie and redirects you

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

// destroys all cookies

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

// checks if it's valid account information, then creates a new user

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

// opens up the connection

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});