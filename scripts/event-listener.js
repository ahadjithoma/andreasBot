module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

	robot.on(slack_msg + 'wopr_game', function(data, res) {
		console.log('robot.on: TODO');
		res.send('wopr_game')
	});
  
}









/* An example of using slack's response_url. ~For future use */
/* Add this snippet inside robot.on that u want to trigger   */
/*
    var response_url = data.response_url;
    var slackMsg = require('./slackMsgs');
    var response = slackMsg.ephemeralMsg();

    sendMessageToSlackResponseURL(response_url, response);


    function sendMessageToSlackResponseURL(responseURL, JSONmessage){
      var postOptions = {
          uri: responseURL,
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          json: JSONmessage
      };
      request(postOptions, (error, response, body) => {
          if (error){
              // handle errors as you see fit
          };
      })
    }


*/