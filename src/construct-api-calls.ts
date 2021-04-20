import { HarvestAPIParams } from "./models/api-params";
import { HarvesterApiCall } from "./models/harvester-api-call";
import { HarvesterApiType } from "./models/harvester-api-type";

export function constructApiCalls(apiName: string, parameters: HarvestAPIParams, apiType: HarvesterApiType) {
    const harvestCall: HarvesterApiCall = {
        apiName: apiName,
        arguments: parameters,
        type: apiType
      };

    return harvestCall;
}