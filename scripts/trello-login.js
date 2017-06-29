
module.exports = {
    trello: function () {
        var Trello = require('node-trello');
        var encryption = require('./encryption.js');
        var Promise = require("bluebird");
        var key = process.env.HUBOT_TRELLO_KEY;
        var mongo = require('mongoskin');
        var Promise = require("bluebird");
        var q = require('q')
        var deferred = q.defer();

        // mLab connection URI
        var uri = process.env.MONGODB_URI;

        // promisify mongoskin with bluebird
        Object.keys(mongo).forEach(function (key) {
            var value = mongo[key];
            if (typeof value === "function") {
                Promise.promisifyAll(value);
                Promise.promisifyAll(value.prototype);
            }
        });
        Promise.promisifyAll(mongo);

        // connect to mLab database
        var db = mongo.MongoClient.connect(uri);

        db.bind('trelloTokens');
        db.trelloTokens.find({ is: userId }).toArrayAsync()
            .then(function (dbData) {
                let token = encryption.decrypt(dbData.token);
                let userId = dbData.id;
                let username = dbData.username;
                let t = new Trello(key, token);
                var trello = Promise.promisifyAll(t);
                deferred.resolve(trello);
                // in some way CHECK TOKEN VALIDATION
            })
            .catch(dbError => {
                console.log(dbError)
                deferred.reject(dbError);

            })
        return deferred.promise;
    }
}