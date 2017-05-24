module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

  	robot.on(slack_msg + 'wopr_game', function(data, res) {
		 res.send('robot.on: TODO');
	});


  	robot.on(slack_msg + 'trello_board', function(data, res) {
		res.send('trello board button pressed');
	    
	    var msg = 'trello_board_list'; 
	    
	    return robot.emit(msg, 'data', res);
	    //var handled = robot.emit(msg, 'data', res);
	    // if (!handled) {
	    //   //res.send(500)
	    //   res.send('\nNo scripts handled the action.\n');
	    // }
		// //console.log(data);
	});
  
  
}
