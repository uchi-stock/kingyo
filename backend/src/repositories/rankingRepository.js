import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

// 全員共通の1つのランキング（issue #110）のため、パーティションキーは固定値1つのみを使う
const PARTITION_KEY_VALUE = 'RANKING'

function toItem(entry) {
  return { pk: PARTITION_KEY_VALUE, sk: entry.id, ...entry }
}

function fromItem({ id, timeMs, catchCount, recordedAt }) {
  return { id, timeMs, catchCount, recordedAt }
}

// DynamoDB Document Clientの薄いラッパー（list/put/deleteByIdのみ）。
// services/rankingService.jsはこのインターフェースにのみ依存し、AWS SDKを
// 直接importしない（issue #112, dev-standards docs/serverless-api-dynamodb-pattern.md）
export function createRankingRepository({ tableName, client = DynamoDBDocumentClient.from(new DynamoDBClient({})) }) {
  return {
    async list() {
      const result = await client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': PARTITION_KEY_VALUE },
        }),
      )
      return (result.Items ?? []).map(fromItem)
    },
    async put(entry) {
      await client.send(new PutCommand({ TableName: tableName, Item: toItem(entry) }))
    },
    async deleteById(id) {
      await client.send(new DeleteCommand({ TableName: tableName, Key: { pk: PARTITION_KEY_VALUE, sk: id } }))
    },
  }
}
