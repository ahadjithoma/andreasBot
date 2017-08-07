var jwt = require('jsonwebtoken');
var fs = require('fs');

var cert = fs.readFileSync(__dirname + '/hubot-integration.2017-07-25.private-key.pem');  // get private key
var date = new Date();
var payload = {
    iat: Math.round(new Date().getTime() / 1000),
    exp: Math.round(new Date().getTime() / 1000) + (10 * 60),
    iss: '3559'
}

var token = jwt.sign(payload, cert, { algorithm: 'RS256' })

var GitHubApi = require("github");

const github = new GitHubApi({
    /* optional */
    // debug: true,
    protocol: "https",
    host: "api.github.com", // should be api.github.com for GitHub
    thPrefix: "/api/v3", // for some GHEs; none for GitHub
    headers: {
        "Accept": "application/vnd.github.machine-man-preview+json",
        "user-agent": "Hubot-GitHub" // GitHub is happy with a unique user agent
    },
    Promise: require('bluebird'),
    followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
    timeout: 5000
});
github.authenticate({
    "type": "integration",
    "token": token
})