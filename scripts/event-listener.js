module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

  	robot.on(slack_msg + 'wopr_game', function(data, res) {
		 res.send('robot.on: TODO');
	});


  	robot.on(slack_msg + 'trello_board', function(data, res) {
		 res.send('trello board button pressed');
		 console.log(data);
		 console.log(res);
	});
  
  
}
