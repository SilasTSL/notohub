import type { APIGatewayProxyResult } from "aws-lambda";
import type { ApiResponse } from "@notohub/shared";
import { config } from "./config.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": config.allowedOrigin,
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

export function ok<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  const body: ApiResponse<T> = { success: true, data };
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(body),
  };
}

export function notFound(message = "Not found"): APIGatewayProxyResult {
  const body: ApiResponse<never> = { success: false, error: message };
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(body),
  };
}

export function serverError(err: unknown): APIGatewayProxyResult {
  const message =
    err instanceof Error ? err.message : "Internal server error";
  console.error("[ERROR]", err);
  const body: ApiResponse<never> = { success: false, error: message };
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyResult {
  return { statusCode: 204, headers: corsHeaders, body: "" };
}
