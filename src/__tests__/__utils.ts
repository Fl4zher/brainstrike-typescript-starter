import express = require("express");
import { HttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import {
  execute,
  GraphQLRequest,
  ApolloLink,
  Observable,
  FetchResult
} from "apollo-link";
import { ApolloServer } from "apollo-server-express";
import { CardAPI } from "../../src/datasources/card";
import { typeDefs, resolvers } from "../../src/graphql";
import { DataSources } from "apollo-server-core/dist/graphqlOptions";
import { ApolloContext } from "../../src/types/context";

const defaultContext = {};

export type Mockify<T> = {
  [P in keyof T]: T[P] extends Function ? jest.Mock<{}> : T[P];
};

export const mockRepos = {
  cards: {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn()
  }
};

export const mockContext: Mockify<ApolloContext> = {
  dataSources: null,
  connection: null
};

/**
 * Integration testing utils
 */
export const constructTestServer = ({ context = defaultContext } = {}): {
  server: ApolloServer;
  cardAPI: CardAPI;
} => {
  const cardAPI = new CardAPI({ repos: mockRepos });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    dataSources: (): DataSources<ApolloContext> => ({ cardAPI }),
    context
  });

  return { server, cardAPI };
};

/**
 * e2e Testing Utils
 */

interface TestInterface {
  link: ApolloLink;
  stop: () => void;
  graphql: ({}: GraphQLRequest) => Observable<FetchResult>;
}

export const startTestServer = async (
  server: ApolloServer
): Promise<TestInterface> => {
  const app = express();
  server.applyMiddleware({ app });
  const port = 6000;

  const httpServer = app.listen(port, () => {
    console.log(
      `🧠 brainstrike e2e test running on: http://localhost:${port}${server.graphqlPath}`
    );
  });

  // NOTE: fetch isn't properly typed to spec, so have to work around with any here
  const link = new HttpLink({
    uri: `http://localhost:${port}/graphql`,
    fetch: fetch as any // eslint-disable-line
  });

  const executeOperation = ({
    query,
    variables = {}
  }: GraphQLRequest): Observable<FetchResult> =>
    execute(link, { query, variables });

  return {
    link,
    stop: (): void => {
      httpServer.close();
    },
    graphql: executeOperation
  };
};