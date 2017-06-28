'use strict'

var trello = require("node-trello");
var q = require('q');
var rp = require('request-promise');
var Trello = require('node-trello');
var encryption = require('./encryption.js');
var db = require('./mlab-login.js').db();

// auth
var key = process.env.HUBOT_TRELLO_KEY;
var token = process.env.HUBOT_TRELLO_TOKEN;
var t = require('./trello-login.js');
var msg = require('./messages-info.js');
var encryption = require('./encryption.js');
var db = require('./mlab-login.js').db();


module.exports = function (robot) {


	// in some way CHECK TOKEN VALIDATION


	let length = t.length;
	let i = 0;
	for (i = 0; i < length; i++) {
		// let token = encryption.decrypt(records[i].token);
		// let userId = trello[i].userId;
		// let username = records[i].username;
	}

	// t[userId].getAsync('/1/tokens/' + token)
	// 	.then(data => {
	// 		console.log(data);
	// 	})
	// 	.catch(err => {
	// 		robot.messageRoom('andreas_h92', 'not auth dude');
	// 	})

	robot.hear('trello login', function (res) {

		console.log(t)

		let userId = msg.getUserId(res);
		let trello = t.trelloLogin;
		console.log(trello.trelloLogin(userId));
		trello.trelloLogin(userId).get('/1/members/me', function (err, data) {
			res.send('promise' + data.fullName);
		})

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



