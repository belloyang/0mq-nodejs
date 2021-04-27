import { GenericOpResponse, HarvesterOpResponseType } from "@nanometrics/pegasus-harvest-lib";
import { Subject } from "rxjs";
// import zmq = require("zeromq");
import * as zmq from "zeromq/v5-compat";

import { HarvestAPIParams, HarvestAPIParams_GetOpResponses } from "./models/api-params";
import { HarvesterApiType } from "./models/harvester-api-type";
import { CmdReplyPayload, PublicationPayload } from "./models/zmp-msg-payload";
import { ZeromqMessage, ZeromqMessageType } from "./models/zmq_msg";
import { Port_Pubsub, Port_Reqrep } from "./share/default-ports";

export class HarvesterApiAgent {
    private requester: zmq.Socket;
    private subscriber: zmq.Socket;
    

    constructor(private apiName: string) {
        this.requester = zmq.socket('req');
        this.subscriber = zmq.socket('sub');
        this.requester.connect(`tcp://localhost:${Port_Reqrep}`);
    }

    execCommand(parameters: HarvestAPIParams, expectResponses: boolean): Promise<[number|boolean |string | undefined, Subject<GenericOpResponse>|undefined]> {
        let cmdResponse$: Subject<GenericOpResponse> = new Subject();
        const _this = this;

        let cmdRequestMsg: ZeromqMessage = {
            type: ZeromqMessageType.cmdRequest,
            payload: {
                apiName: this.apiName,
                arguments: parameters,
            }
        }
        console.log('ExecHarvestCmd: send API call', this.apiName);
        this.requester.send([JSON.stringify(cmdRequestMsg)]);

        process.on('SIGINT', function() {
            _this.close();
        });

        return new Promise((resolve, reject) => {
            this.requester.on("message", (reply: Buffer)=> {
                try{
                    let zmqMsg : ZeromqMessage = JSON.parse(reply.toString());
                    if(zmqMsg.type === ZeromqMessageType.cmdReply) {
                        let payload: CmdReplyPayload = zmqMsg.payload as CmdReplyPayload;
                        if(payload.apiName !== this.apiName) {
                            console.log('[client] discard msg for api:', payload.apiName, this.apiName);
                            return;
                        } else {
                            if(expectResponses) {
                                let execId = payload.reply as number;
                                //subscribe to topic
                                let subRequestMsg: ZeromqMessage = {
                                    type: ZeromqMessageType.subRequest,
                                    payload: {
                                        topic: this.apiName,
                                        execId: execId
                                    }
                                };
                                this.requester.send([JSON.stringify(subRequestMsg)]);
                                // callback(execId, cmdResponse$);
                                resolve([execId, cmdResponse$]);
                                //subscribe to the topic
                                this.subscriber.connect(`tcp://localhost:${Port_Pubsub}`);
                                console.log(`clientAgent subscribes to topic ${this.apiName}`);
    
                                this.subscriber.subscribe(this.apiName); // should be APIName eventually
                                
                                this.subscriber.on("message", function(recv_topic, message) {
                                    let pubMsg: ZeromqMessage = JSON.parse(message.toString());
                                if(_this.apiName !== recv_topic.toString()) {
                                    console.log(
                                        `clientAgent expects topic ${_this.apiName}, discard unexpected msg:`,
                                        recv_topic.toString(),
                                        ":",
                                        pubMsg
                                    );
                                    return;
                                }
                                console.log(
                                    `clientAgent  receives:`,
                                    _this.apiName,
                                    ":",
                                    pubMsg
                                );
                            
                                
                                let pubMsgPayload: PublicationPayload = pubMsg.payload as PublicationPayload;
    
                                console.log('receive publication msg for topic', pubMsgPayload.topic, pubMsg);
                                
                                cmdResponse$.next(pubMsgPayload.response);
                                if(pubMsgPayload.response.type === HarvesterOpResponseType.completion) {
                                    _this.subscriber.unsubscribe(_this.apiName);
                                    console.log(`ClientAgent completed, unsubscribe ${_this.apiName}`, pubMsgPayload.response);
                                }
                                });
                            } else {
                                let ret = payload.reply;
                                // callback(ret);
                                resolve([ret, undefined]);
                            }
                        }
                        
                    } else if(zmqMsg.type === ZeromqMessageType.subReply) {
                        console.log('[clientAgent] receive subscription reply', zmqMsg);
                        return;
                    } else {
                        console.log('[clientAgent] receive unexpected reply message type',zmqMsg.type, zmqMsg);
                        return;
                    }
    
                }catch(e) {
                    reject(e);
                    this.close();
                    // throw e;
                }
                
            });
        });
        

        
    }

    close(): void {
        
        this.requester.close();
        this.subscriber.close();
    }
}