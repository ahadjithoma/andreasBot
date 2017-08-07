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
                scope: "read:org,user,public_repo,repo,repo_deployment,delete_repo,notifications,gist,read,write,admin",
                state: state
            }),
            'Accept': 'application/vnd.github.machine-man-preview+json'
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
            // TODO: Get github login user name as well 
            var db = require('./mlab-login.js').db();
            db.bind('users')
            db.users.findAndModify(
                { _id = userid },
                [["_id", 1]],
                { $set: { github_token: encryptedToken } },
                { upsert: true },
                function (err, result) {
                    if (err)
                        robot.logger.error(err);
                    if (result)
                        robot.logger.info(`${username}'s GitHub Token Added to DB!`)
                    db.close();
                })

        });
        res.redirect('');
    });

}