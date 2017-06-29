module.exports = function trelloLogin(userID) {

    var Trello = require('node-trello');
    var encryption = require('./encryption.js');
    var db = require('./mlab-login.js').db();
    var Promise = require("bluebird");

    var key = process.env.HUBOT_TRELLO_KEY;
    var trello = {};


    // db.bind('trelloTokens');
    // db.trelloTokens.find().toArrayAsync()
    //     .then(function (records) {
    //         let length = Object.keys(records).length;
    //         let i = 0;
    //         console.log(`lenght = ${length}`);
    //         for (i = 0; i < length; i++) {
    //             let token = encryption.decrypt(records[i].token);
    //             let userId = records[i].id;
    //             let username = records[i].username;
    //             let t = new Trello(key, token);
    //             trello[userId] = Promise.promisifyAll(t);
    //         }

    //     })
    //     .catch(error => {
    //         console.log(error)
    //     })

    var trello = {};

    db.bind('trelloTokens');
    db.trelloTokens.findOne({ id: userID }).toArray(function(err, data){
        
            let token = encryption.decrypt(data.token);
            let userId = data.id;
            let username = data.username;
            let t = new Trello(key, token);
            trello = Promise.promisifyAll(t);
      })

    // db.bind('trelloTokens');
    // db.trelloTokens.find({ id: userID }).toArrayAsync()
    //     .then(function (data) {
    //         let token = encryption.decrypt(data.token);
    //         let userId = data.id;
    //         let username = data.username;
    //         let t = new Trello(key, token);
    //         trello = Promise.promisifyAll(t);
    //     })
    //     .catch(error => {
    //         console.log(error)
    //     })
    return trello;
}
