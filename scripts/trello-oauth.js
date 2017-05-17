module.exports = function(robot) {

  robot.respond(/trello/i, function(res_r) {
    
    var express = require('express');
     
    var http = require('http')
    var OAuth = require('oauth').OAuth
    var url = require('url')

    /*
    /     Express Server Setup
    */
    var app = express();

    app.use(express.static('public'));


    var server = app.listen("/hubot/trello-oauth");
    // var server = app.listen(3000, function () {
    //   console.log('Server up and running...🏃🏃');
    //   console.log("Listening on port %s", server.address().port);
    // });

    /*
    /     OAuth Setup and Functions
    */
    const requestURL = "https://trello.com/1/OAuthGetRequestToken";
    const accessURL = "https://trello.com/1/OAuthGetAccessToken";
    const authorizeURL = "https://trello.com/1/OAuthAuthorizeToken";
    const appName = "anbot team";

    // Be sure to include your key and secret in 🗝.env ↖️ over there.
    // You can get your key and secret from Trello at: https://trello.com/app-key
    const key = process.env.HUBOT_TRELLO_KEY;
    //const token = process.env.HUBOT_TRELLO_TOKEN;
    const secret = process.env.HUBOT_TRELLO_OAUTH;

    // Trello redirects the user here after authentication
    const loginCallback = "https://andreasbot.herokuapp.com/hubot/trello-oauth";

    // You should {"token": "tokenSecret"} pairs in a real application
    // Storage should be more permanent (redis would be a good choice)
    const oauth_secrets = {};

    const oauth = new OAuth(requestURL, accessURL, key, secret, "1.0A", loginCallback, "HMAC-SHA1")

    const login = function(req, res) {
      oauth.getOAuthRequestToken(function(error, token, tokenSecret, results){
        // console.log(`in getOAuthRequestToken - token: ${token}, tokenSecret: ${tokenSecret}, resultes ${JSON.stringify(results)}, error: ${JSON.stringify(error)}`);
        oauth_secrets[token] = tokenSecret;
        res.redirect(`${authorizeURL}?oauth_token=${token}&name=${appName}`);
      });
    };

    var callback = function(request, response) {
      const query = url.parse(request.url, true).query;
      const token = query.oauth_token;
      const tokenSecret = oauth_secrets[token];
      const verifier = query.oauth_verifier;
      oauth.getOAuthAccessToken(token, tokenSecret, verifier, function(error, accessToken, accessTokenSecret, results){
        // In a real app, the accessToken and accessTokenSecret should be stored
        console.log(`in getOAuthAccessToken - accessToken: ${accessToken}, accessTokenSecret: ${accessTokenSecret}, error: ${error}`);
        oauth.getProtectedResource("https://api.trello.com/1/members/me", "GET", accessToken, accessTokenSecret, function(error, data, response){
          // Now we can respond with data to show that we have access to your Trello account via OAuth
          console.log(`in getProtectedResource - accessToken: ${accessToken}, accessTokenSecret: ${accessTokenSecret}`);
          response.send(data)
        });
      });
    };


    /*
    /     Routes
    */
    
    res_r.send("localhost:3000");

    // app.get("/", function (request, response) {
    //   console.log(`GET '/' 🤠 ${Date()}`);
    //   response.send("<h1>Oh, hello there!</h1><a href='./login'>Login with OAuth!</a>");
    // });

    app.get("/", function (request, response) {
      console.log(`GET '/' ${Date()}`);
      login(request, response);
    });

    app.get("/callback", function (request, response) {
      console.log(`GET '/callback' ${Date()}`);
      callback(request, response);
    });

  })
}