var Trello = require('node-trello');
var encryption = require('./encryption.js');
var db = require('./mlab-login.js').db();
var Promise = require("bluebird");

var key = process.env.HUBOT_TRELLO_KEY;
var trello = {};
var tP = {};

db.bind('trelloTokens');
db.trelloTokens.find().toArrayAsync()
    .then(function (records) {
        let length = Object.keys(records).length;
        let i = 0;
        for (i = 0; i < length; i++) {
            let token = encryption.decrypt(records[i].token);
            let userId = records[i].id;
            trello[userId] = new Trello(key, token)
            tP[userId] = Promise.promisifyAll(trello[userId])
            trello[userId].get('/1/members/me', function (err, data) {
                if (err) throw err;
                console.log(data);
            })
        }
    })
    .catch(error => {
        console.log(error)
    })

module.exports = tP
