var mongo = require('mongoskin');
var Promise = require("bluebird");
// mLab connection URI
var uri = process.env.MONGODB_URI;
// promisify mongoskin with bluebird
// Object.keys(mongo).forEach(function (key) {
//     var value = mongo[key];
//     if (typeof value === "function") {
//         Promise.promisifyAll(value);
//         Promise.promisifyAll(value.prototype);
//     }
// });
// Promise.promisifyAll(mongo);


module.exports = function (userId) {
    var Trello = require('node-trello');
    var encryption = require('./encryption.js');
    var Promise = require("bluebird");
    var key = process.env.HUBOT_TRELLO_KEY;
    var q = require('q')
    var deferred = q.defer();


    // connect to mLab database
    var db = mongo.MongoClient.connect(uri);

    // var db = require('./mlab-login').db();
    // var collection = db.collection('trelloTokens');
    db.bind('trelloTokens');
    db.trelloTokens.find({id:userId},function(err,data){
        if (err) throw err;
        console.log(data.toArray());
    })
    // db.trelloTokens.find({ id: userId }).toArray(function (dbError, dbData) {
    //     if (dbError) {
    //         console.log(dbError);
    //         deferred.reject(dbError);
    //     } else {
    //         console.log(dbData)
    //         var decryptedToken = dbData[0].token;
    //         console.log(decryptedToken);
    //         let token = encryption.decrypt(decryptedToken);
    //         let userId = dbData[0].id;
    //         let username = dbData[0].username;
    //         let t = new Trello(key, token);
    //         var trello = Promise.promisifyAll(t);
    //         deferred.resolve(trello);
    //     }
    // })
    // return deferred.promise;
}
