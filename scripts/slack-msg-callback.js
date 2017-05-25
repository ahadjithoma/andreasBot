var slackToken = process.env.HUBOT_SLACK_VERIFY_TOKEN;
var request = require('request');

module.exports = function(robot)  {

  robot.router.post('/hubot/trello', function(req, res){
    var data = null;
    res.send('hello there');
    console.log("\n*********\n");
  });


  robot.router.post('/hubot/slack-msg-callback', function(req, res) {
    var data = null;
    res.status(200).end() // best practice to respond with 200 status
 
    if (req.body.payload) {
      try {
        data = JSON.parse(req.body.payload);
      } catch(e) {
        robot.logger.error("Invalid JSON submitted to Slack message callback");
        //res.send(422)
        res.send('You supplied invalid JSON to this endpoint.');
        return;
      }
    } else {
      robot.logger.error("Non-JSON submitted to Slack message callback");
      //res.send(422)
      res.send('You supplied invalid JSON to this endpoint.');
      return;
    }

    if (data.token === slackToken) {
      robot.logger.info("Request is good");
    } else {
      robot.logger.error("Token mismatch on Slack message callback");
      //res.send(403)
      res.send('You are not authorized to use this endpoint.');
      return;
    }

    var msg = 'slack:msg_action:'; 
    var callback_id = data.callback_id;

    //original code 
    var handled = robot.emit(msg+callback_id, data, res);
    if (!handled) {
      //res.send(500)
      res.send('No scripts handled the action.');
    }

    // var response_url = data.response_url;
    // console.log(data.response_url);
    
    // var slackMsg = require('./slackMsgs');
    // var response = slackMsg.ephemeralMsg();

    // sendMessageToSlackResponseURL(response_url, response);


    // this code snippet doesn't work for response_url
    // robot.http(response_url)
    // .header('Content-Type', 'application/json')
    // .post(response)(function(err, res, body) {
    //   console.log('http')
    //   console.log(err)
    // });





  });



    // function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    //   var postOptions = {
    //       uri: responseURL,
    //       method: 'POST',
    //       headers: {
    //           'Content-type': 'application/json'
    //       },
    //       json: JSONmessage
    //   };
    //   request(postOptions, (error, response, body) => {
    //       if (error){
    //           // handle errors as you see fit
    //       };
    //   })
    // }
}
