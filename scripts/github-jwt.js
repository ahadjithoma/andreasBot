'use strict'

var jwt = require('jsonwebtoken')
var fs = require('fs')
var c = require('./config.json')
var path = require('path')
var request = require('request-promise')
var CronJob = require('cron').CronJob
var Promise = require('bluebird')
var mongoskin = require('mongoskin')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI
var appID = (process.env.GITHUB_APP_ID || c.GithubApp.AppId)
var db = mongoskin.MongoClient.connect(mongodb_uri)

module.exports = robot => {

    // generate a new token every 55 minutes. (Tokens expire after 60 minutes)
    var job = new CronJob('00 */55 * * * *',
        function () { generateJWToken() },
        function () { return null; }, /* This function is executed when the job stops */
        true, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );



    generateJWToken()

    robot.on('generateJWToken', () => {
        generateJWToken()
    })

    function generateJWToken() {
        // TODO
        var privateKeyDir = (c.GithubApp.privateKeyDir || process.env.GITHUB_KEY_DIR)
        var cert = fs.readFileSync(path.resolve(__dirname, c.GithubApp.privateKeyDir));  // the get private key
        // end of todo

        var date = new Date();
        var payload = {
            iat: Math.round(new Date().getTime() / 1000),
            exp: Math.round(new Date().getTime() / 1000) + (10 * 60),
            iss: appID
        }
        var JWToken = jwt.sign(payload, cert, { algorithm: 'RS256' })

        var options = {
            url: 'https://api.github.com/app/installations',
            headers: {
                Authorization: `Bearer ${JWToken}`,
                'Accept': 'application/vnd.github.machine-man-preview+json',
                'User-Agent': 'Hubot-integration'
            },
            json: true,
            // resolveWithFullResponse: true // Get the full response instead of just the body (DEFAULT: False)
        }

        request(options)
            .then(function (body) {
                var i = 0; //TODO
                var id = body[i].id
                generateInstallationToken(id, JWToken)
            })
            .catch(function (err) {
                console.log(err)
            });
    }

    function generateInstallationToken(id, JWToken) {
        var options = {
            method: 'POST',
            url: `https://api.github.com/installations/${id}/access_tokens`,
            headers: {
                Authorization: `Bearer ${JWToken}`,
                'Accept': 'application/vnd.github.machine-man-preview+json',
                'User-Agent': 'Hubot-integration'
            },
            json: true,
        }

        request(options)
            .then(function (res) {
                var token = res.token;
                storeToken(id, token)
                console.log('TOKEN: ', token)
            })
            .catch(function (err) {
                // print eror 
                console.log('ERROR: ', err)
            })
    }


    function storeToken(installation_id, token) {

        // var brainValue = {installation_id:token}
        robot.brain.set('GithubApp', token)

        var encryption = require('./encryption.js')
        encryption.encrypt(token)
            .then(encryptedToken => {
                db.bind('GithubApp')
                db.GithubApp.saveAsync({ _id: installation_id, token: encryptedToken })
                    .then(res => {
                        robot.logger.info(c.GithubApp.tokenStoredMsg)
                    })
                    .catch(dbError => {
                        robot.logger.error(dbError)
                        if (c.errorsChannel) {
                            robot.messageRoom(c.errorsChannel, c.errorMessage
                                + `Script: ${path.basename(__filename)}`)
                        }
                    })
            })
            .catch(encrError => {
                robot.logger.error(encrError)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + 'Script: ' + path.basename(__filename))
                }
            })
    }
}