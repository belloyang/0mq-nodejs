import { HarvestAPIParams } from "./api-params";
import { HarvesterApiType } from "./harvester-api-type";

export interface HarvesterApiCall {
    apiName: string;
    arguments: HarvestAPIParams;
    type: HarvesterApiType;
}