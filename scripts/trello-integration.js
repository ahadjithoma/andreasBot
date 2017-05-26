module.exports = function(robot) {
    'use strict'

    var trello = require("node-trello");
    var slackmsg = require("./slackMsgs.js");
    var trelloapi = require("./trello-api.js");

    // auth
    var key = process.env.HUBOT_TRELLO_KEY;
    var token = process.env.HUBOT_TRELLO_TOKEN;
    var t = new trello(key, token);

    robot.respond(/trello account name/i, function(res_r) {
        t.get("/1/members/me", function(err, data) {
            if (err) {
                res_r.send('Error: ' + err['responseBody']);
                return false;
            };
            res_r.send(data['fullName']);
        });
    })



    /*******************************************************************/
    /* trello api                 BOARDS                               */
    /*******************************************************************/

    // Associate a board with a specific Channel 
    robot.hear(/trello board (.*)/i, function(res_r) {
        let board = res_r.match[1];
        // TODO!
    })

    //GET /1/boards/[board_id]
    robot.hear(/trello board/i, trello_board)

    function trello_board(res_r){
        // TODO: fetch the board id from other source (env, redis or mongodb)
        let boardId = 'BE7seI7e';
        let pars = {lists:"all"};
        trelloapi.getBoard(boardId, pars)
            .then(function(data){
                // customize slack's interactive message 
                let msg = slackmsg.buttons();
                msg.text = `Board Name: *${data.name}*`;
                msg.attachments[0].text = `Board's Lists`;
                msg.attachments[0].callback_id = `trello_board`;

                // attach the board lists to buttons
                let listsNum = Object.keys(data.lists).length;
                for (var i=0; i<listsNum; i++){
                    let list    = data.lists[i].name;
                    let listId  = data.lists[i].id;
                    let item    = {"name": list, "text": list,"type":"button", "value": listId};
                    msg.attachments[0].actions.push(item);
                }
                
                res_r.send(msg);
            })
            .fail(function(err){
                console.log(err);
            })
        /*
        t.get("/1/board/"+boardId, {lists:"all"}, function(err, data){
            if (err){
                res_r.send('Error Encountered: '+ err['responseBody']);
                return false;
            } 

            // customize slack's interactive message 
            let msg = slackmsg.buttons();
            msg.text = `Board Name: *${data.name}*`;
            msg.attachments[0].text = `Board's Lists`;
            msg.attachments[0].callback_id = `trello_board`;

            // attach the board lists to buttons
            let listsNum = Object.keys(data.lists).length;
            for (var i=0; i<listsNum; i++){
                let list    = data.lists[i].name;
                let listId  = data.lists[i].id;
                let item    = {"name": list, "text": list,"type":"button", "value": listId};
                msg.attachments[0].actions.push(item);
            }
            
            res_r.send(msg);
        })*/
    }


    
    /*******************************************************************/
    /*                        robot.on listeners                       */
    /*******************************************************************/

    var slackCB = 'slack:msg_action:';

    // responding to 'trello_board' interactive message
    robot.on(slackCB + 'trello_board', function(data_board, res){
        console.log('robot.on: trello_board');
        let listId = data_board.actions[0].value;
        let listName = data_board.actions[0].name;
        // let cb_id = data_board.callback_id;

        // call function to fetch list - provide list id
        let pars = {cards: "all"};
        trelloapi.list_id(listId, pars)
            .then(function(data_list){

                // create buttons msg
                let msg = slackmsg.buttons();
                msg.text = `*${listName}* list`;
                msg.attachments[0].text = `Available Cards`;
                msg.attachments[0].callback_id = `trello_list`;
                
                let cardsNum = Object.keys(data_list.cards).length;
                console.log(`total cards: ${cardsNum}`);
                for (var i=0; i<cardsNum; i++){
                    let card    = data_list.cards[i].name;
                    let cardId  = data_list.cards[i].id;
                    let item    = {"name": card, "text": card,"type":"button", "value": cardId};
                    msg.attachments[0].actions.push(item);
                }

                // respond with information for that list
                res.send(msg);
                console.log(msg.attachments[0].actions);
                })
            .fail(function(err){
                console.log(err);
            });
    })





    
    /*  TODO: add more functionality */ 
    
}





    /* template */

    // robot.respond(/trello /i, function(res_r) {
    //     t.post("/1/", function(err, data){
    //         if (err){
    //             res_r.send('Error Encountered: '+ err['responseBody']);
    //         }
    //     })
    // })





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