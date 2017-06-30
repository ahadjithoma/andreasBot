
var Trello = require('node-trello');
var encryption = require('./encryption.js');
var Promise = require("bluebird");
var key = process.env.HUBOT_TRELLO_KEY;
var q = require('q')

module.exports = {
    trelloLogin: function (userId) {

        var deferred = q.defer();

        // connect to mLab database
        var db = require('./mlab-login.js').db();

        // bind trelloTokens collectioncollection
        db.bind('trelloTokens');

        // THIS WORKS
        // db.trelloTokens.find({ id: userId }).toArray(function (err, data) {
        //     if (err) throw err;
        //     console.log(data);
        // })
        // *************************

        db.trelloTokens.find({ id: userId }).toArray(function (dbError, dbData) {
            if (dbError) {
                console.log(dbError);
                deferred.reject(dbError);
            } else {
                console.log(dbData)
                var decryptedToken = dbData[0].token;
                console.log(decryptedToken);
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
}