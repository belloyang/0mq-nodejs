import { HarvestAPIParams } from "./api-params";

export interface HarvesterApiCall {
    apiName: string;
    arguments: HarvestAPIParams | undefined;
    expect_response: boolean;
}