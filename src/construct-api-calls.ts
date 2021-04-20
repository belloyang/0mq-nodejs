import { HarvestAPIParams } from "./models/api-params";
import { HarvesterApiCall } from "./models/harvester-api-call";

export function constructApiCalls(apiName: string, parameters: HarvestAPIParams, expect_response: boolean) {
    const harvestCall: HarvesterApiCall = {
        apiName: apiName,
        arguments: parameters,
        expect_response: expect_response !== undefined ? expect_response : false
      };

    return harvestCall;
}