var db = require('./mlab-login.js').db();
var bcryptjs = require('bcryptjs');


module.exports = function (robot) {

    // const myPlaintextPassword = 's0/\/\P4$$w0rD';
    // bcryptjs.genSalt(10, function (err, salt) {
    //     bcryptjs.hash(myPlaintextPassword, salt).then(function (hash) {
    //         var collection = db.collection('mynewcollection')
    //         collection.insertAsync({ name: "myName", surname: "mySurname", password: hash })
    //             .then(result => robot.logger.info(result))
    //             .catch(error => robot.logger.error(error));
    //     }).catch(error => robot.logger.error(error));
    // });

    // /*************/
    // var uri = "mongodb://heroku_r50swcv2:2r5i5c9nvmcqsab53d9sebl6k4@ds129532.mlab.com:29532/heroku_r50swcv2";//process.env.MONGOLAB_URI;
    // robot.respond(/pass (.*)/, function (res) {
    //     var password = res.match[1];




    //     var collection = db.collection('mynewcollection')
    //     collection.insertAsync({ name: "myName", surname: "mySurname", password: password })
    //         .then(result => robot.logger.info(result))
    //         .catch(error => robot.logger.error(error));
    // })

}