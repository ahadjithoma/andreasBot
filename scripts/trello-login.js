var trello = require('node-trello');
var bcrypt = require('bcryptjs');
var db = require('./mlab-login.js').db();

db.bind('trelloTokens');
db.trelloTokens.find().toArrayAsync()
.then(function(records){
    let length = Object.keys(records).length; 
    let i = 0;
    for (i=0; i<length; i++){
        console.log(records[i].id);
    }
})
.catch(error => {
    console.log(error)
})
