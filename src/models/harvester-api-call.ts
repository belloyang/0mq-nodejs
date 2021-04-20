import { HarvestAPIParams } from "./api-params";

export interface HarvesterApiCall {
    apiName: string;
    arguments: HarvestAPIParams;
    expect_response: boolean;
}