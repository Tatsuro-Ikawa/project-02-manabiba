import { NextResponse } from 'next/server';

export type ApiErrorBody = {
  error: {
    code: string;
    message?: string;
    feature?: string;
  };
};

export function apiJsonError(
  status: number,
  code: string,
  message?: string,
  feature?: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        ...(message ? { message } : {}),
        ...(feature ? { feature } : {}),
      },
    },
    { status }
  );
}
