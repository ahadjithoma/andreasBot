module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

  	robot.on(slack_msg + 'wopr_game', function(data, res) {
		res.send('slack:msg_action:wopr_game');
	});


  	robot.on(slack_msg + 'trello_board', function(data, res) {
		res.send('slack:msg_action:'+data.callback_id);
	});
  
  
}
