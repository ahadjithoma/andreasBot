var trello = require('node-trello');
var bcrypt = require('bcryptjs');
var db = require('./mlab-login.js').db();

db.bind('trelloTokens');
db.trelloTokens.find().toArrayAsync()
.then(function(result){
    console.log(result);
})
.catch(error => {
    console.log(error)
})
