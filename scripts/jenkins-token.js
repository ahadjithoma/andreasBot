'use strict'

// init
var mongo = require('mongoskin');
var encryption = require('./encryption.js');
var cache = require('./cache.js').getCache()

// config
var mongodb_uri = process.env.MONGODB_URI

module.exports = robot => {
    robot.on('getJenkinsToken', function (data, res) {
        getJenkinsToken(res)
    })

    robot.on('setJenkinsToken', function (data, res) {
        var token = data.parameters.token;
        setJenkinsToken(token, res);
    })


    function getJenkinsToken(res) {
        var userId = res.message.user.id;
        var url = process.env.JENKINS_URL + '/me/configure'
        var msg = `Please <${url}|login> to your Jenkins account and provide me the API Token here`
        msg += ' by telling me something like `jenkins token "YOUR_TOKEN"` (quotation marks included).'
        msg += `\nAfter that, i will encrypt and store it somewhere safe for later use :slightly_smiling_face:`
        robot.messageRoom(userId, msg)
    }

    function setJenkinsToken(token, res) {
        var userId = res.message.user.id;
        var jenkins_username = null //TODO // maybe not needed

        var values = {
            jenkins_token: token,
            jenkins_username: jenkins_username
        }
        cache.set(userId, values)
        encryption.encrypt(token)
            .then(encryptedToken => {
                //TODO find jenkins username and store it
                var c = require('./config.json');

                var db = mongo.MongoClient.connect(mongodb_uri);
                db.bind('users');
                db.users.findAndModifyAsync(
                    { _id: userId },
                    [["_id", 1]],
                    { $set: { jenkins_token: encryptedToken } },
                    { upsert: true })
                    .then(res => {
                        robot.messageRoom(userId, c.tokenAddedMessage)
                        db.close();
                    }).catch(err => {//TODO better error handling
                        robot.messageRoom(userId, c.errorMessage)
                        robot.logger.error(err);
                        db.close();
                    })

            })
            .catch(encryptionError => {
                //TODO
            })

    }
}