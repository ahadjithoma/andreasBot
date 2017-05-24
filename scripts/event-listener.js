module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

  	robot.on(slack_msg + 'wopr_game', function(data, res) {
		
	    var response_url = data.response_url;
	    console.log(data.response_url);
	    var slackMsg = require('./slackMsgs');
	    var response = slackMsg.ephemeralMsg();
		res.send(response);
	});


 //  	robot.on(slack_msg + 'trello_board', function(data, res) {
	// 	res.send('trello board button pressed');
	    
	//     var msg = 'trello_board_list'; 
	//     k = res; 
	//     return robot.emit(msg, 'data', k);
	//     //var handled = robot.emit(msg, 'data', res);
	//     // if (!handled) {
	//     //   //res.send(500)
	//     //   res.send('\nNo scripts handled the action.\n');
	//     // }
	// 	// //console.log(data);
	// });
  
  
}
