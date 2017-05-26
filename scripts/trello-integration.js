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
        })
    }

    /*******************************************************************/
    /* trello api                  LISTS                               */
    /*******************************************************************/

    
    //GET /1/lists/[idList]
    robot.hear(/trello lists/i, function(res_r) {
        t.post("/1/lists/", function(err, data){
            if (err){
                res_r.send('Error Encountered: '+ err['responseBody']);
                return false;
            } 
            else {
                res_r.send(data.lists);
            }
        })
    })

    
    /*******************************************************************/
    /*                        robot.on listeners                       */
    /*******************************************************************/

    var slackCB = 'slack:msg_action:';

    // responding to 'trello_board' interactive message
    robot.on(slackCB + 'trello_board', function(data_board, res){
        console.log('robot.on: trello_board');
        // console.log(data);
        res.send('robot.on: trello_board'); 
        let listId = data_board.actions[0].value;
        // let listName = data_board.actions[0].name;
        // let cb_id = data_board.callback_id;

        // call function to fetch list - provide list id
        let pars = {cards: "all"};
        trelloapi.list_id(listId, pars)
            .then(function(data_list){
                console.log(listId);
                res.send('a');
            })
            .fail(function(err){
                console.log(err);
            });




        // create buttons msg\
        /*
        let msg = slackmsg.buttons();
        msg.text = `*${name}* list`;
        msg.attachments[0].text = ``;
        msg.attachments[0].callback_id = `trello_list`;
        
        //let cardsNum = Object.keys(data.)

        // respond with information for that list
        res.send(msg);*/
    })



    /* template */

    // robot.respond(/trello /i, function(res_r) {
    //     t.post("/1/", function(err, data){
    //         if (err){
    //             res_r.send('Error Encountered: '+ err['responseBody']);
    //         }
    //     })
    // })




    
    /*  TODO: add more functionality */ 
    
}