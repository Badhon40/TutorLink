
export class ApiResponse<T = unknown> {
  public readonly success = true;

  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly data: T | null = null
  ) {}
}
