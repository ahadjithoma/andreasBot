
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

function db() {
    // connect to mLab database
    var dbObject = mongo.MongoClient.connect(uri);
    return dbObject;
}
module.exports.db = db();