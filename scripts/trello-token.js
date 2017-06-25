var slackMsgs = require('./slackMsgs.js');
var url = require('url');
var Trello = require('node-trello');
var rp = require('request-promise');
var key = process.env.HUBOT_TRELLO_KEY;
var secret = process.env.HUBOT_TRELLO_OAUTH;

module.exports = function(robot) {

    var oauth_secrets = {};
    var loginCallback = `https://andreasbot.herokuapp.com/hubot/trello-token`;
    var t = new Trello.OAuth(key, secret, loginCallback, 'App Name');
    
	robot.respond(/trello auth/, function(res) {
        t.getRequestToken(function(err, data) {
            robot.logger.warning(data)
            oauth_secrets[data.oauth_token] = data.oauth_token_secret;
            res.send(data.redirect);
        })
    })

    robot.router.get('/hubot/trello-token', function(req, res) {
        let args = req.query;
        let query = url.parse(req.url, true).query;
        let token = query.oauth_token;
        args['oauth_token_secret'] = oauth_secrets[token];
        robot.logger.info(args);
        t.getAccessToken(args, function(err, data) {
            if (err) throw err;
            robot.logger.warning(data);
        })
        res.redirect('www.google.com')
    });
















    robot.respond(/trello get token/i, function(res_r) {

        let scope = 'read,write,account';
        let name = 'Hubot';
        let expr = '30days';
        let cb_method = 'fragment';
        let return_url = 'https://andreasbot.herokuapp.com/hubot/trello-token';
        let url = `https://trello.com/1/authorize?expiration=${expr}&name=${name}&scope=${scope}&key=${key}&response_type=token&callback_method=${cb_method}&return_url=${return_url}`;
        var msg = slackMsgs.basicMessage();

        msg.attachments[0].pretext = "Please get a token to authorize your Trello account";
        msg.attachments[0].title = "Trello Token";
        msg.attachments[0].title_link = url;
        msg.attachments[0].text = "Copy the token from the link above and run\n *trello add token <YOUR TOKEN>*";
        msg.attachments[0].footer = "Trello";
        msg.attachments[0].footer_icon = "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/b428584f224c42e98d158dad366351b0/trello-mark-blue.png";
        res_r.send(msg);
    })

    // robot.router.get('/hubot/trello-token', function (req, res) {
    // 	// TODO: do something with the token 
    // 	// robot.logger.info(res.fragment);	// undefined
    // 	// var type = window.location.hash.substr(1);
    // 	// robot.logger.info(req);
    // 	res.send(`<h2>Token succesfuly received. You can now close the window.</h2>\n
    // 				<button onclick=window.close()>close</button>`)
    // });

    robot.respond(/trello add token (.*)/i, function(res_r) {
        var token = res_r.match[1];
        //***IMPORTANT*** 
        // the .env assignment doesnt work with HEROKU!
        // must set up a heroku client and communicate through their api 
        process.env['HUBOT_TRELLO_TOKEN'] = token;
    })

    robot.respond(/trello request/, function(res_r) {
        var options = {
            uri: 'https://trello.com/1/authorize?expiration=30days&name=Hubot&scope=read,write,account&key=51def9cb08cf171cd0970d8607ad8f97&response_type=token&callback_method=postMessage&return_url=https://andreasbot.herokuapp.com/hubot/trello-token',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response 
        };

        rp(options)
            .then(function(res) {
                robot.logger.info(res);
            })
            .catch(function(err) {
                robot.logger.error(err)
                // API call failed... 
            });
    })
}