module.exports = function (robot) {
    var client_id = process.env.GITHUB_APP_CLIENT_ID;
    var client_secret = process.env.GITHUB_APP_CLIENT_SECRET;
    var hostUrl = 'http://github.com/login/oauth/authorize';


    // Set the configuration settings
    const credentials = {
        client: {
            id: client_id,
            secret: client_secret
        },
        auth: {
            tokenHost: hostUrl
        }
    };

    // Initialize the OAuth2 Library
    const oauth2 = require('simple-oauth2').create(credentials);

    // Authorization oauth2 URI
    const authorizationUri = oauth2.authorizationCode.authorizeURL({
        redirect_uri: 'https://andreasbot.herokuapp.com/hubot/github-oauth',
        scope: 'repos',
        state: 'state'
    });

    // Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
    robot.logger.info(authorizationUri);

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