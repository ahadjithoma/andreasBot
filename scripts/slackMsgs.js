module.exports = {

    getChannelName: function(robot, res){
        return (robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(res.message.room)).name;
    },

    getUserName: function(res){
        return res.message.user.name;
    },

    getChannelId: function(res){
        return  res.message.room;
    },

    getUserId: function(res){
        return res.message.user.id;
    },

    getTeamId: function(res){
        return res.message.user.team_id;
    },

    menu: function(){
        return {
                "text": "",
                "mrkdwn": true,
                "response_type": "in_channel",
                "attachments": [
                    {
                        "text": "",
                        "fallback": "",
                        "color": "#3AA3E3",
                        "attachment_type": "default",
                        "callback_id": "cb_id",
                        "mrkdwn_in": [
                            "text",
                            "pretext"
                        ],
                        "actions": [
                            {
                                "name": "",
                                "text": "",
                                "type": "select",
                                "options": [
                                    {
                                        // To add menu items: 
                                        // item = {"text": text, "value": value} 
                                        // attachements[0].actions.[0].options.push(item)
                                        // "text": "",
                                        // "value": ""
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
    },

    buttons: function(){
        return {
                "text": "",
                "replace_original": true,
                "attachments": [
                    {
                        "text": "",
                        "fallback": "",
                        "callback_id": "cb_id",
                        "mrkdwn_in": [
                            "text",
                            "pretext"
                        ],
                        "color": "#3AA3E3",
                        "attachment_type": "default",
                        "actions": [
                            {
                                // To add buttons: 
                                // item = {"name":name, "text": text, "type":"button", "value":value} 
                                // attachements[0].actions.push(item)
                                
                                // "name": "",
                                // "text": "",
                                // "type": "",
                                // "value": ""
                            }
                        ]
                    }
                ]
        } 
    },

    basicMessage: function(){
        return {
            "attachments": [
                {
                    "fallback": "",
                    "mrkdwn_in": ["text", "pretext"],
                    "color": "#36a64f",
                    "pretext": "Please get a token to authorize your Trello account",
                    "title": "Slack API Documentation",
                    "title_link": "",
                    "text": "Copy the token from the link above and run\n *trello add token <YOUR TOKEN>*",
                    "footer": "Trello Authorization",
                    "footer_icon": "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/b428584f224c42e98d158dad366351b0/trello-mark-blue.png"        }
            ]
        }
    },

    ephemeralMsg: function(){
        return {
          "response_type": "ephemeral",
          "replace_original": false,
          "text": "Sorry, that didn't work. Please try again."
        }
    }

    
}


