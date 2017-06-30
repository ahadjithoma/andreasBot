
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

    db.trelloTokens.findOne({ id: userId }).then(dbData => {
        console.log(dbData)
        var decryptedToken = dbData.token;
        let token = encryption.decrypt(decryptedToken);
        let userId = dbData.id;
        let username = dbData.username;
        let t = new Trello(key, token);
        var trello = Promise.promisifyAll(t);
        deferred.resolve(trello);
    }).catch(dbError => {
        console.log(dbError);
        deferred.reject(dbError);
    })

    // return the promise
    return deferred.promise;
}
