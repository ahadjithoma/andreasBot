module.exports = function (robot) {
    var client_id = process.env.GITHUB_APP_CLIENT_ID;
    var client_secret = process.env.GITHUB_APP_CLIENT_SECRET;
    var hostUrl = 'http://github.com/login/oauth/authorize';
    var authorization_base_url = 'https://github.com/login/oauth/authorize'
    var token_url = 'https://github.com/login/oauth/access_token'

    /* mine */
    /**************************************************************************************/
    // https://github.com/login/oauth/authorize?scope=user:email&client_id=Iv1.c499866501901223
    // var scopes = 'user:email'
    // var url = authorization_base_url + `?scope=${scopes}&client_id=${client_id}`;
    // robot.messageRoom('andreas_h92', url);

    // robot.router.get('/', function (req, res) {
    // })

    /* oauth*/
    /**************************************************************************************/
    var oauth = require("oauth").OAuth2;
    var OAuth2 = new oauth(
        client_id,
        client_secret,
        "https://github.com/",
        "login/oauth/authorize",
        "login/oauth/access_token");

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
            accessToken = access_token;
            console.log("AccessToken: " + accessToken + "\n");
            // SAVE TOKEN TO DB
        });
        res.redirect('');
    });

    /* github-oauth - NOT WORKING */
    /**************************************************************************************/
    // var githubOAuth = require('github-oauth')({
    //     githubClient: client_id,
    //     githubSecret: client_secret,
    //     baseURL: 'https://andreasbot.herokuapp.com',
    //     loginURI: '/login',
    //     callbackURI: '/callback',
    //     scope: 'user' // optional, default scope is set to user
    // })

    // robot.router.get('/login/', function (req, res) {
    //     robot.logger.info(res);
    //     robot.logger.warning(req)
    //     return githubOAuth.login(req, res)

    // })
    // robot.router.get('/callback/', function (req, res) {
    //     robot.logger.info(res);
    //     robot.logger.warning(req)
    //     return githubOAuth.callback(req, res)
    // })

    // githubOAuth.on('error', function (err) {
    //     console.error('there was a login error', err)
    // })

    // githubOAuth.on('token', function (token, serverResponse) {
    //     console.log('here is your shiny new github oauth token', token)
    //     serverResponse.end(JSON.stringify(token))
    // })

    /* SIMPLE_OAUTH2 */
    /**************************************************************************************/
    // // Set the configuration settings
    // const credentials = {
    //     client: {
    //         id: client_id,
    //         secret: client_secret
    //     },
    //     auth: {
    //         tokenHost: "http://github.com/login/oauth/authorize"
    //     }
    // };

    // // Initialize the OAuth2 Library
    // const oauth2 = require('simple-oauth2').create(credentials);

    // // Authorization oauth2 URI
    // const authorizationUri = oauth2.authorizationCode.authorizeURL({
    //     redirect_uri: 'https://andreasbot.herokuapp.com/hubot/github-oauth',
    //     scope: 'repos',
    //     state: 'state'
    // });

    // // Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
    // robot.logger.info(authorizationUri);

    // // Get the access token object (the authorization code is given from the previous step).
    // const tokenConfig = {
    //     code: '<code>',
    //     redirect_uri: 'https://andreasbot.herokuapp.com/hubot/github-oauth'
    // };

    // // Callbacks
    // // Save the access token
    // oauth2.authorizationCode.getToken(tokenConfig, (error, result) => {
    //     if (error) {
    //         return robot.logger.error('Access Token Error', error.message);
    //     }

    //     const token = oauth2.accessToken.create(result);
    //     robot.logger.info(token);
    // });

}