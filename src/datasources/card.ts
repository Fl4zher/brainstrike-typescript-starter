import { Card } from "../entity/Card";
import { CardInput, CardsUpdatedResponse } from "../generated/graphql";
import { ApolloContext } from "../types/context";
import { DataSource, DataSourceConfig } from "apollo-datasource";
import { RepoInterface } from "../apollo";

export class CardAPI extends DataSource {
  context!: ApolloContext;
  repos: RepoInterface;
  constructor({ repos }: { repos: RepoInterface }) {
    super();
    this.repos = repos;
  }

  /**
   * Apollo init function, called by apollo when setup
   * @param config used by apollo internally
   */
  initialize(config: DataSourceConfig<ApolloContext>): void {
    this.context = config.context;
  }

  /**
   * Get all cards in a deck
   */
  async getCards(): Promise<Card[]> {
    return this.repos.cards.find(); // get all
  }

  /**
   * Get a particular card from the deck
   * @param id card uuid
   */
  async getCard(id: string): Promise<Card> {
    return this.repos.cards.findOne(id); // find by id
  }

  /**
   * Adds a new card to a deck
   * @param input card number, label, description
   */
  async addCard({
    number,
    label,
    description
  }: CardInput): Promise<CardsUpdatedResponse> {
    const card = new Card();
    card.number = number;
    card.label = label;
    card.description = description;
    const savedCard = await this.repos.cards.save(card);
    return {
      success: true,
      message: "Card Added",
      card: savedCard
    };
  }

  /**
   * Updates a card in a deck
   * @param id card uuid
   * @param input card number, label, description
   */
  async updateCard(
    id: string,
    { number, label, description }: CardInput
  ): Promise<CardsUpdatedResponse> {
    const card = await this.getCard(id);
    card.number = number;
    card.label = label;
    card.description = description;
    const savedCard = await this.repos.cards.save(card);
    return {
      success: true,
      message: "Card Updated",
      card: savedCard
    };
  }

  /**
   * Removes a card from the deck
   * @param id card uuid
   */
  async removeCard(id: string): Promise<CardsUpdatedResponse> {
    const card = await this.getCard(id);
    const removedCard = await this.repos.cards.remove(card);
    return {
      success: true,
      message: "Card Removed",
      card: removedCard
    };
  }
}