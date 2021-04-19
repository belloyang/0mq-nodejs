export function constructApiCalls(apiName: string, parameters: any[], expect_response: boolean) {
    const harvestCall = {
        call: apiName,
        parameters: [...parameters],
        expect_response: expect_response !== undefined ? expect_response : false
      };

    return harvestCall;
}