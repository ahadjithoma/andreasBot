module.exports = function (robot) {
    var encryption = require('./encryption.js');

    var client_id = process.env.GITHUB_APP_CLIENT_ID;
    var client_secret = process.env.GITHUB_APP_CLIENT_SECRET;
    var hostUrl = 'http://github.com/login/oauth/authorize';
    var authorization_base_url = 'https://github.com/login/oauth/authorize'
    var token_url = 'https://github.com/login/oauth/access_token'

    var oauth = require("oauth").OAuth2;
    var OAuth2 = new oauth(
        client_id,
        client_secret,
        "https://github.com/",
        "login/oauth/authorize",
        "login/oauth/access_token");

    robot.hear('gh oauth', function (res) {
        var userId = res.message.user.id;
        var username = res.message.user.name;
        res.send(`<https://andreasbot.herokuapp.com/auth/github?userid=${userId}&username=${username}|login>`);
    })

    robot.router.get('/auth/github', function (req, res) {
        // get the user id and pass it through 'state' for later use
        var state = JSON.stringify({
            userid: req.query.userid,
            username: req.query.username
        });

        res.writeHead(303, {
            Location: OAuth2.getAuthorizeUrl({
                redirect_uri: 'https://andreasbot.herokuapp.com/auth/github/callback',
                scope: "all",//"user,repo,gist",
                state: state
            })
        });
        res.end();
    });

    robot.router.get('/auth/github/callback', function (req, res) {
        var userid = JSON.parse(req.query.state).userid;
        var username = JSON.parse(req.query.state).username;

        var code = req.query.code;

        OAuth2.getOAuthAccessToken(code, {}, function (err, access_token) {
            if (err) {
                console.log(err);
            }
            var encryptedToken = encryption.encrypt(access_token);

            var db = require('./mlab-login.js').db();
            db.bind('users')
            db.users.save({ _id: userid, github_token: encryptedToken }, function (err, result) {
                if (err) throw err;
                robot.logger.info(`github token for user: ${username} received successfully`)
            })

        });
        res.redirect('');
    });

}