import http from 'node:http';
import { StatusCodes } from 'http-status-codes';

export const HTTP_STATUS_CODES = StatusCodes;
export const HTTP_METHODS: readonly string[] = http.METHODS;
