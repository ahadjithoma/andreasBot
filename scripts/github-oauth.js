module.exports = function (robot) {
    var encryption = require('./encryption.js');

    var client_id = process.env.GITHUB_APP_CLIENT_ID;
    var client_secret = process.env.GITHUB_APP_CLIENT_SECRET;
    var hostUrl = 'http://github.com/login/oauth/authorize';
    var authorization_base_url = 'https://github.com/login/oauth/authorize'
    var token_url = 'https://github.com/login/oauth/access_token'

    /* oauth*/
    /**************************************************************************************/
    var oauth = require("oauth").OAuth2;
    var OAuth2 = new oauth(
        client_id,
        client_secret,
        "https://github.com/",
        "login/oauth/authorize",
        "login/oauth/access_token");

    robot.hear('gh oauth', function (res) {
        res.send('https://andreasbot.herokuapp.com/auth/github');
    })

    robot.router.get('/auth/github', function (req, res) {
        res.writeHead(303, {
            Location: OAuth2.getAuthorizeUrl({
                redirect_uri: 'https://andreasbot.herokuapp.com/auth/github/callback',
                scope: "user,repo,gist"
            })
        });
        res.end();
    });

    robot.router.get('/auth/github/callback', function (req, res) {
        var code = req.query.code;
        console.log("code: " + code + "\n");

        OAuth2.getOAuthAccessToken(code, {}, function (err, access_token) {
            if (err) {
                console.log(err);
            }
            console.log("AccessToken: " + access_token + "\n");
            var encryptedToken = encryption.encrypt(access_token);

            // SAVE TOKEN TO DB based on user ID 

        });
        res.redirect('');
    });

}