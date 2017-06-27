var Trello = require('node-trello');
var bcrypt = require('bcryptjs');
var db = require('./mlab-login.js').db();

var trello = {};

db.bind('trelloTokens');
db.trelloTokens.find().toArrayAsync()
    .then(function (records) {
        let length = Object.keys(records).length;
        let i = 0;
        for (i = 0; i < length; i++) {
            bcrypt.compare('', records[i].token).then(function (res) {
                console.log(res);
            });

        }
    })
    .catch(error => {
        console.log(error)
    })
