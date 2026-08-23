// router.jsがこれらのエラーをHTTPステータスへ変換する（issue #112）
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
  }
}
