import type { Response } from 'express';

export interface ApiError {
  error: string;
}

export type ApiResponse<T = unknown> = Response<T | ApiError>;

export type EmptyObject = Record<string, never>;
