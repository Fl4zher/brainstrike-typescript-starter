import "reflect-metadata";
import express = require("express");
import { config as setupDotEnv } from "dotenv";
import { createConnection, Connection, Repository } from "typeorm";
import { Card, Category } from "./entity";
import { typeDefs, resolvers } from "./graphql";
import { ApolloServer } from "apollo-server-express";
import { CardAPI, CategoryAPI } from "./datasources";
import { DataSources } from "apollo-server-core/dist/graphqlOptions";
import { ApolloContext } from "./types/context";

setupDotEnv(); // adds .env environment file support

const { NODE_PORT, NODE_HOST, NODE_ENV } = process.env; // environment variables

// NOTE: using partial here to make it easier to mock repos in unit tests,
// only have to implement part of the repo interface
interface DataSourceRepos {
  cards: Partial<Repository<Card>>;
  categories: Partial<Repository<Category>>;
}

const defaultContext = {};
const app = express();

const createDbConnection = async (
  connectionName = "dbConnection"
): Promise<Connection> => {
  try {
    const connection: Connection = await createConnection(connectionName);
    console.log(`TypeORM Connected`);
    return connection;
  } catch (err) {
    console.log("Problem with TypeORM connection, check Postgres docker-up");
    console.error(err);
    process.exit(1);
  }
};

interface ServerConfig {
  apolloServer: ApolloServer;
  cardAPI: CardAPI;
  categoryAPI: CategoryAPI;
}

const createServer = async (
  connection: Connection,
  context = defaultContext
): Promise<ServerConfig> => {
  // construct TypeORM repos for Apollo DataSource API's
  const repos = {
    cards: connection.getRepository(Card),
    categories: connection.getRepository(Category)
  } as DataSourceRepos;

  const cardAPI = new CardAPI({ repos });
  const categoryAPI = new CategoryAPI({ repos });

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context,
    dataSources: (): DataSources<ApolloContext> => ({ cardAPI, categoryAPI })
  });

  return { apolloServer, cardAPI, categoryAPI };
};

const start = async (): Promise<void> => {
  const connection = await createDbConnection("dbConnection");
  await connection.runMigrations();
  console.log("TypeORM runMigrations() COMPLETE.");

  const { apolloServer } = await createServer(connection);

  apolloServer.applyMiddleware({ app });

  app.listen(NODE_PORT, () => {
    console.log(
      `🧠 brainstrike server running on: http://${NODE_HOST}:${NODE_PORT}${apolloServer.graphqlPath}`
    );
  });
};

// Start our server if we're not in a test env. (JEST sets NODE_ENV=test)
// if we're in a test env, we'll manually start it in a test
if (NODE_ENV !== "test") start();

export {
  typeDefs,
  resolvers,
  ApolloServer,
  createServer,
  DataSourceRepos,
  createDbConnection,
  Connection,
  ServerConfig
};
