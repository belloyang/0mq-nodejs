import { GenericOpResponse } from "@nanometrics/pegasus-harvest-lib";
import { HarvestAPIParams } from "./api-params";


export interface SubRequestPayload {
    topic: string;
    execId: number;
}

export interface SubReplyPayload {
    topic: string;
    execId: number;
}

export interface PublicationPayload {
    topic: string;
    response: GenericOpResponse;
}

export interface CmdRequestPayload {
    apiName: string;
    arguments: HarvestAPIParams;

}
export interface CmdReplyPayload {
    apiName: string;
    reply: number| boolean| string | undefined;

}

export type ZeromqMsgPayload = SubReplyPayload | SubRequestPayload | CmdReplyPayload | CmdRequestPayload | PublicationPayload;
