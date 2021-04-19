var zmq = require('zeromq');
const { constructApiCalls } = require('./construct-api-calls');

// socket to talk to server
console.log("Connecting to hello world server...");
var requester = zmq.socket('req');

var x = 0;
requester.on("message", function(reply) {
  // console.log("Received reply", x, ": [", reply.toString(), ']');
  
  let replyJson = reply.toString();
  try{
    let replyObj = JSON.parse(replyJson);
    console.log('***client receives replyObj ', replyObj);
    let replyType = replyObj.type;
    if(replyType === 'ExecID') {
      console.log('receive msg', replyType);
      let harvestCall = {
      call: 'get_op_responses',
      parameters: [replyObj.execId, 0],
      }
      requester.send(JSON.stringify(harvestCall));
    } else {
      console.log('receive msg', replyType, replyObj);
      let subscriber = zmq.socket('sub');
      subscriber.connect('tcp://localhost:5556');
      console.log("Subscriber connected to port 5556");
      subscriber.subscribe("get_op_responses");
      subscriber.on("message", function(topic, message) {
        console.log(
          "received a reply for:",
          topic.toString(),
          ":",
          message.toString()
        );
        let replyObj = JSON.parse(message.toString());
        let replyType = replyObj.type;
        console.log('receive subscribed msg', replyType, replyObj.response);
        if(replyObj.response.type === 'completion') {
            subscriber.unsubscribe('get_op_responses');
            requester.close();
            process.exit(0); 
        }
      });
      
      
    }
    
  }catch(e) {
    console.error('failed to parse replyJson', replyJson, e);
  }
  
  
  
});

requester.connect("tcp://localhost:5555");


console.log("Sending request", '...');
  
  let harvestCall = constructApiCalls('list', [], true);
  requester.send(JSON.stringify(harvestCall));



process.on('SIGINT', function() {
  requester.close();
});