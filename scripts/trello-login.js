var Trello = require('node-trello');
var encryption = require('./encryption.js');
var Promise = require("bluebird");
var key = process.env.HUBOT_TRELLO_KEY;
var trello = {};
var mongo = require('mongoskin');
var Promise = require("bluebird");

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
db.trelloTokens.find().toArrayAsync()
    .then(function (records) {
        let length = Object.keys(records).length;
        let i = 0;
        for (i = 0; i < length; i++) {
            let token = encryption.decrypt(records[i].token);
            let userId = records[i].id;
            let username = records[i].username;
            let t = new Trello(key, token);
            trello[userId] = Promise.promisifyAll(t);

            // in some way CHECK TOKEN VALIDATION
            trello[userId].getAsync('/1/tokens/' + token)
                .then(data => {
                    // console.log(data);
                })
                .catch(err => {
                    // DO SOMETHING TO RE-AUTH
                })
        }
    })
    .catch(error => {
        console.log(error)
    })

module.exports = trello;    
