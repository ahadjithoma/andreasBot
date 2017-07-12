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


    const tokenConfig = {};

    // Get the access token object for the client
    oauth2.clientCredentials.getToken(tokenConfig, (error, result) => {
        if (error) {
            return robot.logger.error('Access Token Error', error.message);
        }

        const token = oauth2.accessToken.create(result);
        robot.logger.info(token)
    });

}