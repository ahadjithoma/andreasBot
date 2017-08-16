'use strict'

// init
var mongo = require('mongoskin');
var encryption = require('./encryption.js');
var cache = require('./cache.js').getCache()

// config
var mongodb_uri = process.env.MONGODB_URI

module.exports = robot => {

    robot.respond(/jenkins token (.*)/i, function (res) {
        var token = res.match[1]
        storeJenkinsToken(token, res);
    })

    robot.respond(/jenkins username (.*)/i, function (res) {
        var username = res.match[1]
        storeJenkinsUsername(username, res);
    })

    var r = new RegExp("^(?=.*\bjenkins\b)(?=.*\blogin).*$","i")
    robot.respond(/(?=.*\bjenkins\b)(?=.*\blogin).*$/i, function (res) {
        getJenkinsToken(res)
    })

    robot.respond(/(jenkins\b)(login\b)/,function(res){
        console.log(res.match[0])
    })


    robot.on('jenkinsLogin', function (data, res) {
        getJenkinsToken(res)
    })

    function getJenkinsToken(res) {
        var userId = res.message.user.id;
        var url = process.env.JENKINS_URL + '/me/configure'
        var msg = `Please <${url}|login> to your Jenkins account and provide me your API Token (or password) and username here`
        msg += ' by telling me something like `jenkins token <YOUR_TOKEN>` and `jenkins username <YOUR_USERNAME>`.'
        msg += `\nAfter that, i will encrypt them and store them somewhere safe for later use :slightly_smiling_face:`
        robot.messageRoom(userId, msg)
    }

    function storeJenkinsToken(token, res) {
        var userId = res.message.user.id;

        var values = {
            jenkins_token: token
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

    function storeJenkinsUsername(username, res) {
        var userId = res.message.user.id;

        var values = {
            jenkins_username: username
        }
        cache.set(userId, values)

        //TODO find jenkins username and store it
        var c = require('./config.json');

        var db = mongo.MongoClient.connect(mongodb_uri);
        db.bind('users');
        db.users.findAndModifyAsync(
            { _id: userId },
            [["_id", 1]],
            { $set: values },
            { upsert: true })
            .then(res => {
                robot.messageRoom(userId, 'jenkins username succesfully received!')
                db.close();
            }).catch(err => {//TODO better error handling
                robot.messageRoom(userId, c.errorMessage)
                robot.logger.error(err);
                db.close();
            })
    }


}