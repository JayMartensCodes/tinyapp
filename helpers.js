// if no user has the given email, it returns false, otherwise it returns the user object

const getUserByEmail = (email, database) => {
  for (const user in database) {
    if (database[user].email === email) {
      return database[user];
    }
  }
  return undefined;
};

// returns a list of urls that the user owns

const urlsForUser = (id, urls) => {
  let result = {};
  for (const url in urls) {
    if (urls[url].userID === id) {
      result[url] = urls[url];
    }
  }
  return result;
};

// tracks all the visits and visitors everytime they go to a tinyapp link

const addVisitor = (url, visitorID) => {
  if (!visitorID) {
    return false;
  } else if (url.uniqueVisitors[visitorID]) {
    url.visits.push({
      timestamp: Date.now(),
      visitorID
    });
  } else {
    url.uniqueVisitors[visitorID] = visitorID;
    url.visits.push({
      timestamp: Date.now(),
      visitorID
    });
  }
};

// if http isn't infront of a link, it adds it (helps avoid redirect errors)

const formatHTTP = function(address) {
  if (!address.match(/^http/))
    address = `http://${address}`;
  return address;
};

const generateRandomString = () => {
  return Math.random().toString(36).substring(7);
};

module.exports = { getUserByEmail, urlsForUser, addVisitor, formatHTTP, generateRandomString };