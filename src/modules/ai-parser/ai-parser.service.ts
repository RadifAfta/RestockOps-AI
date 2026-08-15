import { config } from '../../config/index.js';
import { logger } from '../../core/logger/index.js';
import { OpenAIProvider, RuleBasedMockAIProvider } from './ai-parser.provider.js';
import type { ILLMProvider, ParseOrderContext } from './ai-parser.types.js';
import type { ParsedOrderIntent } from './ai-parser.schema.js';

export class AIParserService {
  private provider: ILLMProvider;

  constructor() {
    if (config.OPENAI_API_KEY && config.OPENAI_API_KEY.startsWith('sk-')) {
      this.provider = new OpenAIProvider();
      logger.info('AI Parser Service initialized with OpenAI GPT-4o-mini');
    } else {
      this.provider = new RuleBasedMockAIProvider();
      logger.info('AI Parser Service initialized with RuleBasedMockAIProvider (Local/Test mode)');
    }
  }

  getProvider(): ILLMProvider {
    return this.provider;
  }

  setProvider(provider: ILLMProvider) {
    this.provider = provider;
  }

  async parseCustomerReply(context: ParseOrderContext): Promise<ParsedOrderIntent> {
    try {
      return await this.provider.extractOrderIntent(context);
    } catch (err) {
      logger.error({ err, store: context.storeName }, 'Primary AI Provider failed, falling back to rule-based parser');
      const fallback = new RuleBasedMockAIProvider();
      return await fallback.extractOrderIntent(context);
    }
  }
}

export const aiParserService = new AIParserService();
