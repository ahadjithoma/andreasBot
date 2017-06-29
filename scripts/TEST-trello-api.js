'use strict'

var trello = require("node-trello");
var q = require('q');
var rp = require('request-promise');
var Trello = require('node-trello');
var encryption = require('./encryption.js');

// auth
var key = process.env.HUBOT_TRELLO_KEY;
var token = process.env.HUBOT_TRELLO_TOKEN;

// var t = require('./trello-login.js');
var msg = require('./messages-info.js');
var encryption = require('./encryption.js');
var db = require('./mlab-login.js').db();


module.exports = function (robot) {


	function trelloLogin(userId) {
		var deferred = q.defer();
		db.bind('trelloTokens');
		db.trelloTokens.findOneAsync({ id: userId }).then(function (data) {

			deferred.resolve(new Trello(key, data.token))
		}).catch(function (err) {
			deferred.reject(err);
		})
		return deferred.promise;
	}

	// 	getBoard: function(id, pars, callback){
	//         var deferred = q.defer();
	//         t.get("/1/board/"+id, pars, function(err, data){
	// 			if (err) {
	//       		    deferred.reject(err);
	// 	        };
	//             deferred.resolve(data);
	// 	    });
	//         deferred.promise.nodeify(callback);
	// 	    return deferred.promise;
	// 	}



	// in some way CHECK TOKEN VALIDATION

	robot.hear('trello2login', function (res) {

		var t = require('./trello-login.js').trello();
		console.log(t);
	})

	robot.hear('trello login', function (res) {
		let userId = msg.getUserId(res);
		// robot.logger.info(trelloLogin(userId));
		trelloLogin(userId).then(trello => {
			robot.logger.info(trello);
		}).catch(err => {
			robot.logger.error(err);
		})
		// trelloLogin(userId).get('/1/members/me', function (err, data) {
		// 	if (err) {
		// 		res.send('error');
		// 		return 0;
		// 	}
		// 	res.send('not');
		// })


	})

	var encryption = require('./encryption.js');

	robot.hear('encrypt (.*)', function (res) {
		var str = res.match[1];
		var k = encryption.encrypt(str)
		res.send(k);
	})



	robot.hear('decrypt (.*)', function (res) {
		var str = res.match[1];
		var k = encryption.decrypt(str)
		res.send(k);
	})



}




// module.exports ={ 




//     /*******************************************************************/
//     /*                              BOARDS                             */
//     /*******************************************************************/

// 	getBoard: function(id, pars, callback){
//         var deferred = q.defer();
//         t.get("/1/board/"+id, pars, function(err, data){
// 			if (err) {
//       		    deferred.reject(err);
// 	        };
//             deferred.resolve(data);
// 	    });
//         deferred.promise.nodeify(callback);
// 	    return deferred.promise;
// 	},

//     /*******************************************************************/
//     /*                              MEMBERS                            */
//     /*******************************************************************/
// 	getMembers: function(id, pars, callback){
//         var deferred = q.defer();
// 	    t.get("/1/members/"+id, function(err, data) {
// 	        if (err) {
//       		    deferred.reject(err);
// 	        };
//             deferred.resolve(data);
// 	    });
//         deferred.promise.nodeify(callback);
// 	    return deferred.promise;
// 	},

//     /*******************************************************************/
//     /*                              LISTS                              */
//     /*******************************************************************/
// 	getList: function(id, pars, callback){
// 		var deferred = q.defer();
// 		t.get("1/lists/"+id, pars, function(err, data){
// 			if (err){
// 				deferred.reject(err);
// 			};
// 			deferred.resolve(data);
// 		});
// 		deferred.promise.nodeify(callback);
// 		return deferred.promise;
// 	},



//     /*******************************************************************/
//     /*                         TESTING PURPOSES                        */
//     /*******************************************************************/
// 	test: function(k){
// 		var k;
// 		k = t.get("1/board/BE7seI7e",'', function(err, data){
// 			if (err){
// 				k = err;
// 			};
// 			console.log(`cb: ${data}`);
// 			k = data;
// 			return k;
// 		})
// 		return k;
// 		console.log(`k - test: ${k}`);
// 	}


// }



