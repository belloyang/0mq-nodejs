
// Binds REP socket to tcp://*:5555
// Binds pub socket to tcp://*.5556
var { HarvesterAPIs }=  require('@nanometrics/pegasus-harvest-lib');

var zmq = require('zeromq');

// socket to talk to clients
var responder = zmq.socket('rep');
var publisher = zmq.socket('pub');

responder.on('message', function(request) {
  console.log("Received request: [", request.toString(), "]");

   let msgJson = request.toString();
   try{
     let msgObject = JSON.parse(msgJson);
    console.log('receive JSON:', msgObject);

    switch(msgObject.call) {
      case  'harvest_data': {
        // call harvest_data
        let execId =  HarvesterAPIs.harvest_data(...msgObject['parameters']);
        let replyObj = {
          type: 'ExecID',
          execId: execId
        }
        responder.send(JSON.stringify(replyObj));
      }break;
      case 'list': {
        let execId = HarvesterAPIs.list();
        let replyObj = {
          type: 'ExecID',
          execId: execId
        }
        console.log('server: send reply from call: list', replyObj);
        responder.send(JSON.stringify(replyObj));
      }break;
      case 'get_op_responses': {
        let replyObj = {
          type: 'Response',
          response: null
        }
        
        
        responder.send(JSON.stringify(replyObj));
        let getOPResponsePollHandle = setInterval(() => {
        let queryStr = HarvesterAPIs.get_op_responses(...msgObject['parameters']);
          if(queryStr !== null) {
            let query = JSON.parse(queryStr);
            // console.log('check query:', query);
            let responseJSON = query.responses;
            for (let responseStr of responseJSON) {
              let replyObj = {
              type: 'Response',
              response: JSON.parse(responseStr)
              }
              
                console.log('server: SEND reply from call: get_op_responses', replyObj);
                
                publisher.send(['get_op_responses', JSON.stringify(replyObj)]);

            }
          } else {
            console.log('clearInterval: receive null from get_op_responses');
            // publisher.close();
            clearInterval(getOPResponsePollHandle);
          }
        }, 100);
        
      }break;
      default:
        let replyObj = {
          unsupported_call: execId
        }
        responder.send(JSON.stringify(replyObj));

    }

   }catch(e) {
     console.error('failed to pass json string', msgJson, e);
   }
   
});

responder.bind('tcp://*:5555', function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log("Listening on 5555...");
  }
});

publisher.bind('tcp://*:5556', function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log("Publisher bound to port 5556");
  }
});


process.on('SIGINT', function() {
  responder.close();
});