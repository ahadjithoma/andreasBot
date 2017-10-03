export declare type Variables = {
    [key: string]: any;
};
export interface Options {
    headers?: {
        [key: string]: string;
    };
}
export interface GraphQLError {
    message: string;
    locations: {
        line: number;
        column: number;
    }[];
    path: string[];
}
export interface GraphQLResponse {
    data?: any;
    errors?: GraphQLError[];
    status: number;
    [key: string]: any;
}
export interface GraphQLRequestContext {
    query: string;
    variables?: Variables;
}
export declare class ClientError extends Error {
    response: GraphQLResponse;
    request: GraphQLRequestContext;
    constructor(response: GraphQLResponse, request: GraphQLRequestContext);
    private static extractMessage(response);
}
