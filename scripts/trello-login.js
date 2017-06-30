
var Trello = require('node-trello');
var encryption = require('./encryption.js');
var Promise = require("bluebird");
var q = require('q')
var key = process.env.HUBOT_TRELLO_KEY; // get it from https://trello.com/app-key

module.exports.trelloLogin = function (userId) {
        var deferred = q.defer();

        // connect to mLab database
        var db = require('./mlab-login.js').db();
        // bind trelloTokens collection
        db.bind('trelloTokens');

        db.trelloTokens.findOne({ id: userId },function (dbError, dbData) {
            if (dbError) {
                console.log(dbError);
                deferred.reject(dbError);
            } else {
                console.log(dbData)
                var decryptedToken = dbData[0].token;
                let token = encryption.decrypt(decryptedToken);
                let userId = dbData[0].id;
                let username = dbData[0].username;
                let t = new Trello(key, token);
                var trello = Promise.promisifyAll(t);
                deferred.resolve(trello);
            }
        })
        // return the promise
        return deferred.promise; 
    }
