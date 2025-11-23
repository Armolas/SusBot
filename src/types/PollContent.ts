import {
  type ContentCodec,
  ContentTypeId,
  type EncodedContent,
} from "@xmtp/content-type-primitives";

/**
 * Content Type ID for Poll messages
 * Custom content type for creating polls in group chats
 */
export const ContentTypePoll = new ContentTypeId({
  authorityId: 'imposter.game',
  typeId: 'poll',
  versionMajor: 1,
  versionMinor: 0,
});

/**
 * Poll option definition
 */
export type PollOption = {
  /** Unique identifier for this option */
  id: string;
  /** Display text for the option */
  label: string;
};

/**
 * Poll content structure
 */
export type PollContent = {
  /** Unique identifier for this poll */
  id: string;
  /** Poll question */
  question: string;
  /** Array of poll options */
  options: PollOption[];
  /** Optional expiration timestamp (ISO-8601) */
  expiresAt?: string;
  /** Whether voters can see results before voting */
  showResultsBeforeVoting?: boolean;
};

/**
 * Poll response from a user
 */
export type PollResponse = {
  /** References Poll.id */
  pollId: string;
  /** Selected option ID */
  optionId: string;
  /** Voter's inbox ID */
  voterInboxId: string;
};

/**
 * Poll codec for encoding/decoding Poll messages
 */
export class PollCodec implements ContentCodec<PollContent> {
  get contentType(): ContentTypeId {
    return ContentTypePoll;
  }

  encode(content: PollContent): EncodedContent {
    this.validateContent(content);

    return {
      type: ContentTypePoll,
      parameters: { encoding: 'UTF-8' },
      content: new TextEncoder().encode(JSON.stringify(content)),
    };
  }

  decode(content: EncodedContent): PollContent {
    const encoding = content.parameters.encoding;
    if (encoding && encoding !== 'UTF-8') {
      throw new Error(`unrecognized encoding ${encoding}`);
    }

    const decodedContent = new TextDecoder().decode(content.content);
    try {
      const parsed = JSON.parse(decodedContent) as PollContent;
      this.validateContent(parsed);
      return parsed;
    } catch (error) {
      throw new Error(`Failed to decode Poll content: ${error}`);
    }
  }

  fallback(content: PollContent): string {
    const optionList = content.options
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join('\n');

    return `📊 POLL: ${content.question}\n\n${optionList}\n\nReply with the number to vote`;
  }

  shouldPush(): boolean {
    return true;
  }

  /**
   * Validates Poll content
   */
  private validateContent(content: PollContent): void {
    if (!content.id || typeof content.id !== 'string') {
      throw new Error('Poll.id is required and must be a string');
    }

    if (!content.question || typeof content.question !== 'string') {
      throw new Error('Poll.question is required and must be a string');
    }

    if (!Array.isArray(content.options) || content.options.length === 0) {
      throw new Error('Poll.options is required and must be a non-empty array');
    }

    if (content.options.length > 10) {
      throw new Error('Poll.options cannot exceed 10 options');
    }

    // Validate each option
    content.options.forEach((option, index) => {
      if (!option.id || typeof option.id !== 'string') {
        throw new Error(`Option[${index}].id is required and must be a string`);
      }

      if (!option.label || typeof option.label !== 'string') {
        throw new Error(`Option[${index}].label is required and must be a string`);
      }
    });

    // Check for duplicate option IDs
    const optionIds = content.options.map((option) => option.id);
    const uniqueOptionIds = new Set(optionIds);
    if (optionIds.length !== uniqueOptionIds.size) {
      throw new Error('Option.id values must be unique within Poll.options array');
    }

    if (content.expiresAt && !this.isValidISO8601(content.expiresAt)) {
      throw new Error('Poll.expiresAt must be a valid ISO-8601 timestamp');
    }
  }

  /**
   * Basic ISO-8601 timestamp validation
   */
  private isValidISO8601(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }
}

/**
 * Helper to create a poll
 */
export function createPoll(
  id: string,
  question: string,
  options: Array<{ id: string; label: string }>
): PollContent {
  return {
    id,
    question,
    options,
  };
}

/**
 * Helper to create a poll response
 */
export function createPollResponse(
  pollId: string,
  optionId: string,
  voterInboxId: string
): PollResponse {
  return {
    pollId,
    optionId,
    voterInboxId,
  };
}
